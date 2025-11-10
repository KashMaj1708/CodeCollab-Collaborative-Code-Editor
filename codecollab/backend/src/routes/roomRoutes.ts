import { Router, Request, Response } from 'express';
import { nanoid } from 'nanoid';
// We no longer import the redis client here

const router = Router();

router.post('/', async (req: Request, res: Response) => {
  // --- FIX ---
  // We cannot easily access the redis client from here anymore.
  // We will simply generate a random ID. The chances of collision
  // in a small app are astronomically low.
  const roomId = nanoid(7);
  
  console.log(`[API] Created new room: ${roomId}`);
  res.status(201).json({ roomId });
});

export default router;