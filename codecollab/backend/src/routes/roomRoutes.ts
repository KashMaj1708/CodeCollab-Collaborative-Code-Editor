import { Router, Request, Response } from 'express';
import { nanoid } from 'nanoid';
// --- THIS IS THE FIX ---
// Import the 'getRedisClient' function, not a default export
import { getRedisClient } from '../redisClient';

const router = Router();

router.post('/', async (req: Request, res: Response) => {
  // --- THIS IS THE OTHER FIX ---
  // Get the initialized Redis client from our function
  const redisClient = getRedisClient();
  
  let roomId;
  let isUnique = false;
  
  // Loop to ensure ID is unique
  while (!isUnique) {
    roomId = nanoid(7); // Generate a 7-character ID
    
    // Check if a Yjs doc with this name already exists in Redis
    // y-redis prefixes keys with "yjs:"
    const exists = await redisClient.exists(`yjs:${roomId}`);
    
    if (exists === 0) {
      isUnique = true;
    }
  }

  console.log(`[API] Created new room: ${roomId}`);
  res.status(201).json({ roomId });
});

export default router;