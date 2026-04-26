# Tasks: Bookmark Posts

**Input**: Design documents from `/specs/004-bookmark-posts/`
**Prerequisites**: plan.md (required), spec.md (required), research.md, data-model.md, contracts/api.md, quickstart.md

**Tests**: Not included — testing is deferred per project convention (Constitution §Quality Standards).

**Organization**: Tasks grouped by user story to enable independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Phase 1: Setup (Database Migration)

**Purpose**: Create the `bookmarks` table, constraints, and indexes via db-migrate.

- [x] T001 Create migration skeleton: run `cd server && npx db-migrate create bookmarks --sql-file`
- [x] T002 Write `server/migrations/sqls/20260426082213-bookmarks-up.sql` — create bookmarks table with `bookmark_id (UUID PK)`, `user_id (FK→users ON DELETE CASCADE)`, `post_id (FK→posts ON DELETE CASCADE)`, `created_at (TIMESTAMPTZ DEFAULT NOW())`, `UNIQUE(user_id, post_id)`, and performance indexes (`idx_bookmarks_user_id`, `idx_bookmarks_post_id`, `idx_bookmarks_user_created`). See `data-model.md` for exact DDL.
- [x] T003 Write `server/migrations/sqls/20260426082213-bookmarks-down.sql` — `DROP TABLE IF EXISTS bookmarks;`

---

## Phase 2: Foundational (Types & Model)

**Purpose**: Core type definitions and model class that all user stories depend on.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [x] T004 [P] Create `server/src/types/bookmark.ts` — define `TBookmark` type with `bookmark_id?`, `user_id`, `post_id`, `created_at?` fields (mirror `server/src/types/like.ts` pattern)
- [x] T005 Create `server/src/models/bookmark.ts` — `BookmarkModel` class with `private validateRequiredFields()` helper (mirror `server/src/models/like.ts`) and three methods. All methods use `pool.connect()` → `BEGIN/COMMIT/ROLLBACK` → `release()` in `finally`, and preserve error chains with `throw new Error('...', { cause: error })` per AGENTS.md:
  - `toggle(userId: string, postId: string)` → `{ bookmark_id: string; action: "bookmarked" | "unbookmarked" }` — single transaction: LEFT JOIN posts+bookmarks to check existence and current state, INSERT bookmark or DELETE existing, return result (mirror `server/src/models/like.ts` `like()` pattern but without counter updates)
  - `getUserBookmarks(userId: string, limit: number, cursor?: string, direction?: 'next' | 'previous')` → `TBookmark[]` — cursor-based pagination by `created_at DESC`. Cursor resolution: when `cursor` is provided, pre-fetch `created_at` via `SELECT created_at FROM bookmarks WHERE bookmark_id = $1`, then use the timestamp in the WHERE clause (mirror `PostModel.feed()` pre-fetch pattern). Use `createPaginationResult(data, options, 'bookmark_id')` for pagination metadata.
  - `isBookmarked(userId: string, postId: string)` → `{ isBookmarked: boolean }` — `SELECT 1 FROM bookmarks WHERE user_id = $1 AND post_id = $2` (mirror `checkIfLiked` pattern)
- [x] T006 Add `bookmark_model = new BookmarkModel()` to `server/src/controllers/factory.ts` and export it

**Checkpoint**: Database table exists, type is defined, model methods are callable. User story implementation can begin.

---

## Phase 3: User Story 1 — Bookmark a Post (Priority: P1) 🎯 MVP

**Goal**: Authenticated users can toggle a bookmark on/off for any existing post via `POST /api/bookmarks/:post_id`.

**Independent Test**: Bookmark a post via curl/Postman, verify 200 response with bookmark record, call again and verify unbookmark response with removed bookmark_id.

### Implementation for User Story 1

- [x] T007 [P] [US1] Create `server/src/middlewares/validations/bookmarks.ts` — export `validateBookmarkAction` array using `param('post_id').notEmpty().isUUID()` (follow `server/src/middlewares/validations/likes.ts` pattern). For feed pagination, reuse existing `paginationValidator` from `server/src/middlewares/validations/pagination.js`; limit is clamped to max 50 in controller (T012, FR-016)
- [x] T008 [P] [US1] Create `server/src/controllers/bookmarks.controller.ts` — export default object with `toggle` arrow function: validate params, extract `req.user?.id`, call `bookmark_model.toggle()`, return `sendResponse.success()` for bookmarked or `sendResponse.success()` with `{ bookmark_id, action: "unbookmarked" }` for unbookmarked; catch post-not-found → 404 (follow `server/src/controllers/likes.controller.ts` pattern)
- [x] T009 [US1] Create `server/src/routes/apis/bookmarks.routes.ts` — `Router()` with `POST('/:post_id', authorize_user, contentCreationLimiter, validateBookmarkAction, bookmarksController.toggle)` (follow `server/src/routes/apis/posts.routes.ts` pattern, import from `../../middlewares/auth.js`, `../../middlewares/rateLimiter.js`, `../../middlewares/validations/bookmarks.js`, `../../controllers/bookmarks.controller.js`)
- [x] T010 [US1] Register bookmark routes in `server/src/routes/index.ts` — import `bookmarkRoutes` from `./apis/bookmarkRoutes.js`, mount with `routes.use('/bookmarks', bookmarkRoutes)` (alongside existing `/posts`, `/users`, etc.)
- [x] T011 [US1] Add `is_bookmarked?: boolean` field to `server/src/interfaces/IPost.ts` `IFeedPost` interface

**Checkpoint**: `POST /api/bookmarks/:post_id` works end-to-end. Can toggle bookmarks on/off. Returns proper response shape. Auth, rate limiting, and validation middleware applied.

---

## Phase 4: User Story 2 — View Bookmarked Posts Feed (Priority: P2)

**Goal**: Authenticated users can retrieve a paginated list of their bookmarks via `GET /api/bookmarks` and see `is_bookmarked` indicator on all post-bearing responses.

**Independent Test**: Bookmark several posts, call `GET /api/bookmarks?limit=20`, verify paginated response with correct metadata. Verify `is_bookmarked` appears in post feed responses.

### Implementation for User Story 2

- [x] T012 [US2] Add `getBookmarks` arrow function to `server/src/controllers/bookmarks.controller.ts` — use `getCursorPaginationOptions(req)` for pagination params, clamp limit to max 50 (`Math.min(options.originalLimit, 50)`, FR-016), call `bookmark_model.getUserBookmarks()`, wrap with `createPaginationResult(data, options, 'bookmark_id')`, return via `sendResponse.success()` (follow `server/src/controllers/posts.controller.ts` feed pattern)
- [x] T013 [US2] Add feed route to `server/src/routes/apis/bookmarks.routes.ts` — `GET('/', authorize_user, paginationValidator, bookmarksController.getBookmarks)`
- [x] T014 [US2] Add `is_bookmarked` and backfill missing `is_liked` LEFT JOINs to `server/src/models/post.ts` — update `feed()`, `index()`, `userPosts()`, and `fetchPostById()` methods:
  - Add `userId: string` parameter to `index()`, `userPosts()`, and `fetchPostById()` method signatures (currently only `feed()` accepts it). Update all callers in `server/src/controllers/posts.controller.ts` to pass `req.user?.id`.
  - In each method, add `LEFT JOIN bookmarks b ON b.post_id = p.post_id AND b.user_id = $N` and `CASE WHEN b.user_id IS NOT NULL THEN true ELSE false END AS is_bookmarked` to SELECT (follow existing `is_liked` LEFT JOIN pattern in `feed()`).
  - Backfill missing `is_liked` LEFT JOIN in `index()`, `userPosts()`, and `fetchPostById()` (currently only present in `feed()`) to ensure API consistency across all post-bearing endpoints (FR-019).
  - Adjust all `$N` parameter references after adding new parameters.

**Checkpoint**: `GET /api/bookmarks` returns paginated bookmarks. Post feed responses include `is_bookmarked` boolean. Pagination metadata (`hasMore`, `nextCursor`) works correctly.

---

## Phase 5: User Story 3 — Remove a Bookmark (Priority: P3)

**Goal**: Users can unbookmark posts and check bookmark status. Removing via toggle is already implemented (US1). This phase adds the check endpoint and validates the full remove flow.

**Independent Test**: Bookmark a post, verify via `GET /api/bookmarks/is-bookmarked/:post_id` returns `{ isBookmarked: true }`, toggle it off, verify check returns `{ isBookmarked: false }`.

### Implementation for User Story 3

- [X] T015 [US3] Add `checkBookmark` arrow function to `server/src/controllers/bookmarkController.ts` — validate params, extract `req.user?.id`, call `bookmark_model.isBookmarked()`, return `sendResponse.success<{ isBookmarked: boolean }>()` (follow `likes.controller.ts` `checkIfLiked` pattern)
- [X] T016 [US3] Add check route to `server/src/routes/apis/bookmarkRoutes.ts` — `GET('/is-bookmarked/:post_id', authorize_user, validateBookmarkAction, bookmarkController.checkBookmark)` (follows `/is-liked/:post_id` naming convention from `server/src/routes/apis/posts.routes.ts`)

**Checkpoint**: All three endpoints functional. Full bookmark lifecycle works: toggle on → check (true) → toggle off → check (false). Feed shows `is_bookmarked` indicator correctly.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Final validation, lint, schema verification.

- [X] T017 Run migration against database: `cd server && npx db-migrate up` — verify `bookmarks` table created with correct constraints and indexes. Confirm: (1) no `SELECT COUNT(*)` in any bookmark query (Constitution §VIII), (2) CASCADE deletes work for both post and user deletion (FR-006, FR-007), (3) soft-deleted posts are treated as non-existent for bookmarks (FR-024 — verified by CASCADE on hard delete)
- [X] T018 Run `pnpm run lint` in both `client/` and `server/` — fix any lint errors
- [X] T019 Run `pnpm run prettier:check` in both `client/` and `server/` — fix any formatting issues
- [X] T020 Verify all checklist items from `specs/004-bookmark-posts/checklists/backend.md` are satisfied by the implementation

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Phase 1 (migration must exist) — BLOCKS all user stories
- **User Story 1 (Phase 3)**: Depends on Phase 2 (model + types must exist)
- **User Story 2 (Phase 4)**: Depends on Phase 2. Can start in parallel with Phase 3 if model is complete.
- **User Story 3 (Phase 5)**: Depends on Phase 2. Can start in parallel with Phase 3/4.
- **Polish (Phase 6)**: Depends on all user stories complete

### User Story Dependencies

- **US1 (P1)**: Depends on Phase 2. No dependencies on other stories.
- **US2 (P2)**: Depends on Phase 2. Independent of US1 but extends the same controller/route files.
- **US3 (P3)**: Depends on Phase 2. Independent of US1/US2 but extends the same controller/route files.

### Parallel Opportunities

- T004 and T005 can start together (different files: types vs model)
- T007, T008 are parallel (validation middleware vs controller — different files)
- T014 can run in parallel with T012/T013 (modifying `post.ts` is independent of controller/route changes)

---

## Parallel Example: Phase 3 (US1)

```bash
# After Phase 2 completes, launch these in parallel:
T007: "Create validation middleware in server/src/middlewares/validations/bookmarks.ts"
T008: "Create bookmark controller in server/src/controllers/bookmarkController.ts"

# Then sequentially:
T009: "Create routes in server/src/routes/apis/bookmarkRoutes.ts" (depends on T007, T008)
T010: "Register in server/src/routes/index.ts" (depends on T009)
T011: "Add is_bookmarked to IPost.ts" (independent, can run anytime)
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Migration
2. Complete Phase 2: Types + Model + Factory
3. Complete Phase 3: Toggle endpoint (US1)
4. **STOP and VALIDATE**: `POST /api/bookmarks/:post_id` works end-to-end
5. Deploy/demo if ready

### Incremental Delivery

1. Phase 1 + Phase 2 → Database + model ready
2. Phase 3 (US1) → Toggle works → **MVP!**
3. Phase 4 (US2) → Feed + `is_bookmarked` indicator
4. Phase 5 (US3) → Check endpoint
5. Phase 6 → Lint, format, verify

---

## Notes

- All new files use `.js` extension in imports (ESM convention)
- Model follows `pool.connect()` → `BEGIN/COMMIT/ROLLBACK` → `release()` in `finally`
- Controller follows arrow functions in default export, `ICustomRequest`, `sendResponse`, `next(error)`
- No counter column on `posts` table (FR-022, FR-026: no side effects)
- `countByUser` from user input was removed — not needed (spec says no counts exposed anywhere, FR-022)
- Testing deferred per Constitution §Quality Standards
