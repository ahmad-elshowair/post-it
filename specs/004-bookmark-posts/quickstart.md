# Quickstart: Bookmark Posts

**Feature**: 004-bookmark-posts
**Date**: 2026-04-25

## Files to Create

| File | Purpose |
|------|---------|
| `server/migrations/sqls/YYYYMMDDHHMMSS-bookmarks-up.sql` | DDL: create bookmarks table, constraints, indexes |
| `server/migrations/sqls/YYYYMMDDHHMMSS-bookmarks-down.sql` | DDL: drop bookmarks table |
| `server/src/types/bookmark.ts` | `TBookmark` type |
| `server/src/interfaces/IBookmark.ts` | `IFeedBookmark` interface for feed query results |
| `server/src/models/bookmark.ts` | `BookmarkModel` class with toggle, feed, check methods |
| `server/src/controllers/bookmarkController.ts` | Arrow functions: toggle, feed, check |
| `server/src/middlewares/validations/bookmarks.ts` | `validateBookmarkAction`, `bookmarkPaginationValidator` |
| `server/src/routes/apis/bookmarkRoutes.ts` | Router with 3 routes |

## Files to Modify

| File | Change |
|------|--------|
| `server/src/controllers/factory.ts` | Add `bookmark_model = new BookmarkModel()` and export |
| `server/src/routes/index.ts` | Import and mount `bookmarkRoutes` at `/bookmarks` |
| `server/src/models/post.ts` | Add `LEFT JOIN bookmarks` + `is_bookmarked` to feed queries (`feed()`, `index()`, `userPosts()`, `getPostById()`) |
| `server/src/interfaces/IPost.ts` | Add `is_bookmarked?: boolean` to `IFeedPost` |

## Implementation Order

1. **Migration**: Create bookmarks table + indexes
2. **Types**: `TBookmark`, `IFeedBookmark`, update `IFeedPost`
3. **Model**: `BookmarkModel` (toggle, getUserBookmarks, isBookmarked)
4. **Post Model**: Add `is_bookmarked` LEFT JOIN to existing feed queries
5. **Validation**: `validateBookmarkAction`, `bookmarkPaginationValidator`
6. **Controller**: `bookmarkController` (toggle, feed, check)
7. **Route**: `bookmarkRoutes` → mount in `routes/index.ts`
8. **Factory**: Register `bookmark_model` singleton

## Key Patterns to Follow

- **Model**: `pool.connect()` → `BEGIN` → queries → `COMMIT` / `ROLLBACK` → `release()` in finally
- **Toggle**: Check post existence + current state via LEFT JOIN, then INSERT or DELETE (mirror `LikeModel.like()`)
- **Pagination**: Use `getCursorPaginationOptions(req)` + `createPaginationResult(data, options, 'bookmark_id')`
- **Response**: `sendResponse.success<T>(res, data, status)` / `sendResponse.error(res, msg, status)`
- **Auth**: `ICustomRequest` + `req.user?.id` check
- **Rate limit**: Toggle = `contentCreationLimiter`, Feed/Check = `globalLimiter` only
- **Validation**: `express-validator` chains, checked with `validationResult(req)` in controller
- **Imports**: Use `.js` extension in all import paths
