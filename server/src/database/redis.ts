import Redis from 'ioredis';
import config from '../configs/config.js';

const redisClient = new Redis.default(config.redisUrl);

redisClient.on('error', (err: Error) => {
  console.error('Redis connection error:', err);
  process.exit(1);
});

redisClient.on('connect', () => {
  console.log('Successfully connected to Redis');
});

export default redisClient;
