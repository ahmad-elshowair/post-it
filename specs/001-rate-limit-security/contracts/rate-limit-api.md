# Rate Limit API Contract
## Overview

Three tiers of rate limiting applied to the Express server via middleware, backed by Redis.

## Tiers
| Tier | Window | Max | Key | Applied To |
|---|---|---|---|---|
| Global | 60s (1 min) | 150 req | IP address | All routes |
| Auth | 900s (15 min) | 5 req | IP address | `/api/auth/login`, `/api/auth/register` |
| Content Creation | 60s (1 min) | 25 req | Authenticated user ID | POST/PUT/DELETE on posts, comments, likes |

## HTTP 429 Response Format
When a rate limit is exceeded, the response follows the existing standardized error envelope:
```json
{
  "success": false,
  "status": 429,
  "message": "Too many requests, please try again later",
  "error": {
    "retryAfter": 60
  }
}
```

**Headers**:
- `Retry-After: <seconds>` (set by express-rate-limit with `standardHeaders: true`)
- `RateLimit-Limit: <max>`
- `RateLimit-Remaining: <remaining>`
- `RateLimit-Reset: <timestamp>`

## Middleware Application Order
Rate limiters must be applied in `server/src/routes/index.ts` BEFORE the route handlers but AFTER CORS and helmet:
```typescript
import { globalLimiter, authLimiter, contentCreationLimiter } from '../middlewares/rateLimiter';

routes.use("/auth", authLimiter, authentication);   // Strict limiter only on auth routes
routes.use("/posts", globalLimiter, posts);           // Global limiter on all post routes
routes.use("/comments", globalLimiter, comments);    // Global limiter on comment routes
routes.use("/follows", globalLimiter, follows);       // Global limiter on follow routes
```

## Redis Configuration
- Connection URL from `REDIS_URL` env var
- Key prefix: `postit:ratelimit:` (configurable)
- Sliding window via `windowMs` parameter (trailing window, not fixed)

## Client Identity Resolution
- Express must be configured with `app.set('trust proxy', <level>)` appropriate for the deployment (e.g., `1` for a single reverse proxy like Nginx)
- Rate limiter `keyGenerator` uses `req.ip` which respects the `trust proxy` setting
- For `X-Forwarded-For`, the first (leftmost) IP is used as the client identity
- In development (no proxy), `req.ip` falls back to `req.connection.remoteAddress`

## Redis Failure Behavior
- **Strategy**: Fail-open — if Redis is unavailable, allow the request to proceed
- **Logging**: Log a structured error with source IP, endpoint, and `"rate-limit-store-unavailable"` reason
- **Rationale**: A Redis outage must not block all application traffic; rate limiting is a protective measure, not an availability gate
- **Reconnection**: ioredis handles automatic reconnection by default; no special retry logic needed in the rate limiter middleware

## Redis Zero-State Behavior
- On a fresh Redis instance with no existing counters, the first request from any client creates a new counter starting at 0
- No initialization or seed data is required — express-rate-limit creates keys on demand
- Counters expire automatically via Redis TTL set to the window duration
