import Redis from 'ioredis';
import dotenv from 'dotenv';

// Only run dotenv in development
if (process.env.NODE_ENV !== 'production') {
  dotenv.config();
}

let redisClient: Redis | null = null;

/**
 * Initializes the Redis connection.
 * Throws an error if REDIS_URL is missing in production.
 */
export const initRedis = (): Redis => {
  if (redisClient) {
    return redisClient;
  }

  const redisUrl = process.env.REDIS_URL;
  console.log('[Redis] Initializing connection...');

  // --- THIS IS THE FIX ---
  // We check if the URL exists and call the constructor differently.
  if (redisUrl) {
    // URL exists, use it.
    redisClient = new Redis(redisUrl, {
      maxRetriesPerRequest: null, // Keep retrying
    });
  } else {
    // URL does not exist.
    if (process.env.NODE_ENV === 'production') {
      console.error('FATAL: REDIS_URL is not set in the environment.');
      throw new Error('REDIS_URL environment variable is not set.');
    } else {
      // In development, it's okay to have no URL.
      // Call with *no* URL to default to localhost:6379
      console.warn('REDIS_URL not set, defaulting to localhost:6379');
      redisClient = new Redis({
        maxRetriesPerRequest: null,
      });
    }
  }
  // --- END FIX ---

  redisClient.on('error', (err) => {
    // This is the error you were seeing
    console.error('[ioredis] Unhandled error event:', err.message);
  });

  redisClient.on('connect', () => {
    console.log('[ioredis] Successfully connected to Redis.');
  });

  return redisClient;
};

/**
 * Gets the already-initialized Redis client.
 * Will initialize if it hasn't been already.
 */
export const getRedisClient = (): Redis => {
  if (!redisClient) {
    // This will either initialize or throw an error if URL is missing
    return initRedis();
  }
  return redisClient;
};