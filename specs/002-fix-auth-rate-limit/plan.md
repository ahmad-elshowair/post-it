# Implementation Plan: Fix Auth Rate Limiter Blocking Legitimate Users

**Branch**: `002-fix-auth-rate-limit` | **Date**: 2026-04-04 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/002-fix-auth-rate-limit/spec.md`

## Summary

Replace the blanket `authLimiter` (5 req/15min) applied to all `/auth/*` routes with targeted per-route limiters: separate `loginLimiter` and `registerLimiter` instances (5 req/15min each, independent counters), a new `refreshLimiter` (30 req/min keyed by refresh token cookie hash), and remove rate limiting from `/auth/logout` and `/auth/is-authenticated` (global limiter only). This resolves the production bug where page refreshes consume brute-force protection quota, locking legitimate users out.

## Technical Context

**Language/Version**: TypeScript 5.x (strict mode), Node.js
**Primary Dependencies**: Express 4, express-rate-limit, rate-limit-redis, Redis, pg 8
**Storage**: Redis (rate limit counters), PostgreSQL (user data)
**Testing**: Deferred per constitution — manual verification via curl scripts in quickstart.md
**Target Platform**: Linux server (Node.js backend)
**Project Type**: Web service (REST API backend)
**Performance Goals**: Sub-50ms rate limit check overhead per request (Redis-backed)
**Constraints**: No downtime during migration — old Redis keys expire via TTL naturally
**Scale/Scope**: Single-server deployment, existing rate limit infrastructure

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Full-Stack TypeScript Strictness | PASS | Changes are TypeScript-only, no `any` types introduced |
| II. Security & Authentication Priority | PASS | Strengthens auth security by isolating brute-force protection to credential endpoints only |
| III. Component-Driven UI & State Management | N/A | Backend-only change |
| IV. Relational Data Integrity | N/A | No database schema changes |
| V. Predictable RESTful API Design | PASS | No API contract changes — same 429 response format, same endpoints |
| VI. Tiered Rate Limiting | PASS | Directly implements this principle — adds dedicated tiers per endpoint category with env-sourced config values |
| VII. File Upload Validation & Content Security | N/A | No file upload changes |
| VIII. Frontend Efficiency & Performance | N/A | No frontend changes |

**Gate Result**: ALL PASS — no violations. Proceed to Phase 0.

## Project Structure

### Documentation (this feature)

```text
specs/002-fix-auth-rate-limit/
├── plan.md              # This file
├── research.md          # Phase 0 output — complete
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output — complete
├── contracts/
│   └── rate-limit-api.md  # Phase 1 output — complete
├── checklists/
│   ├── requirements.md  # Spec quality checklist — complete
│   └── security.md      # Security requirements quality checklist — complete
└── tasks.md             # Phase 2 output (NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
server/
├── src/
│   ├── configs/
│   │   └── config.ts              # Add refresh limiter env vars
│   ├── middlewares/
│   │   └── rateLimiter.ts         # Replace authLimiter with loginLimiter, registerLimiter, refreshLimiter
│   ├── routes/
│   │   ├── index.ts               # Update limiter application: per-route instead of blanket /auth
│   │   └── apis/
│   │       └── auth.routes.ts     # No changes needed (route definitions unchanged)
│   └── index.ts                   # No changes needed
├── .env                           # Add RATE_LIMIT_REFRESH_WINDOW_MS, RATE_LIMIT_REFRESH_MAX
└── tests/                         # No automated tests (deferred per constitution)
```

**Structure Decision**: Single project (server/) — this is a backend-only middleware and configuration change. No frontend, mobile, or database migration files are involved.

## Security Implementation Details

### Middleware Application Order (FR-010)

Rate limit middleware runs **before** authentication middleware and **before** route handlers. This means:

1. The `refreshLimiter` checks rate limits keyed by the **hashed refresh token cookie value** — available before auth middleware runs. Since the limiter executes before token validation (FR-010), `req.user` is not yet populated. Keying by cookie hash provides per-user identity without requiring an authenticated session, and the hash is irreversible so the token itself is never stored in Redis.
2. The `loginLimiter` and `registerLimiter` run before any credential validation, so they protect against brute-force regardless of whether the submitted credentials are valid.

**Important**: The `limitHandler` uses `(req as any).user?.id` for logging. This MUST be changed to `(req as ICustomRequest).user?.id` to comply with Constitution Principle I (no `any` types without documented justification). All new limiters reuse this handler, so the fix applies universally.

### Security Logging (FR-009)

The `limitHandler` in `rateLimiter.ts` logs security events as structured JSON with:
- **type**: The tier that triggered the rejection (e.g., `LOGIN_LIMIT`, `REGISTER_LIMIT`, `REFRESH_LIMIT`, `GLOBAL_LIMIT`)
- **ip**: Client IP address
- **userId**: Authenticated user ID (if available) or `anonymous`
- **path**: The requested endpoint path

**Logged data exclusions**: Passwords, tokens (access or refresh), and request bodies are never included in security log output.

**Redis failure logging**: When `passOnStoreError: true` triggers fail-open (Redis unreachable), the `safeSendCommand` timeout error is caught silently, allowing the request through. The existing timeout mechanism (200ms race) ensures requests are not blocked by a downed Redis instance.

### Redis Reconnection Behavior

When Redis reconnects after an outage:
- `express-rate-limit` with `rate-limit-redis` creates a fresh store connection via `sendCommand`.
- Partial counters from before the outage are preserved in Redis (they are just key/value pairs with TTL).
- If Redis was completely flushed during the outage, all counters reset — this is acceptable because the fail-open strategy was already allowing unthrottled traffic during the outage.
- The maximum impact window of Redis unavailability is bounded by the longest rate limit window (15 minutes for auth). After that, all old counters would have expired anyway.

### NAT / Shared-IP Mitigation

- **Unauthenticated endpoints** (login, register): Keyed per IP. NAT collisions are a known limitation. The 5 req/15min window is conservative enough that occasional NAT collisions rarely block legitimate users.
- **Token refresh endpoint**: Keyed per refresh token cookie hash (not IP). This eliminates NAT collision risk because each user has a unique refresh token, even when sharing an IP. The hash is computed via `crypto.createHash('sha256').update(cookieValue).digest('hex')` — truncated to 16 chars for Redis key efficiency.
- **Content creation** (unchanged): Keyed per authenticated user ID. Eliminates NAT collision risk for logged-in users.

## Complexity Tracking

> No constitution violations to justify — all changes align with existing principles.

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| (none)    | —          | —                                    |
