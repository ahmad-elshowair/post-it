import redisClient from '../database/redis.js';

const PERMISSION_TTL_SECONDS = 300;
const KEY_PREFIX = 'rbac:perms:';

class PermissionCache {
  /**
   * Build the Redis key for a user's permission set.
   * @param userId - the user UUID
   * @returns the cache key
   */
  private buildKey(userId: string): string {
    return `${KEY_PREFIX}${userId}`;
  }

  /**
   * Retrieve cached permission names for a user.
   * @param userId - the user UUID
   * @returns permission names if cached, or null on cache miss
   */
  async get(userId: string): Promise<string[] | null> {
    try {
      const cached = await redisClient.get(this.buildKey(userId));
      if (!cached) {
        return null;
      }
      return JSON.parse(cached) as string[];
    } catch (error) {
      console.warn(`[PERMISSION CACHE] get failed for user ${userId}:`, (error as Error).message);
      return null;
    }
  }

  /**
   * Store a user's permission names in Redis with TTL.
   * @param userId - the user UUID
   * @param permissions - the effective permission set to cache
   */
  async set(userId: string, permissions: string[]): Promise<void> {
    try {
      await redisClient.setex(
        this.buildKey(userId),
        PERMISSION_TTL_SECONDS,
        JSON.stringify(permissions),
      );
    } catch (error) {
      console.warn(`[PERMISSION CACHE] set failed for user ${userId}:`, (error as Error).message);
    }
  }

  /**
   * Invalidate cached permissions for a single user.
   * @param userId - the user UUID whose cache to clear
   */
  async invalidate(userId: string): Promise<void> {
    try {
      await redisClient.del(this.buildKey(userId));
    } catch (error) {
      console.warn(
        `[PERMISSION CACHE] invalidate failed for user ${userId}:`,
        (error as Error).message,
      );
    }
  }

  /**
   * Invalidate cached permissions for multiple users at once.
   * @param userIds - user UUIDs whose caches to clear
   */
  async invalidateMany(userIds: string[]): Promise<void> {
    if (userIds.length === 0) return;

    try {
      const keys = userIds.map((id) => this.buildKey(id));
      await redisClient.del(...keys);
    } catch (error) {
      console.warn('[PERMISSION CACHE] invalidateMany failed:', (error as Error).message);
    }
  }

  /**
   * Invalidate all RBAC permission caches using SCAN (safe for production).
   * Use when roles or permissions are modified globally.
   */
  async invalidateAll(): Promise<void> {
    try {
      const stream = redisClient.scanStream({ match: `${KEY_PREFIX}*`, count: 100 });
      stream.on('data', (keys: string[]) => {
        if (keys.length > 0) {
          void redisClient.del(...keys);
        }
      });

      return new Promise((resolve, reject) => {
        stream.on('end', resolve);
        stream.on('error', (err: Error) => {
          console.warn('[PERMISSION CACHE] invalidateAll scan failed:', err.message);
          reject(err);
        });
      });
    } catch (error) {
      console.warn('[PERMISSION CACHE] invalidateAll failed:', (error as Error).message);
    }
  }
}

export default new PermissionCache();
