import { Router, Request, Response } from 'express';
import { nanoid } from 'nanoid';
import redisClient from '../redisClient';

const router = Router();

// POST /api/rooms - Create a new collaborative room
router.post('/', async (req: Request, res: Response) => {
  try {
    // Generate a unique 8-character room ID
    const roomId = nanoid(8); 

    // As per the spec, we store a "presence" key to track rooms.
    // We'll set an expiration of 24 hours (86400 seconds)
    // The value 'created' is just a placeholder.
    await redisClient.set(`room:${roomId}:presence`, 'created', 'EX', 86400);

    // Later, we will also store the Yjs document here.
    // For now, this is enough to "create" the room.

    console.log(`[Server] Room created: ${roomId}`);

    // Return the new room ID to the client
    res.status(201).json({ roomId });

  } catch (error) {
    console.error('Error creating room:', error);
    res.status(500).json({ message: 'Error creating room', error });
  }
});

export default router;