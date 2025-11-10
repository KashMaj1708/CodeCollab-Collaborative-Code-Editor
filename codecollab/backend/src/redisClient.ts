import Redis, { RedisOptions } from 'ioredis'; // <-- Import RedisOptions
import dotenv from 'dotenv';
import { URL } from 'url'; // Make sure URL is imported

// Load dotenv in non-production environments
if (process.env.NODE_ENV !== 'production') {
  dotenv.config();
}

let redisClient: Redis | null = null;

export const initRedis = (): Redis => {
  if (redisClient) {
    return redisClient;
  }

  const redisUrl = process.env.REDIS_URL;
  console.log('[Redis] Initializing connection...');

  if (!redisUrl) {
    console.error('FATAL: REDIS_URL is not set in the environment.');
    throw new Error('REDIS_URL environment variable is not set.');
  }

  try {
    // Parse the Upstash URL manually
    const url = new URL(redisUrl);
    
    // --- THIS IS THE FIX ---
    // 1. Create the base options object
    const redisOptions: RedisOptions = {
      host: url.hostname,
      port: parseInt(url.port || '6379'),
      password: url.password,
      username: url.username || 'default',
      maxRetriesPerRequest: null,
      retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        console.log(`[Redis] Retry attempt ${times}, waiting ${delay}ms`);
        return delay;
      },
    };

    // 2. Conditionally add the tls property if the protocol is rediss:
    if (url.protocol === 'rediss:') {
      redisOptions.tls = {}; // This enables TLS
    }

    // 3. Create the client with the fully built options
    redisClient = new Redis(redisOptions);
    // --- END FIX ---

    console.log('[Redis] Connecting to:', url.hostname);

    redisClient.on('error', (err) => {
      console.error('[Redis] Connection error:', err.message);
    });

    redisClient.on('connect', () => {
      console.log('[Redis] Successfully connected to Redis at', url.hostname);
    });

    redisClient.on('ready', () => {
      console.log('[Redis] Redis client ready');
    });

  } catch (error) {
    console.error('[Redis] Failed to create Redis client:', error);
    throw error;
  }

  return redisClient;
};

export const getRedisClient = (): Redis => {
  if (!redisClient) {
    return initRedis();
  }
  return redisClient;
};