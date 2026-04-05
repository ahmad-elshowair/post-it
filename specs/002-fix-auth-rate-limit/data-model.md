# Data Model: Fix Auth Rate Limiter

**Feature Branch**: `002-fix-auth-rate-limit` | **Date**: 2026-04-04

## Overview

This feature involves no database schema changes. The "data model" here describes the rate limit tier entities and their Redis key/value structure. All entities are in-memory/Redis constructs managed by `express-rate-limit` with `rate-limit-redis`.

## Entities

### Entity: Rate Limit Tier (Configuration)

Each tier is defined by environment variables consumed in `server/src/configs/config.ts` and instantiated in `server/src/middlewares/rateLimiter.ts`.

| Field | Type | Source | Validation |
|-------|------|--------|------------|
| window_ms | number (ms) | `process.env.RATE_LIMIT_*_WINDOW_MS` | > 0, integer |
| max_requests | number | `process.env.RATE_LIMIT_*_MAX` | > 0, integer |

**Instances**:

| Instance | window_ms Default | max_requests Default | Redis Prefix | Key Generator |
|----------|-------------------|---------------------|--------------|---------------|
| globalLimiter | 60000 (1 min) | 150 | `rl:global:` | IP address |
| loginLimiter | 900000 (15 min) | 5 | `rl:auth:login:` | IP address |
| registerLimiter | 900000 (15 min) | 5 | `rl:auth:register:` | IP address |
| refreshLimiter | 60000 (1 min) | 30 | `rl:refresh:` | SHA-256 hash of refresh_token cookie (fallback: IP) |
| contentCreationLimiter | 60000 (1 min) | 25 | `rl:content:` | Authenticated user ID (unchanged) |

### Entity: Redis Rate Limit Counter

Each counter is a Redis key with TTL managed by `express-rate-limit`.

| Field | Type | Description |
|-------|------|-------------|
| key | string | Pattern: `{prefix}{identifier}` (e.g., `rl:auth:login:192.168.1.1`, `rl:refresh:a1b2c3d4e5f6g7h8`) |
| value | number | Current request count within the window |
| ttl | number (seconds) | Remaining time in the rate limit window |

**Key format examples**:

```text
rl:global:127.0.0.1                    # Global tier, IP-based
rl:auth:login:127.0.0.1                # Login attempts, IP-based
rl:auth:register:127.0.0.1             # Registration attempts, IP-based
rl:refresh:a1b2c3d4e5f6g7h8            # Token refresh, cookie-hash-based
rl:content:user-42                     # Content creation, user ID-based (unchanged)
```

### Entity: Rate Limit Config (Environment Variables)

New environment variables to add to `server/.env`:

| Variable | Default | Description |
|----------|---------|-------------|
| `RATE_LIMIT_REFRESH_WINDOW_MS` | `60000` | Refresh limiter window in milliseconds |
| `RATE_LIMIT_REFRESH_MAX` | `30` | Max refresh requests per window |

New config keys to add to `server/src/configs/config.ts`:

| Config Key | Env Var | Default |
|------------|---------|---------|
| `rate_limit_refresh_window_ms` | `RATE_LIMIT_REFRESH_WINDOW_MS` | `60000` |
| `rate_limit_refresh_max_requests` | `RATE_LIMIT_REFRESH_MAX` | `30` |

## Relationships

```text
┌─────────────────────┐
│   Route Registration │  (server/src/routes/index.ts)
│                     │
│  /auth/login    ────┼──► loginLimiter
│  /auth/register ────┼──► registerLimiter
│  /auth/refresh  ────┼──► refreshLimiter
│  /auth/logout       │──► (globalLimiter only)
│  /auth/is-authed    │──► (globalLimiter only)
│  * (all routes)    ─┼──► globalLimiter
│                     │
│  posts/comments  ───┼──► contentCreationLimiter (unchanged)
└─────────────────────┘
```

## State Transitions

### Rate Limit Counter Lifecycle

```text
[No Key] ──first request──► [Key Created, count=1, TTL=window_ms]
              │
         subsequent requests (count < max)
              │
              ▼
         [count incremented, TTL refreshed]
              │
         count >= max
              │
              ▼
         [429 response returned, count stays at max]
              │
         TTL expires
              │
              ▼
         [Key auto-deleted by Redis, counter resets]
```

### Migration: Old authLimiter → New Per-Route Limiters

```text
Old keys: rl:auth:{IP}                     ← Will expire via TTL (no manual cleanup)
New keys: rl:auth:login:{IP}               ← Created on first login request
          rl:auth:register:{IP}            ← Created on first register request
          rl:refresh:{cookie-hash-16chars}  ← Created on first refresh request (SHA-256 of cookie, truncated)
```

**Migration strategy**: Zero-downtime. Old `rl:auth:*` keys naturally expire within 15 minutes of their last update. No data migration, no Redis FLUSH, no downtime.

## Validation Rules

1. **Environment variables**: All `RATE_LIMIT_*_WINDOW_MS` must be positive integers. All `RATE_LIMIT_*_MAX` must be positive integers.
2. **Redis key isolation**: Each limiter instance MUST use a distinct prefix — no prefix collision between tiers (validated by design: `rl:global:`, `rl:auth:login:`, `rl:auth:register:`, `rl:refresh:`, `rl:content:`).
3. **Independent counters**: Login and register limiters use separate instances with separate prefixes — zero counter cross-contamination by design.
4. **Refresh limiter key**: MUST key by SHA-256 hash of the `refresh_token` cookie value (truncated to 16 hex chars for key efficiency), falling back to IP if no cookie is present. This ensures per-user identity is available before auth middleware runs (FR-010), and the hash prevents the actual token from being stored in Redis.
