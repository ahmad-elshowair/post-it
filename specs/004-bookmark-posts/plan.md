# Implementation Plan: Bookmark Posts

**Branch**: `004-bookmark-posts` | **Date**: 2026-04-25 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/004-bookmark-posts/spec.md`

## Summary

Add a private bookmark/save system for posts. Users can toggle bookmarks on any post, view a paginated feed of their saved posts, and check bookmark status. The `bookmarks` table mirrors the `likes` pattern with CASCADE deletes, a UNIQUE constraint on `(user_id, post_id)`, and a toggle endpoint. Existing post feed queries gain an `is_bookmarked` field via LEFT JOIN.

## Technical Context

**Language/Version**: TypeScript 5.x (strict mode), Node.js
**Primary Dependencies**: Express 4, pg (node-postgres), db-migrate, express-rate-limit, rate-limit-redis, express-validator
**Storage**: PostgreSQL 15+ (primary), Redis (rate limiting)
**Testing**: Deferred per project convention
**Target Platform**: Node.js server (Linux)
**Project Type**: Web service (REST API backend)
**Performance Goals**: <1s toggle response, <2s first page load, cursor-based pagination for thousands of bookmarks
**Constraints**: Constitution §VIII — no SELECT COUNT(*) alongside cursor pagination, 500ms debounce on frontend toggle
**Scale/Scope**: Unlimited bookmarks per user, batch `is_bookmarked` via JOIN

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Full-Stack TypeScript Strictness | ✅ Pass | All new files in TypeScript strict mode, shared types for API contracts |
| II. Security & Authentication Priority | ✅ Pass | All endpoints require `authorize_user` middleware; parameterized queries throughout; no bookmark data leaked |
| III. Component-Driven UI & State Management | ⬜ N/A | Backend-only feature; no frontend changes in this phase |
| IV. Relational Data Integrity | ✅ Pass | Migration via `db-migrate`; CASCADE deletes on both FKs; UNIQUE constraint; transactions for toggle |
| V. Predictable RESTful API Design | ✅ Pass | Domain-based route (`/api/bookmarks`); standardized response envelope via `sendResponse` |
| VI. Tiered Rate Limiting | ✅ Pass | Toggle = `contentCreationLimiter` (25/min); Feed/Check = `globalLimiter` (150/min) |
| VII. File Upload Validation & Content Security | ⬜ N/A | No file uploads involved |
| VIII. Frontend Efficiency & Performance | ✅ Pass | Cursor-based pagination, no SELECT COUNT(*), `is_bookmarked` via batch LEFT JOIN |
| Quality: Sectional Comments | ✅ Pass | Will apply `// ───── LABEL ──────────────────────────────` pattern |
| Quality: Linting | ✅ Pass | Will run `pnpm run lint` and `pnpm run prettier:check` |

**Post-Phase 1 Re-check**: All gates still pass. No violations introduced by the design.

## Project Structure

### Documentation (this feature)

```text
specs/004-bookmark-posts/
├── spec.md              # Feature specification
├── plan.md              # This file
├── research.md          # Phase 0: design decisions & rationale
├── data-model.md        # Phase 1: entity definitions, DDL, indexes
├── quickstart.md        # Phase 1: file inventory, implementation order, patterns
├── contracts/
│   └── api.md           # Phase 1: endpoint contracts
├── checklists/
│   ├── requirements.md  # Spec quality checklist
│   └── backend.md       # Backend requirements quality checklist
└── tasks.md             # Phase 2 output (/speckit.tasks - NOT created yet)
```

### Source Code (repository root)

```text
server/
├── migrations/sqls/
│   ├── YYYYMMDDHHMMSS-bookmarks-up.sql          # NEW: bookmarks table DDL
│   └── YYYYMMDDHHMMSS-bookmarks-down.sql        # NEW: drop bookmarks table
├── src/
│   ├── configs/config.ts                        # EXISTING: env configuration
│   ├── controllers/
│   │   ├── bookmarkController.ts                # NEW: toggle, feed, check
│   │   └── factory.ts                           # MODIFY: add bookmark_model
│   ├── database/
│   │   └── pool.ts                              # EXISTING: pg pool
│   ├── interfaces/
│   │   ├── ICustomRequest.ts                    # EXISTING: req.user type
│   │   ├── IPagination.ts                       # EXISTING: cursor pagination types
│   │   └── IPost.ts                             # MODIFY: add is_bookmarked
│   ├── middlewares/
│   │   ├── rateLimiter.ts                       # EXISTING: rate limiters (reuse)
│   │   └── validations/
│   │       └── bookmarks.ts                     # NEW: validateBookmarkAction
│   ├── models/
│   │   ├── bookmark.ts                          # NEW: BookmarkModel class
│   │   └── post.ts                              # MODIFY: add is_bookmarked JOIN
│   ├── routes/
│   │   ├── index.ts                             # MODIFY: mount bookmarkRoutes
│   │   └── apis/
│   │       └── bookmarkRoutes.ts                # NEW: 3 routes
│   ├── types/
│   │   └── bookmark.ts                          # NEW: TBookmark type
│   └── utilities/
│       ├── pagination.ts                        # EXISTING: reuse as-is
│       └── response.ts                          # EXISTING: reuse as-is
└── database.json                                # EXISTING: db-migrate config
```

**Structure Decision**: Follows existing server-side MVC structure. New files follow established naming conventions (camelCase, matching like/post/follow patterns). No new directories needed.

## Complexity Tracking

No violations to justify. All principles satisfied.
