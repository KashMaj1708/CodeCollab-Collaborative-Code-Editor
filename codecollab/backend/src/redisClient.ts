import { Redis } from 'ioredis';
import dotenv from 'dotenv';

dotenv.config();

const redisURL = process.env.REDIS_URL;

if (!redisURL) {
  console.error('Missing REDIS_URL environment variable.');
  process.exit(1);
}

// We use lazyConnect: true so the connection is only established
// when we first use it, not when the app starts.
const redisClient = new Redis(redisURL, { 
  lazyConnect: true,
  maxRetriesPerRequest: null, // Allow it to keep retrying
});

redisClient.on('connect', () => {
  console.log('🔗 Connected to Redis');
});

redisClient.on('error', (err) => {
  console.error('Redis connection error:', err);
});

export default redisClient;