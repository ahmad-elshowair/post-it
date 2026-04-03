import Redis from 'ioredis';
import config from '../configs/config';

const redisClient = new Redis(config.redisUrl);

redisClient.on('error', (err) => {
  console.error('Redis connection error:', err);
  process.exit(1);
});

redisClient.on('connect', () => {
  console.log('Successfully connected to Redis');
});

export default redisClient;
