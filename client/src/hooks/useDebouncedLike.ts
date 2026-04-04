import { useCallback, useRef } from "react";
import { useSecureApi } from "./useSecureApi";

// ───── INTERFACES ──────────────────────────────
interface IUseDebouncedLikeOptions {
  debounceMs?: number;
  onError?: (postId: string, error: unknown) => void;
}

interface IUseDebouncedLikeReturn {
  debouncedLike: (postId: string) => void;
  cancelDebounce: (postId: string) => void;
}

/**
 * Per-post independent debounce hook for like/unlike actions.
 *
 * Uses a Map<postId, timeoutId> to manage independent timers per post,
 * ensuring rapid clicks on one post don't interfere with another.
 *
 * The hook only manages debounce timers and API calls.
 * Optimistic UI updates are handled by the caller (Post.tsx local state).
 */

// ───── DEBOUNCED LIKE HOOK ──────────────────────────────
export const useDebouncedLike = (
  options: IUseDebouncedLikeOptions = {},
): IUseDebouncedLikeReturn => {
  const { debounceMs = 500, onError } = options;
  const { post: apiPost } = useSecureApi();
  const timersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(
    new Map(),
  );

  // ───── DEBOUNCED LIKE ──────────────────────────────
  const debouncedLike = useCallback(
    (postId: string) => {
      // ──── Clear any existing timer for this specific post ────
      const existingTimer = timersRef.current.get(postId);
      if (existingTimer) {
        clearTimeout(existingTimer);
      }

      // ──── Set a new debounce timer for this post ────
      const timer = setTimeout(async () => {
        timersRef.current.delete(postId);

        try {
          await apiPost(`/posts/like/${postId}`, {});
        } catch (error) {
          console.error(
            `[useDebouncedLike] API error for post ${postId}:`,
            error,
          );
          onError?.(postId, error);
        }
      }, debounceMs);

      timersRef.current.set(postId, timer);
    },
    [apiPost, debounceMs, onError],
  );

  // ───── CANCEL DEBOUNCE ──────────────────────────────
  const cancelDebounce = useCallback((postId: string) => {
    const timer = timersRef.current.get(postId);
    if (timer) {
      clearTimeout(timer);
      timersRef.current.delete(postId);
    }
  }, []);

  return { debouncedLike, cancelDebounce };
};
