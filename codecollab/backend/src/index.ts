import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import http from 'http';
import { Server as WebSocketServer } from 'ws';
import { URL } from 'url';
const { setupWSConnection } = require('y-websocket/bin/utils');

// --- (Persistence) ---
import { RedisPersistence } from 'y-redis';
import { RedisOptions } from 'ioredis'; // Import ioredis types
// --- (End Persistence) ---

import roomRoutes from './routes/roomRoutes';
import executeRoutes from './routes/executeRoutes';

// Load .env only in development
if (process.env.NODE_ENV !== 'production') {
  dotenv.config();
}

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
// Declare the persistence variable
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
    persistence: {
      provider: redisPersistence,
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
    // 1. Get the Redis URL
    const redisUrl = process.env.REDIS_URL;
    if (!redisUrl) {
      throw new Error('FATAL: REDIS_URL environment variable is not set.');
    }

    // 2. Parse the URL into options for ioredis
    const url = new URL(redisUrl);
    const redisOpts: RedisOptions = {
      host: url.hostname,
      port: parseInt(url.port || '6379'),
      password: url.password,
      username: url.username || 'default',
      maxRetriesPerRequest: null,
    };
    
    // 3. Add TLS if the protocol is 'rediss:'
    if (url.protocol === 'rediss:') {
      redisOpts.tls = {}; // Enable TLS
    }
    
    console.log(`[Redis] y-redis is initializing connection to: ${redisOpts.host}`);

    // 4. Create the persistence provider, passing the *options*
    // This is what the library has wanted all along.
    redisPersistence = new RedisPersistence({ 
      redisOpts: redisOpts 
    });

    // 5. Start the server
    server.listen(port, () => {
      console.log(`🚀 Server (HTTP + WebSocket) listening at http://localhost:${port}`);
    });

  } catch (error: any) {
    console.error('Failed to start server:', error.message);
    process.exit(1); // Exit if Redis URL is missing
  }
};

// Call the start function to run the app
startServer();