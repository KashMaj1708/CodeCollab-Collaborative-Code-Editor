import Redis from 'ioredis';
import dotenv from 'dotenv';
console.log('[Debug] All env vars:', Object.keys(process.env));
console.log('[Debug] Looking for REDIS_URL:', process.env.REDIS_URL);
console.log('[Debug] Looking for redis_url:', process.env.redis_url);
// Run dotenv only if not in production
if (process.env.NODE_ENV !== 'production') {
  dotenv.config();
}

let redisClient: Redis | null = null;

/**
 * Initializes the Redis connection.
 * Throws an error if REDIS_URL is missing.
 */
export const initRedis = (): Redis => {
  if (redisClient) {
    return redisClient;
  }

  const redisUrl = process.env.REDIS_URL;
  console.log('[Redis] Initializing connection...');

  // --- THIS IS THE NEW FIX ---
  // We no longer check for NODE_ENV.
  // If the REDIS_URL is missing, we *always* throw an error.
  if (!redisUrl) {
    console.error('FATAL: REDIS_URL is not set in the environment.');
    console.error('Please ensure the REDIS_URL environment variable is set on your Render service.');
    throw new Error('REDIS_URL environment variable is not set.');
  }
  // --- END FIX ---


  // If we are here, TypeScript knows redisUrl is a string.
  redisClient = new Redis(redisUrl, {
    maxRetriesPerRequest: null, // Keep retrying
  });

  redisClient.on('error', (err) => {
    // This will log "ECONNREFUSED" if the URL is *wrong*,
    // but our check above handles if it's *missing*.
    console.error('[ioredis] Unhandled error event:', err.message);
  });

  redisClient.on('connect', () => {
    console.log('[ioredis] Successfully connected to Redis.');
  });

  return redisClient;
};

/**
 * Gets the already-initialized Redis client.
 */
export const getRedisClient = (): Redis => {
  if (!redisClient) {
    return initRedis();
  }
  return redisClient;
};