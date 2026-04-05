import { useCallback, useRef } from 'react';
import { useSecureApi } from './useSecureApi';

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
 * Manage per-post independent debounce for like/unlike actions.
 *
 * Employs a Map<postId, timeoutId> to track independent timers per post locally,
 * preventing rapid clicks on one post from interfering with another.
 * Handles the debounce delay before executing the API call. Throws error on hook fail via onError if provided.
 * Relies on the caller to manage optimistic UI state updates.
 */

// ───── DEBOUNCED LIKE HOOK ──────────────────────────────
export const useDebouncedLike = (
  options: IUseDebouncedLikeOptions = {},
): IUseDebouncedLikeReturn => {
  const { debounceMs = 500, onError } = options;
  const { post: apiPost } = useSecureApi();
  const timersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

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
          console.error(`[useDebouncedLike] API error for post ${postId}:`, error);
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
