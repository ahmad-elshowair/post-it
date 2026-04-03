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
