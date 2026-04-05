import { Request, Response } from 'express';
import rateLimit from 'express-rate-limit';
import { RedisStore } from 'rate-limit-redis';
import config from '../configs/config.js';
import redisClient from '../database/redis.js';
import { sendResponse } from '../utilities/response.js';
import { ICustomRequest } from '../interfaces/ICustomRequest.js';

/**
 * Helper: Send command with strict timeout to prevent hangs.
 * If Redis is down, the command is queued but our timeout will trigger first.
 */
const safeSendCommand = async (...args: string[]) => {
  const timeoutPromise = new Promise((_, reject) =>
    setTimeout(() => reject(new Error('Redis command timeout')), 200),
  );

  return Promise.race([
    // @ts-expect-error - ioredis and rate-limit-redis type mismatch
    redisClient.call(...args).catch(() => {}),
    timeoutPromise,
  ]);
};

/**
 * Standardized 429 Error Handler (SC-002: Structured Security Logging)
 */
const limitHandler = (req: Request, res: Response) => {
  const isAuthTier = req.path.includes('/auth');
  const type = isAuthTier ? 'AUTH_LIMIT' : 'GLOBAL_LIMIT';

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

/**
 * Global Rate Limiter (Tier 1)
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

/**
 * Auth Rate Limiter (Tier 2)
 */
export const authLimiter = rateLimit({
  windowMs: config.rate_limit_auth_window_ms,
  max: config.rate_limit_auth_max_requests,
  standardHeaders: true,
  legacyHeaders: false,
  passOnStoreError: true,
  store: new RedisStore({
    // @ts-expect-error - ioredis and rate-limit-redis type mismatch
    sendCommand: safeSendCommand,
    prefix: 'rl:auth:',
  }),
  handler: limitHandler,
});

/**
 * Content Creation Rate Limiter (Tier 3)
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
