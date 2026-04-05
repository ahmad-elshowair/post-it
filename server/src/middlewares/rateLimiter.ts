import { Request, Response } from 'express';
import rateLimit from 'express-rate-limit';
import { RedisStore } from 'rate-limit-redis';
import { createHash } from 'node:crypto';
import config from '../configs/config.js';
import redisClient from '../database/redis.js';
import { sendResponse } from '../utilities/response.js';
import { ICustomRequest } from '../interfaces/ICustomRequest.js';

// ───── RATE LIMIT HELPERS ──────────────────────────────

/**
 * Send command with strict timeout to prevent hangs.
 * If Redis is down, the command is queued but our timeout will trigger first.
 */
const safeSendCommand = async (...args: string[]) => {
  const timeoutPromise = new Promise((_, reject) =>
    setTimeout(() => reject(new Error('Redis command timeout')), 200),
  );

  return Promise.race([
    // @ts-expect-error - ioredis and rate-limit-redis type mismatch
    redisClient.call(...args),
    timeoutPromise,
  ]).catch((err) => {
    console.warn(`[SECURITY_FAILOPEN] Redis store failure for rate limiter: ${err.message}`);
    throw err;
  });
};

/**
 * Handle standardized 429 Error (SC-002: Structured Security Logging).
 */
const limitHandler = (req: Request, res: Response) => {
  let type = 'GLOBAL_LIMIT';
  if (req.path.includes('/login')) type = 'LOGIN_LIMIT';
  else if (req.path.includes('/register')) type = 'REGISTER_LIMIT';
  else if (req.path.includes('/refresh-token')) type = 'REFRESH_LIMIT';

  console.warn(
    JSON.stringify({
      level: 'warn',
      message: 'Rate limit exceeded',
      type: type,
      ip: req.ip,
      userId: (req as ICustomRequest).user?.id || 'anonymous',
      path: req.path,
    }),
  );

  return sendResponse.error(res, 'Too many requests, please try again later.', 429, {
    code: 'RATE_LIMIT_EXCEEDED',
    retry_after: res.getHeader('Retry-After'),
  });
};

// ───── GLOBAL LIMITER ──────────────────────────────

/**
 * Limit requests globally (Tier 1).
 */
export const globalLimiter = rateLimit({
  windowMs: config.rate_limit_global_window_ms,
  max: config.rate_limit_global_max_requests,
  standardHeaders: true,
  legacyHeaders: false,
  passOnStoreError: true,
  store: new RedisStore({
    // @ts-expect-error - ioredis and rate-limit-redis type mismatch
    sendCommand: safeSendCommand,
    prefix: 'rl:global:',
  }),
  handler: limitHandler,
});

// ───── LOGIN LIMITER ──────────────────────────────

/**
 * Limit login requests for strict brute-force protection (5 req / 15 min per IP).
 */
export const loginLimiter = rateLimit({
  windowMs: config.rate_limit_auth_window_ms,
  max: config.rate_limit_auth_max_requests,
  standardHeaders: true,
  legacyHeaders: false,
  passOnStoreError: true,
  store: new RedisStore({
    // @ts-expect-error - ioredis and rate-limit-redis type mismatch
    sendCommand: safeSendCommand,
    prefix: 'rl:auth:login:',
  }),
  handler: limitHandler,
});

// ───── REGISTER LIMITER ──────────────────────────────

/**
 * Limit register requests for strict brute-force protection.
 * Independent counters from login limiter.
 */
export const registerLimiter = rateLimit({
  windowMs: config.rate_limit_auth_window_ms,
  max: config.rate_limit_auth_max_requests,
  standardHeaders: true,
  legacyHeaders: false,
  passOnStoreError: true,
  store: new RedisStore({
    // @ts-expect-error - ioredis and rate-limit-redis type mismatch
    sendCommand: safeSendCommand,
    prefix: 'rl:auth:register:',
  }),
  handler: limitHandler,
});

// ───── REFRESH LIMITER ──────────────────────────────

/**
 * Limit refresh token requests (30 req / 1 min per cookie hash).
 * Keyed by SHA-256 hash of refresh_token cookie (truncated to 16 hex chars).
 * Falls back to IP when no cookie is present.
 * Runs BEFORE auth middleware (FR-010).
 */
export const refreshLimiter = rateLimit({
  windowMs: config.rate_limit_refresh_window_ms,
  max: config.rate_limit_refresh_max_requests,
  standardHeaders: true,
  legacyHeaders: false,
  passOnStoreError: true,
  keyGenerator: (req: Request) => {
    const cookieValue = req.cookies?.refresh_token;
    if (cookieValue) {
      return createHash('sha256').update(cookieValue).digest('hex').slice(0, 16);
    }
    return req.ip || 'anonymous';
  },
  store: new RedisStore({
    // @ts-expect-error - ioredis and rate-limit-redis type mismatch
    sendCommand: safeSendCommand,
    prefix: 'rl:refresh:',
  }),
  handler: limitHandler,
});

// ───── CONTENT CREATION LIMITER ──────────────────────────────

/**
 * Limit content creation requests.
 */
export const contentCreationLimiter = rateLimit({
  windowMs: config.rate_limit_content_window_ms,
  max: config.rate_limit_content_max_requests,
  standardHeaders: true,
  legacyHeaders: false,
  passOnStoreError: true,
  validate: { keyGeneratorIpFallback: false },
  keyGenerator: (req: Request) => {
    const customReq = req as ICustomRequest;
    return customReq.user?.id || req.ip || 'anonymous';
  },
  store: new RedisStore({
    // @ts-expect-error - ioredis and rate-limit-redis type mismatch
    sendCommand: safeSendCommand,
    prefix: 'rl:content:',
  }),
  handler: (req: Request, res: Response) => {
    const customReq = req as ICustomRequest;
    console.warn(
      `[SECURITY_REJECTION] Type: CONTENT_LIMIT, IP: ${req.ip}, UserID: ${customReq.user?.id}, Path: ${req.path}, Reason: Content creation rate limit exceeded`,
    );

    return sendResponse.error(
      res,
      'Content creation limit exceeded. Please wait before posting again.',
      429,
      {
        code: 'CONTENT_LIMIT_EXCEEDED',
        retry_after: res.getHeader('Retry-After'),
      },
    );
  },
});
