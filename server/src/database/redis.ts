import Redis from 'ioredis';
import config from '../configs/config.js';

const redisClient = new Redis.default(config.redisUrl, {
  maxRetriesPerRequest: null, // Required for rate-limit-redis compatibility
  retryStrategy(times: number) {
    if (times > 5) {
      console.warn('Redis: Backing off — will retry in 30s.');
      return 30_000;
    }
    return Math.min(times * 500, 5000);
  },
  lazyConnect: false,
});

let isRedisConnected = false;

redisClient.on('error', (err: Error) => {
  if (isRedisConnected) {
    console.error('Redis connection lost:', err.message);
    isRedisConnected = false;
  }
  // Suppress repeated ECONNREFUSED noise in dev
});

redisClient.on('connect', () => {
  isRedisConnected = true;
  console.log('Successfully connected to Redis');
});

redisClient.on('close', () => {
  if (isRedisConnected) {
    console.warn('Redis connection closed.');
    isRedisConnected = false;
  }
});

export { isRedisConnected };

export default redisClient;
