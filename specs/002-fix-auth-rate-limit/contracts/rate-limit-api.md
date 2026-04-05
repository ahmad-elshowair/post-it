# Rate Limit API Contract (Updated)

## Overview

Four tiers of rate limiting applied to the Express server via middleware, backed by Redis. This contract updates the original `001-rate-limit-security/contracts/rate-limit-api.md` to split the auth tier into targeted per-route application.

## Tiers

| Tier | Window | Max | Key | Applied To |
|---|---|---|---|---|
| Global | 60s (1 min) | 150 req | IP address | All routes (including `/auth/logout`, `/auth/is-authenticated`) |
| Auth — Login | 900s (15 min) | 5 req | IP address | `POST /api/auth/login` ONLY |
| Auth — Register | 900s (15 min) | 5 req | IP address | `POST /api/auth/register` ONLY |
| Refresh | 60s (1 min) | 30 req | SHA-256 hash of refresh_token cookie (fallback: IP) | `POST /api/auth/refresh-token` ONLY |
| Content Creation | 60s (1 min) | 25 req | Authenticated user ID | POST/PUT/DELETE on posts, comments (unchanged) |

## Key Changes from Previous Contract

| Aspect | Before | After |
|---|---|---|
| Auth limiter scope | All `/api/auth/*` routes (blanket) | `/api/auth/login` and `/api/auth/register` only |
| Refresh token limiter | Shared with auth (5/15min) | Dedicated tier (30/1min per cookie hash) |
| Logout limiter | Auth tier (5/15min) | Global tier only (150/1min) |
| Is-authenticated limiter | Auth tier (5/15min) | Global tier only (150/1min) |
| Login vs register counters | Shared single instance | Separate instances, independent counters |

## HTTP 429 Response Format

Unchanged from original contract — all 429 responses use the standardized error envelope:

```json
{
  "success": false,
  "status": 429,
  "message": "Too many requests, please try again later",
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "retry_after": 60
  }
}
```

**Headers**: `Retry-After`, `RateLimit-Limit`, `RateLimit-Remaining`, `RateLimit-Reset` (set by `standardHeaders: true`)

## Middleware Application Order

```typescript
import { globalLimiter, loginLimiter, registerLimiter, refreshLimiter } from '../middlewares/rateLimiter';

// Strict limiter on credential endpoints (brute-force protection)
routes.use("/auth/login", loginLimiter);
routes.use("/auth/register", registerLimiter);

// Dedicated refresh limiter (session maintenance)
routes.use("/auth/refresh-token", refreshLimiter);

// Global limiter for everything
routes.use(globalLimiter);

routes.use("/auth", authentication);
routes.use("/users", users);
routes.use("/posts", posts);
routes.use("/comments", comments);
routes.use("/follows", follows);
routes.use("/upload", uploadRouter);
```

## Redis Key Prefixes

| Limiter | Prefix |
|---|---|
| Global | `rl:global:` (unchanged) |
| Login | `rl:auth:login:` |
| Register | `rl:auth:register:` |
| Refresh | `rl:refresh:` |
| Content Creation | `rl:content:` (unchanged) |

Old `rl:auth:*` keys from the blanket limiter will expire via TTL. No manual cleanup required.

## Redis Failure Behavior

Unchanged — fail-open strategy with `passOnStoreError: true`.
