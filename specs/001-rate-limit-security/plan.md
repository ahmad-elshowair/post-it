# Implementation Plan: Rate Limiting & Security Hardening

**Branch**: `001-rate-limit-security` | **Date**: 2026-04-02 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-rate-limit-security/spec.md`

## Summary

Harden the Post-It social media app against abuse and performance degradation by implementing: (1) tiered rate limiting backed by Redis for global consistency, (2) file upload security via MIME validation and size limits, (3) Content Security Policy headers via helmet, (4) frontend like-button debounce with optimistic updates, and (5) removal of SELECT COUNT(*) from cursor-paginated endpoints. These changes address Constitution Principles VI, VII, and VIII.

## Technical Context

**Language/Version**: TypeScript 5.x (strict mode), Node.js
**Primary Dependencies**: Express 4, React 18, Zustand 5, Multer 1.4, Helmet 7, pg 8, jsonwebtoken 9, bcryptjs 3
**New Dependencies**: express-rate-limit, rate-limit-redis, ioredis, file-type (for magic-byte MIME detection)
**Storage**: PostgreSQL (existing), Redis (new — rate limit counter store)
**Testing**: Deferred per user input — manual verification
**Target Platform**: Node.js server + React SPA (CRA)
**Project Type**: Web application (monorepo with server/ and client/)
**Performance Goals**: 150 req/min global, 5 req/15min auth, 25 req/min content creation
**Constraints**: No breaking changes to existing API contracts; Redis must be provisioned
**Scale/Scope**: Single-server deployment, designed to scale horizontally

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|---|---|---|
| I. Full-Stack TypeScript Strictness | PASS | All new code in TypeScript, strict typing |
| II. Security & Authentication Priority | PASS | Enhances CSP (helmet), token rotation already implemented |
| III. Component-Driven UI & State Management | PASS | Zustand for debounce state, modular components |
| IV. Relational Data Integrity | PASS | No schema changes — only query modifications (remove COUNT) |
| V. Predictable RESTful API Design | PASS | 429 responses use existing error envelope |
| VI. Tiered Rate Limiting | PASS | This feature implements this principle |
| VII. File Upload Validation & Content Security | PASS | This feature implements this principle |
| VIII. Frontend Efficiency & Performance | PASS | This feature implements this principle |

**Gate Result**: ALL PASS — proceed to Phase 0.

## Project Structure

### Documentation (this feature)

```text
specs/001-rate-limit-security/
├── spec.md
├── plan.md
├── research.md
├── quickstart.md
├── contracts/
│   ├── rate-limit-api.md
│   ├── upload-validation.md
│   ├── csp-configuration.md
│   ├── like-debounce.md
│   └── pagination-fix.md
├── checklists/
│   └── requirements.md
└── tasks.md
```

### Source Code (repository root)

```text
server/
├── src/
│   ├── configs/
│   │   └── config.ts                    # Add Redis config, rate limit tier configs
│   ├── middlewares/
│   │   ├── auth.ts                      # Existing — no changes
│   │   ├── error.ts                     # Existing — no changes
│   │   └── rateLimiter.ts              # NEW — tiered rate limit middleware
│   ├── utilities/
│   │   ├── pagination.ts               # MODIFY — remove totalCount param
│   │   ├── response.ts                 # Existing — used for 429 envelope
│   │   └── uploadValidation.ts         # NEW — MIME magic-byte validation
│   ├── routes/
│   │   ├── index.ts                    # MODIFY — apply rate limiters
│   │   └── apis/
│   │       ├── upload.routes.ts        # MODIFY — add fileFilter + limits
│   │       ├── auth.routes.ts          # Existing — strict rate limiter applied at route group level in routes/index.ts
│   │       ├── posts.routes.ts         # MODIFY — apply content-creation limiter
│   │       └── comments.routes.ts      # MODIFY — apply content-creation limiter
│   ├── models/
│   │   ├── user.ts                     # MODIFY — remove COUNT(*) query
│   │   ├── post.ts                     # MODIFY — remove COUNT(*) query, add is_liked LEFT JOIN
│   │   └── follow.ts                   # MODIFY — remove COUNT(*) query
│   ├── controllers/
│   │   ├── posts.controller.ts         # MODIFY — embed is-liked in feed response, remove totalCount
│   │   ├── users.controller.ts         # MODIFY — remove totalCount from pagination calls
│   │   └── follows.controller.ts       # MODIFY — remove totalCount from pagination calls
│   ├── database/
│   │   └── redis.ts                    # NEW — Redis connection client
│   └── index.ts                        # MODIFY — CSP config, rate limiter setup
└── package.json                        # MODIFY — add new deps

client/
├── src/
│   ├── hooks/
│   │   └── useDebouncedLike.ts         # NEW — per-post debounce hook
│   ├── components/
│   │   └── post/                        # MODIFY — use debounce hook on like buttons (Post.tsx)
│   └── stores/
│       └── usePostStore.ts              # VERIFY — adapt to pagination response without totalCount
└── package.json                        # No new deps needed
```

**Structure Decision**: Existing web app structure (server/ + client/). New files are middleware, utilities, and hooks. No structural changes — only additions and modifications to existing files.

## Complexity Tracking

No constitution violations. No complexity justification needed.
