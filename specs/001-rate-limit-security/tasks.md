# Tasks: Rate Limiting & Security Hardening

**Input**: Design documents from `/specs/001-rate-limit-security/`
**Prerequisites**: plan.md (required), spec.md (required), research.md, contracts/

**Tests**: Deferred per user input — manual verification via quickstart.md

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3, US4)
- Include exact file paths in descriptions

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Install new dependencies, add Redis connection, add rate limit configuration

- [x] T001 Install new server dependencies: express-rate-limit, rate-limit-redis, ioredis, file-type in server/package.json
- [x] T002 [P] Install dev dependency @types/ioredis in server/package.json
- [x] T003 Add REDIS_URL and rate limit environment variables to server/.env (REDIS_URL=redis://localhost:6379, RATE_LIMIT_GLOBAL_WINDOW_MS=60000, RATE_LIMIT_GLOBAL_MAX=150, RATE_LIMIT_AUTH_WINDOW_MS=900000, RATE_LIMIT_AUTH_MAX=5, RATE_LIMIT_CONTENT_WINDOW_MS=60000, RATE_LIMIT_CONTENT_MAX=25, UPLOAD_MAX_SIZE_BYTES=5242880)
- [x] T004 [P] Create Redis connection client in server/src/database/redis.ts — connect using ioredis with REDIS_URL env var, export client instance, handle connection errors with process exit
- [x] T005 [P] Add Redis and rate limit config properties to server/src/configs/config.ts (redisUrl, rate limit tier configs, upload size and allowed MIME types)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core rate limiter middleware and pagination utility refactor that multiple user stories depend on

**CRITICAL**: No user story work can begin until this phase is complete

- [x] T006 Create tiered rate limiter middleware in server/src/middlewares/rateLimiter.ts — export globalLimiter (150 req/60s by IP), authLimiter (5 req/900s by IP), contentCreationLimiter (25 req/60s by authenticated user ID); use express-rate-limit with rate-limit-redis store connected via redis.ts client; set standardHeaders: true, custom keyGenerator for user-ID vs IP; return 429 with standardized error envelope on limit exceeded
- [x] T007 [P] Remove totalCount parameter from createPaginationResult in server/src/utilities/pagination.ts — update getCursorPaginationOptions to request limit+1, derive hasMore from data.length > originalLimit, strip extra item from returned data, remove totalCount from IPaginatedResult interface

**Checkpoint**: Foundation ready — rate limiter middleware and pagination utility refactor complete, user story implementation can begin

---

## Phase 3: User Story 1 — Abuse Protection via Tiered Rate Limits (Priority: P1) MVP

**Goal**: Apply tiered rate limiting to all endpoints so abusive traffic is throttled/blocked with proper 429 responses and Retry-After headers.

**Independent Test**: Send requests exceeding each tier threshold and confirm correct 429 rejection with Retry-After header.

### Implementation for User Story 1

- [x] T008 [US1] Apply rate limiters to route groups in server/src/routes/index.ts — import globalLimiter, authLimiter from rateLimiter; apply authLimiter before auth routes, globalLimiter before posts/comments/follows routes
- [x] T009 [US1] Apply contentCreationLimiter to POST/PUT/DELETE routes on posts in server/src/routes/apis/posts.routes.ts
- [x] T010 [P] [US1] Apply contentCreationLimiter to POST/PUT/DELETE routes on comments in server/src/routes/apis/comments.routes.ts
- [x] T011 [US1] Add structured logging for all 429 responses — rate limit rejections in server/src/middlewares/rateLimiter.ts, upload validation rejections in server/src/routes/apis/upload.routes.ts; log source IP, endpoint/type, and rejection reason (OR-002)

**Checkpoint**: Rate limiting fully functional — send 160 requests to confirm 429 after request 151, send 6 auth requests to confirm 429 after request 6

---

## Phase 4: User Story 2 — Secure File Uploads (Priority: P1)

**Goal**: Validate uploaded files by actual content type (magic bytes), enforce 5MB size limit, and reject path traversal in folder names.

**Independent Test**: Upload a .exe renamed to .png (rejected), upload a file >5MB (rejected), supply folder `../../etc` (rejected), upload valid JPEG (accepted).

### Implementation for User Story 2

- [ ] T012 [US2] Create MIME magic-byte validation utility in server/src/utilities/uploadValidation.ts — use file-type library to detect actual MIME from buffer, define ALLOWED_MIMES constant (image/jpeg, image/png, image/webp, image/gif), define ALLOWED_FOLDERS constant (posts, profiles, covers), export validateFileMime(buffer) and validateFolderName(folder) functions
- [ ] T013 [US2] Update Multer config in server/src/routes/apis/upload.routes.ts — add limits.fileSize from config, add fileFilter that reads buffer and calls validateFileMime, add folder validation via validateFolderName before path.join, return proper error codes per upload-validation.md contract (400 for bad type/folder, 413 for size)
- [ ] T014 [US2] Switch Multer storage to memoryStorage for pre-save validation in server/src/routes/apis/upload.routes.ts — preserve existing filename generation logic (date-based uniqueSuffix + originalname) and directory creation (mkdir recursive), move these operations to after MIME validation passes using fs.writeFile

**Checkpoint**: Upload security fully functional — test with renamed executable, oversized file, and path traversal folder name to confirm rejections

---

## Phase 5: User Story 3 — XSS Prevention via Content Security Policy (Priority: P2)

**Goal**: Configure Helmet CSP directives that are strict in production and relaxed in development, blocking inline script execution from user-generated content.

**Independent Test**: Check response headers for Content-Security-Policy; inject a `<script>` tag into a post and confirm browser blocks execution.

### Implementation for User Story 3

- [ ] T015 [US3] Add environment-conditional CSP directives to Helmet configuration in server/src/index.ts — production: script-src 'self', object-src 'none', base-uri 'self', form-action 'self', frame-ancestors 'none', img-src 'self', style-src 'self' 'unsafe-inline', font-src 'self', connect-src 'self'; development: add 'unsafe-eval', 'unsafe-inline', http://localhost:3000 to script-src, add http://localhost:3000 to img-src/style-src/connect-src, add ws://localhost:3000 to connect-src

**Checkpoint**: CSP fully functional — curl -I to verify Content-Security-Policy header present; test with script injection in post content

---

## Phase 6: User Story 4 — Efficient Feed Interaction (Priority: P2)

**Goal**: Implement per-post like debounce with optimistic updates, embed is-liked status in feed response, and remove SELECT COUNT(*) from paginated endpoints.

**Independent Test**: Rapidly click like 10 times in 1 second — UI updates instantly but only 1 server request sent after 500ms. Load feed — no secondary is-liked requests.

### Implementation for User Story 4

- [ ] T016 [US4] Remove SELECT COUNT(*) query from user model pagination methods (indexWithPagination, getFriends) in server/src/models/user.ts — remove totalCount query, update return types to exclude totalCount, update createPaginationResult calls to not pass totalCount
- [ ] T017 [P] [US4] Remove SELECT COUNT(*) query from post model pagination methods (index, userPosts, feed) in server/src/models/post.ts — remove totalCount query, update return types to exclude totalCount, update createPaginationResult calls to not pass totalCount
- [ ] T018 [US4] Update posts controller pagination calls in server/src/controllers/posts.controller.ts — remove totalCount destructuring from model call results, remove totalCount argument from createPaginationResult calls
- [ ] T019 [P] [US4] Remove SELECT COUNT(*) query from follow model pagination methods (getFollowings, getFollowers) in server/src/models/follow.ts — remove totalCount query, update return types to exclude totalCount, update createPaginationResult calls to not pass totalCount
- [ ] T020 [US4] Update follows controller pagination calls in server/src/controllers/follows.controller.ts — remove totalCount destructuring from model call results, remove totalCount argument from createPaginationResult calls
- [ ] T021 [US4] Update users controller pagination calls in server/src/controllers/users.controller.ts — remove totalCount destructuring from model call results in getUsers() and getFriends(), remove totalCount argument from createPaginationResult calls
- [ ] T022 [US4] Add LEFT JOIN to likes table in feed query in server/src/models/post.ts — add is_liked boolean field to feed query result, join on likes.post_id and likes.user_id = current authenticated user
- [ ] T023 [P] [US4] Add is_liked field to IFeedPost interface in server/src/interfaces/IPost.ts
- [ ] T024 [P] [US4] Add is_liked optional boolean field to TPost type in client/src/types/TPost.ts
- [ ] T025 [US4] Create useDebouncedLike hook in client/src/hooks/useDebouncedLike.ts — per-post independent debounce with 500ms timer via Map<postId, timeoutId>. Optimistic update stays in Post.tsx local state (useState). Hook manages debounce timers and API calls only. On API success, caller updates local state. On error, hook calls a rollback callback and triggers global toast notification.
- [ ] T026 [US4] Update Post component in client/src/components/post/Post.tsx to use useDebouncedLike hook instead of direct API call in likeHandler — remove the checkIfLiked useEffect when is_liked is provided in post data from feed response, read is_liked from TPost prop instead of making individual API calls
- [ ] T027 [P] [US4] Verify no client-side code references totalCount from server pagination responses — search client/src/ for any totalCount usage and remove if found; the existing TPagination type already lacks totalCount and usePostStore never references it

**Checkpoint**: Feed loads with is_liked embedded (no N+1), like button debounces rapid clicks into single request, pagination works without totalCount across all endpoints (posts, users, friends, follows)

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Final validation, cleanup, and cross-cutting concerns

- [ ] T028 Run quickstart.md verification steps — Redis connection, rate limiting tiers, upload validation, CSP headers, like debounce
- [ ] T029 [P] Verify all 429 responses use standardized error envelope across all enforcement points (rate limiting, upload validation)
- [ ] T030 [P] Verify no totalCount references remain in any server response payloads or controller/model code
- [ ] T031 [P] Verify feed pagination response time consistency — manually time paginated feed queries at different data volumes to confirm no degradation (SC-006)
- [ ] T032 Run pnpm test && pnpm run lint to validate no regressions
- [ ] T033 Update all existing sectional comments across the codebase to match the new 1.2.0 constitution standard (// ───── SECTION ────────────────────────────── and file-specific variants)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Phase 1 completion — BLOCKS all user stories
- **User Stories (Phase 3–6)**: All depend on Phase 2 completion
  - US1 (Phase 3), US2 (Phase 4), US3 (Phase 5): Can all proceed in parallel
  - US4 (Phase 6): Depends only on T007 (pagination utility refactor). No dependency on US1/US2/US3 — server-side model changes and client-side hook changes are independent of rate limiting, upload validation, and CSP.
- **Polish (Phase 7)**: Depends on all user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Depends on Phase 2 rate limiter middleware (T006). No dependencies on other stories.
- **User Story 2 (P1)**: Depends on Phase 1 config (T003, T005). No dependencies on other stories.
- **User Story 3 (P2)**: Depends on Phase 1 setup. No dependencies on other stories.
- **User Story 4 (P2)**: Depends only on T007 (pagination utility refactor). Server-side model/controller changes (T016–T023) are independent of client-side changes (T024–T027).

### Within Each User Story

- Models/Utilities before route/controller integration
- Core implementation before integration
- Story complete before moving to next priority

### Parallel Opportunities

- Phase 1: T002, T004, T005 can run in parallel
- Phase 2: T006 and T007 can run in parallel (different files)
- Phase 3 + 4 + 5: US1 (T008–T011), US2 (T012–T014), US3 (T015) can all run in parallel
- Phase 3: T010 is parallelizable (different route file)
- Phase 6: T017 and T019 parallel (different model files), T023 and T024 parallel (different files), T025 and server-side tasks parallel

---

## Parallel Example: User Story 1

```bash
# After rate limiter middleware is created (T006):
Task: "T008 Apply rate limiters to routes in server/src/routes/index.ts"
Task: "T009 Apply contentCreationLimiter to posts routes"
Task: "T010 Apply contentCreationLimiter to comments routes"  # parallel with T009
```

## Parallel Example: User Story 4

```bash
# Server-side (after T007):
Task: "T016 Remove COUNT(*) from user model"
Task: "T017 Remove COUNT(*) from post model"   # parallel with T016
Task: "T019 Remove COUNT(*) from follow model" # parallel with T016, T017

# Client-side (parallel with server-side):
Task: "T024 Add is_liked to TPost type"
Task: "T025 Create useDebouncedLike hook"
```

---

## Implementation Strategy

### MVP First (User Stories 1 & 2 Only)

1. Complete Phase 1: Setup (T001–T005)
2. Complete Phase 2: Foundational (T006–T007)
3. Complete Phase 3: User Story 1 — Rate Limiting (T008–T011)
4. Complete Phase 4: User Story 2 — Upload Security (T012–T014)
5. **STOP and VALIDATE**: Test US1 and US2 independently via quickstart.md
6. Deploy/demo if ready — critical security gaps are now closed

### Incremental Delivery

1. Setup + Foundational → Foundation ready
2. Add US1 + US2 → Test independently → Deploy (MVP — security baseline)
3. Add US3 → Test independently → Deploy (XSS prevention)
4. Add US4 → Test independently → Deploy (performance optimization)
5. Each story adds value without breaking previous stories

### Parallel Team Strategy

1. Team completes Setup + Foundational together
2. Once Foundational is done:
   - Developer A: User Story 1 (rate limiting)
   - Developer B: User Story 2 (upload security)
   - Developer C: User Story 3 (CSP headers)
3. User Story 4 can start as soon as T007 (pagination utility refactor) is complete — no dependency on other user stories
4. Stories complete and integrate independently

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- Redis must be running (docker or local) before testing rate limiting
- No schema changes required — only query modifications and middleware additions
- OR-001 (Prometheus metrics) deferred per scope note in spec.md — initial observability relies on structured logging (OR-002)
