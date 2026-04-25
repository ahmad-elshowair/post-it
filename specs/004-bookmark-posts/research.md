# Research: Bookmark Posts

**Feature**: 004-bookmark-posts
**Date**: 2026-04-25

## 1. Bookmark Table Design

**Decision**: Single `bookmarks` table with `bookmark_id (UUID PK)`, `user_id (FK→users)`, `post_id (FK→posts)`, `created_at (TIMESTAMPTZ DEFAULT NOW())`. UNIQUE constraint on `(user_id, post_id)`. ON DELETE CASCADE on both FKs.

**Rationale**: Mirrors the existing `likes` table pattern exactly. The UNIQUE constraint prevents duplicate bookmarks at the DB level. CASCADE deletes satisfy FR-006 (post deletion) and FR-007 (user deletion). No counter column needed on `posts` (FR-022: counts must never be exposed).

**Alternatives considered**:
- Composite PK `(user_id, post_id)` instead of surrogate `bookmark_id`: Rejected — cursor-based pagination uses a single ID field via `createPaginationResult(posts, options, 'bookmark_id')`. A surrogate UUID PK is consistent with every other table in the system (`like_id`, `comment_id`, `follow_id`).

## 2. Toggle Pattern

**Decision**: Replicate the `LikeModel.like()` toggle pattern — single transaction that: (1) checks post existence + current bookmark state via LEFT JOIN, (2) INSERTs or DELETEs based on state, (3) returns `{ action: "bookmarked" | "unbookmarked" }`.

**Rationale**: The existing like toggle is battle-tested in this codebase. No `number_of_likes` counter update needed (FR-026: no side effects). This simplifies the bookmark toggle compared to likes.

**Alternatives considered**:
- Separate add/remove endpoints: Rejected — spec FR-014 mandates a single toggle endpoint.
- UPSERT with `ON CONFLICT DO NOTHING`: Rejected — toggle requires deletion on conflict, not a no-op.

## 3. Cursor-Based Pagination for Bookmarks Feed

**Decision**: Use `created_at DESC` as the cursor column, matching how `getLikesByPostId` paginates by `l.created_at`. The cursor will be the `bookmark_id` value (consistent with `createPaginationResult` which extracts cursor from the ID field).

**Rationale**: The existing pagination utility `createPaginationResult(data, options, idField)` extracts `nextCursor` from `lastItem[idField]`. Using `bookmark_id` as the ID field and `created_at DESC` for ordering aligns with FR-004 (most recently saved first) and reuses existing utilities without modification.

**Alternatives considered**:
- Cursor on `created_at` timestamp directly: Rejected — `createPaginationResult` expects an ID field. Using `bookmark_id` as cursor while ordering by `created_at DESC, bookmark_id DESC` guarantees stable sort.

## 4. is_bookmarked on Post Responses (Feed Integration)

**Decision**: Add a `LEFT JOIN bookmarks b ON b.post_id = p.post_id AND b.user_id = $userId` to existing feed queries in `PostModel`, following the exact same pattern as the current `is_liked` LEFT JOIN. Add `CASE WHEN b.user_id IS NOT NULL THEN true ELSE false END AS is_bookmarked` to the SELECT.

**Rationale**: The existing feed query already JOINs likes for `is_liked`. Adding bookmarks follows the identical pattern — no architectural change, just one more LEFT JOIN. This satisfies FR-019, FR-020, FR-021 (batch lookup via JOIN, not per-post query).

**Alternatives considered**:
- Separate API call from frontend: Rejected — causes N+1 problem, violates FR-021.
- Subquery `EXISTS(SELECT 1 FROM bookmarks...)`: Rejected — LEFT JOIN is the established pattern in this codebase.

## 5. Rate Limiting Tier

**Decision**: Bookmark toggle (`POST /api/bookmarks/:postId`) uses `contentCreationLimiter` (25 req/min per user). Bookmarks feed (`GET /api/bookmarks`) uses `globalLimiter` only (150 req/min per IP) — no additional limiter needed since it's a read endpoint covered by the global baseline.

**Rationale**: Constitution §VI defines content creation as 25 req/min. Toggle mutates data (same as likes which already use `contentCreationLimiter`). Feed is read-only, covered by global baseline.

## 6. Bookmark Toggle Response Shape

**Decision**: On bookmark creation: return `{ bookmark_id, post_id, user_id, created_at }` (FR-013). On bookmark removal: return `{ bookmark_id: "<removed_id>", action: "unbookmarked" }` (FR-015).

**Rationale**: On add, the spec says return the bookmark record. On remove, FR-015 says return confirmation with removed bookmark ID. The toggle method will need to SELECT the existing bookmark before deleting to capture its ID.

## 7. Soft Delete Handling

**Decision**: No soft delete mechanism exists in the current schema — `posts` are hard-deleted via `DELETE FROM posts WHERE post_id = $1`. The CASCADE on `bookmarks.post_id` handles cleanup automatically. No additional logic needed.

**Rationale**: The existing codebase has no `deleted_at` or soft-delete column on posts. FR-024 is satisfied by the CASCADE constraint.

## 8. Migration Strategy

**Decision**: Single migration file using `db-migrate` SQL format (matching existing convention). Up migration creates `bookmarks` table with all constraints and indexes. Down migration drops the `bookmarks` table.

**Rationale**: Constitution §IV mandates `db-migrate` for all schema changes. The existing migration history shows single-step DDL migrations (init, refresh-tokens, comments, schema-constraints-indexes).
