import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import http from 'http';
import { Server as WebSocketServer } from 'ws';
import { URL } from 'url';
const { setupWSConnection } = require('y-websocket/bin/utils');

// --- (Persistence) ---
import { RedisPersistence } from 'y-redis';
// Import our new functions, not the client instance
import { initRedis } from './redisClient'; 
// --- (End Persistence) ---

import roomRoutes from './routes/roomRoutes';
import executeRoutes from './routes/executeRoutes';

//dotenv.config();

const app = express();
const port = process.env.PORT || 5000;

app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173'
}));
app.use(express.json());

app.get('/', (req: Request, res: Response) => {
  res.send('CodeCollab Backend is running!');
});
app.use('/api/rooms', roomRoutes);
app.use('/api/execute', executeRoutes);

const server = http.createServer(app);

const wss = new WebSocketServer({ noServer: true });

const YJS_WEBSOCKET_PATH = '/yjs-ws';

// --- (Persistence) ---
// Declare the persistence variable, but don't initialize it
let redisPersistence: RedisPersistence;
// --- (End Persistence) ---


wss.on('connection', (ws: any, req: any) => {
  const url = new URL(req.url || '', `http://${req.headers.host}`);
  const roomName = url.pathname.split('/').pop();

  if (!roomName) {
    console.warn('[WebSocket] Connection attempt without room name.');
    ws.close(1000, 'No room specified');
    return;
  }
  
  console.log(`[WebSocket] User connected to room: ${roomName}`);

  setupWSConnection(ws, req, { 
    roomName: roomName,
    
    // --- (Persistence) ---
    // Pass the persistence provider
    persistence: {
      provider: redisPersistence, // This will be initialized by the time we connect
      bindState: true 
    }
    // --- (End Persistence) ---
  });
});

server.on('upgrade', (request: any, socket: any, head: any) => {
  const url = new URL(request.url || '', `http://${request.headers.host}`);

  if (url.pathname.startsWith(YJS_WEBSOCKET_PATH)) {
    wss.handleUpgrade(request, socket, head, (ws: any) => {
      wss.emit('connection', ws, request);
    });
  } else {
    socket.destroy();
  }
});

// --- NEW SERVER START FUNCTION ---
const startServer = () => {
  try {
    const redisClient = initRedis(); // Keep this for your own use
    
    // Parse Redis URL for RedisPersistence config
    const redisUrl = new URL(process.env.REDIS_URL!);
    
    redisPersistence = new RedisPersistence({
      redis: {
        host: redisUrl.hostname,
        port: parseInt(redisUrl.port || '6379'),
        password: redisUrl.password,
        username: redisUrl.username || 'default',
        tls: redisUrl.protocol === 'rediss:' ? {} : undefined,
      }
    } as any);

    server.listen(port, () => {
      console.log(`🚀 Server (HTTP + WebSocket) listening at http://localhost:${port}`);
    });

  } catch (error: any) {
    console.error('Failed to start server:', error.message);
    process.exit(1);
  }
};

// Call the start function to run the app
startServer();