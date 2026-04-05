# Research: Fix Auth Rate Limiter

**Feature Branch**: `002-fix-auth-rate-limit` | **Date**: 2026-04-04

## Decision 1: Separate Limiter Instances vs Shared with Per-Route Prefixes

- **Decision**: Use separate `rateLimit()` instances for login and register (one each), plus a new `refreshLimiter` instance.
- **Rationale**: Separate instances guarantee fully independent Redis counters via distinct key prefixes. A shared instance with per-route prefixes requires custom key generator logic and risks counter collision if misconfigured. The spec (FR-006) requires zero cross-contamination between login and register counters.
- **Alternatives considered**:
  - Single auth limiter with per-route Redis prefixes (`rl:auth:login:`, `rl:auth:register:`) — rejected because `express-rate-limit` applies one config per instance; separate instances are cleaner and match the existing pattern (each tier is already a separate instance).

## Decision 2: Refresh Limiter Key — Refresh Token Cookie Hash

- **Decision**: Key the refresh limiter by SHA-256 hash of the `refresh_token` cookie value (truncated to 16 hex chars), with fallback to IP when no cookie is present.
- **Rationale**: FR-010 mandates that the refresh limiter runs BEFORE token validation/auth middleware, meaning `req.user` is unavailable at that point. The refresh token cookie IS available in the request before auth middleware, so hashing it provides a stable per-user identifier without requiring authentication. The SHA-256 hash is one-way — the actual token is never stored in Redis. This prevents NAT collisions (each user has a unique refresh token) while satisfying both FR-002 (per-user identity, not per IP) and FR-010 (limiter before token validation).
- **Alternatives considered**:
  - Authenticated user ID from `req.user` — rejected because `req.user` is not populated when the limiter runs before auth middleware (FR-010).
  - IP-only key — rejected because NAT-shared users would collide on refresh counts.
  - Two-stage limiter (IP before auth, user ID after auth) — adds complexity for minimal additional security benefit.

## Decision 3: Refresh Threshold — 30 req/min

- **Decision**: 30 requests per 1-minute window per authenticated user.
- **Rationale**: A normal user triggers at most 1 refresh per 15-minute token expiry. Even aggressive tab-switching rarely exceeds 5 refreshes per minute. 30/min allows for pathological but legitimate client behavior (multiple tabs, rapid navigation) while blocking automated token refresh floods.
- **Alternatives considered**:
  - 20/min — too restrictive for users with many open tabs.
  - 50/min — too lenient to stop automated abuse effectively.

## Decision 4: Logout and Is-Authenticated Under Global Only

- **Decision**: No dedicated limiter for `/auth/logout` or `/auth/is-authenticated`. Both fall under the existing global limiter (150 req/min per IP).
- **Rationale**: Both endpoints are idempotent, require valid credentials, and pose low abuse risk. Adding dedicated limiters would increase complexity without meaningful security benefit. The global limiter already prevents extreme abuse.
- **Alternatives considered**:
  - Dedicated 60/min limiter for is-authenticated — over-engineering for a read-only endpoint.

## Decision 5: Config Approach for Refresh Threshold

- **Decision**: Add `RATE_LIMIT_REFRESH_WINDOW_MS` and `RATE_LIMIT_REFRESH_MAX` environment variables to `server/.env` and `server/src/configs/config.ts`, matching the existing pattern for global/auth/content tiers.
- **Rationale**: The constitution (Principle VI) mandates "Rate-limit configuration values MUST be sourced from environment variables." Adding dedicated env vars follows the established pattern.
- **Alternatives considered**:
  - Hardcode 30/60000 — violates constitution Principle VI.
