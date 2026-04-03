# Research: Rate Limiting & Security Hardening

**Feature**: 001-rate-limit-security
**Date**: 2026-04-02
**Status**: Complete

## R1: Rate Limiting Library Selection

**Decision**: Use `express-rate-limit` with `rate-limit-redis` store.

**Rationale**:
- `express-rate-limit` is the de-facto standard for Express (2M+ weekly downloads)
- Native sliding window support via `windowMs`
- `rate-limit-redis` provides the Redis store adapter for multi-instance consistency
- Built-in `Retry-After` header via `standardHeaders: true`
- Customizable `keyGenerator` for IP vs user-ID identity (matches FR-012)

**Alternatives considered**:
- `rate-limiter-flexible`: More features but heavier, Redis-specific API, not Express-native
- Custom middleware: Reinventing the wheel, harder to maintain
- Nginx-level rate limiting: Requires infra changes, no application-level awareness (user-ID tier)

## R2: Redis Client Selection

**Decision**: Use `ioredis` as the Redis client.

**Rationale**:
- `rate-limit-redis` supports both `ioredis` and `node-redis`
- `ioredis` has better TypeScript support, pipeline support, and cluster support
- More actively maintained for production workloads
- Supports Redis Sentinel and Cluster for future scaling

**Alternatives considered**:
- `redis` (node-redis): Simpler but less TypeScript-native, limited cluster support
- In-memory store: No cross-instance sync, counters reset on restart (rejected per Q1 clarification)

## R3: MIME Type Validation (Magic Bytes)

**Decision**: Use `file-type` library for magic-byte detection.

**Rationale**:
- Reads the first few bytes of a file to detect actual type (not extension)
- Supports JPEG, PNG, WebP, and GIF detection
- Actively maintained, lightweight, no native dependencies
- Works with Buffer/Stream — compatible with Multer's memory storage option

**Implementation approach**:
- Switch Multer from `diskStorage` to `memoryStorage` for pre-save validation
- After upload, run `fileTypeFromBuffer()` to check actual MIME type
- If MIME is in allowlist (image/jpeg, image/png, image/webp, image/gif), write to disk
- Otherwise, reject with 400 error

**Alternatives considered**:
- `mmmagic`: Native bindings, harder to deploy, less maintained
- Manual magic-byte reading: Fragile, reinventing the wheel
- `multer` `fileFilter` with `mimetype` check: Only checks declared MIME, not actual content (rejected per FR-005)

## R4: Content Security Policy Configuration

**Decision**: Use Helmet's `contentSecurityPolicy` middleware with environment-conditional directives.

**Rationale**:
- Helmet is already installed and applied globally in `server/src/index.ts`
- Helmet's CSP middleware supports directive configuration via options
- Environment-conditional config allows dev relaxations (localhost, unsafe-eval for HMR)
- Production CSP: `script-src 'self'`, `object-src 'none'`, `base-uri 'self'` (per Q10 clarification)

**Implementation approach**:
- Add `contentSecurityPolicy` directive to existing `helmet()` call in `index.ts`
- Dev mode: add `http://localhost:3000` to script-src, `'unsafe-eval'` for HMR
- Prod mode: strict `'self'` only for all resource types

**Alternatives considered**:
- Custom CSP header middleware: More control but duplicates helmet functionality
- CSP report-only mode: Useful for testing but doesn't actually block (can enable temporarily during rollout)

## R5: Frontend Like Debounce Strategy

**Decision**: Custom `useDebouncedLike` React hook with per-post independent timers using Zustand.

**Rationale**:
- Each post gets its own debounce timer (per Q8 clarification)
- Zustand already used for state management (Constitution Principle III)
- Optimistic update: toggle like state immediately in Zustand store
- After 500ms of no further clicks on that post, dispatch the API call
- On API failure, revert the Zustand state and show global toast

**Implementation approach**:
- Create `useDebouncedLike(postId)` hook
- Internally uses a `Map<postId, timeoutId>` for per-post timers
- Zustand store tracks optimistic like state
- API call sends final state (liked/unliked)
- On error, rollback state + trigger toast notification

**Alternatives considered**:
- `lodash.debounce`: Generic debounce, doesn't handle per-post mapping or optimistic state
- Shared global timer (Option B from Q8): Would lose likes on different posts (rejected)
- Queue + flush model (Option C from Q8): Requires new batch endpoint (rejected — simpler option chosen)

## R6: SELECT COUNT(*) Removal Strategy

**Decision**: Derive `hasMore` from returned data length alone, remove all COUNT queries.

**Rationale**:
- Current `createPaginationResult()` uses `totalCount` to compute `hasMore`
- New logic: fetch `limit + 1` rows; if `length === limit + 1`, hasMore = true, return only `limit` rows
- This is the standard keyset-pagination "fetch one extra" pattern
- Eliminates the expensive COUNT query on large tables

**Implementation approach**:
- Modify `getCursorPaginationOptions` to request `limit + 1`
- Modify `createPaginationResult` to check `data.length > originalLimit` for hasMore
- Strip the extra item from returned data
- Remove `totalCount` parameter from function signature
- Update all callers (user model, post model)

**Alternatives considered**:
- Estimated counts: `pg_class.reltuples` — inaccurate, adds complexity
- Cached counts: Redis counter — adds consistency burden
- Keep counts: Rejected per Constitution Principle VIII and spec FR-017

## R7: Feed Response — Embedding is-liked Status

**Decision**: Add a LEFT JOIN to the likes table in the feed query to embed `is_liked` per post.

**Rationale**:
- Current feed endpoint returns posts without like status
- Frontend then fires N individual `GET /api/posts/is-liked/:post_id` requests (N+1 problem)
- Adding `LEFT JOIN likes ON posts.post_id = likes.post_id AND likes.user_id = $current_user` to the feed query embeds the status
- Zero additional API requests needed

**Implementation approach**:
- Modify `post_model.feed()` SQL to LEFT JOIN the likes table
- Add `is_liked` boolean to the `IFeedPost` interface
- Remove or deprecate the `checkIfLiked` per-post endpoint (keep for single-post views)
- Frontend reads `is_liked` directly from feed response

**Alternatives considered**:
- Batch endpoint (`POST /api/posts/batch-is-liked`): Still an extra request (rejected)
- Embed in individual post endpoint only: Doesn't solve feed N+1 (rejected)

## R8: Path Traversal Prevention

**Decision**: Validate folder name against allowlist of known directories.

**Rationale**:
- Current code takes `folder` from `req.body` directly into `path.join()`
- Allowlist of valid folders (e.g., `posts`, `profiles`, `covers`) prevents any traversal
- If folder is not in allowlist, reject with 400 (per Q5 clarification — reject, not sanitize)

**Implementation approach**:
- Define `ALLOWED_FOLDERS = ['posts', 'profiles', 'covers']` constant
- Check `req.body.folder` against allowlist before path.join
- Reject with 400 if not in list

**Alternatives considered**:
- Regex sanitization: Fragile, bypassable with encoding tricks
- Path normalization + containment check: More complex, still allows unexpected paths
