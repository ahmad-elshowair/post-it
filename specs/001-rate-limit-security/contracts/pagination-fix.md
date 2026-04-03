# Pagination Fix Contract

## Overview

Remove `totalCount` from cursor-paginated endpoint responses format to zero secondary requests.

## Affected Endpoints

### GET /api/posts/all
### GET /api/posts/feed
### GET /api/posts/user/:user_id
### GET /api/users (paginated)
### GET /api/users/friends (paginated)
### GET /api/follows/followings
### GET /api/follows/followers

## Response Changes

### Before (current)

```typescript
interface IPaginatedResult<T> {
  data: T[];
  pagination: {
    hasMore: boolean;
    nextCursor: string | undefined;
    previousCursor: string | undefined;
  };
  totalCount: number;       // <-- REMOVED
}
```

### After (new)

```typescript
interface IPaginatedResult<T> {
  data: T[];
  pagination: {
    hasMore: boolean;
    nextCursor: string | undefined;
    previousCursor: string | undefined;
  };
  // totalCount removed - derive from cursor state
}
```

## `createPaginationResult` Utility Changes
### Before (current)

```typescript
export const createPaginationResult = <T>(
  data: T[],
  options: ICursorPaginationOptions,
  totalCount: number,      // <-- parameter removed
  idField: keyof T
): IPaginatedResult<T> => {
  const hasMore =
    data.length === options.limit &&
    data.length + loadedItemsCount < totalCount;  // <-- no totalCount available
  ...
}
```

### After (new)

```typescript
export const createPaginationResult = <T>(
  data: T[],
  options: ICursorPaginationOptions,
  idField: keyof T
): IPaginatedResult<T> => {
  // Fetch limit+1 to determine hasMore
  const hasMore = data.length === options.limit;
  const lastItem = data[data.length - 1];
  const firstItem = data[0];
  return {
    data,
    pagination: {
      hasMore,
      nextCursor: hasMore && lastItem ? String(lastItem[idField]) : undefined,
      previousCursor: firstItem ? String(firstItem[idField]) : undefined,
    },
  };
}
```

## Model Changes
### `user.ts` — `indexWithPagination()`
- Remove `SELECT COUNT(*) AS total FROM users` query
- Remove `totalCount` from return type (return `{ users: TUser[] }` instead of `{ users: TUser[]; totalCount: number }`)
- Update callers to not pass `totalCount` to `createPaginationResult`

### `user.ts` — `getFriends()`
- Remove `SELECT COUNT(*) ...` query
- Remove `totalCount` from return type
- Update callers to not pass `totalCount`

### `post.ts` — `index()`, `userPosts()`, `feed()`
- Remove `SELECT COUNT(*) AS total FROM posts` query
- Remove `totalCount` from return type
- Update callers to not pass `totalCount`

### `posts.controller.ts` — `index()`, `userPosts()`, `feed()`
- Destructure to not extract `totalCount` from model calls
- Remove `totalCount` argument from `createPaginationResult` calls

### `follow.ts` — `getFollowings()`
- Remove `SELECT COUNT(*) AS total FROM follows WHERE user_id_following = $1` query
- Remove `totalCount` from return type (return `{ followings: TFollowings[] }` instead of `{ followings: TFollowings[]; totalCount: number }`)
- Update callers to not pass `totalCount`

### `follow.ts` — `getFollowers()`
- Remove `SELECT COUNT(*) AS total FROM follows WHERE user_id_followed = $1` query
- Remove `totalCount` from return type (return `{ followers: TFollowers[] }` instead of `{ followers: TFollowers[]; totalCount: number }`)
- Update callers to not pass `totalCount`

### `follows.controller.ts` — `getFollowings()`, `getFollowers()`
- Destructure to not extract `totalCount` from model calls
- Remove `totalCount` argument from `createPaginationResult` calls

### `users.controller.ts` — `getUsers()`, `getFriends()`
- Destructure to not extract `totalCount` from model calls
- Remove `totalCount` argument from `createPaginationResult` calls
