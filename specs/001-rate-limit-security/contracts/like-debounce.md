# Like Debounce Contract
## Overview

Per-post independent debounce for like/unlike actions with optimistic UI updates.

## Client-Side Hook: `useDebouncedLike`

```typescript
function useDebouncedLike(postId: string): {
  isLiked: boolean;
  isLoading: boolean;
  toggleLike: () => void;
}
```

### Behavior
1. On `toggleLike()`:
   - Optimistically flip `isLiked` in Zustand store (instant UI feedback)
   - Set per-post 500ms debounce timer
   - If timer expires, send API request with the final `isLiked` state
   - Each post has its own independent `setTimeout` reference
2. If user toggles again within 500ms on the same post:
   - Optimistically flip again
   - Reset the 500ms timer for that post
   - Only the final state after settling is sent to the server
3. On server error:
   - Revert optimistic update in Zustand store
   - Show global toast error notification
4. If user navigates away while request is in flight:
   - Request continues (no abort needed for idempotent like/unlike)

## State Management (Zustand)
The like status is stored in the existing post store with an optimistic update pattern:
- `isLiked` toggled immediately in the store
- `isLoading` tracks the in-flight request state
- On error, `isLiked` reverted to the pre-toggle state

## Feed Response Integration (FR-016)
The feed endpoint (`GET /api/posts/feed`) includes `is_liked` for each post:
```json
{
  "success": true,
  "status": 200,
  "data": {
    "data": [
      {
        "post_id": "abc123",
        "description": "...",
        "is_liked": true,
        ...
      }
    ],
    "pagination": {
      "hasMore": true,
      "nextCursor": "xyz789",
      "previousCursor": "abc123"
    }
  }
}
```

This eliminates the N+1 `GET /api/posts/is-liked/:post_id` calls during feed load.
The `checkIfLiked` endpoint remains available for individual post views.
