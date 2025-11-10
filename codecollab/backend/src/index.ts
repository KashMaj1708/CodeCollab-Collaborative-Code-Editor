import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import http from 'http';
import { Server as WebSocketServer } from 'ws';
import { URL } from 'url';
const { setupWSConnection } = require('y-websocket/bin/utils');

// --- (Persistence) ---
// FIX: Correct class name is RedisPersistence
import { RedisPersistence } from 'y-redis'; 
import redisClient from './redisClient'; // Import our existing ioredis client
// --- (End Persistence) ---

import roomRoutes from './routes/roomRoutes';
import executeRoutes from './routes/executeRoutes';

dotenv.config();

const app = express();
const port = process.env.PORT || 5000;

app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173'
}));
app.use(express.json());

app.get('/', (req, res) => {
  res.send('CodeCollab Backend is running!');
});
app.use('/api/rooms', roomRoutes);
app.use('/api/execute', executeRoutes);

const server = http.createServer(app);

const wss = new WebSocketServer({ noServer: true });

const YJS_WEBSOCKET_PATH = '/yjs-ws';

// --- (Persistence) ---
// FIX: Correct class name is RedisPersistence
const redisPersistence = new RedisPersistence(redisClient as any);
// --- (End Persistence) ---


wss.on('connection', (ws, req) => {
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
      provider: redisPersistence,
      bindState: true // Bind Yjs doc to Redis
    }
    // --- (End Persistence) ---
  });
});

server.on('upgrade', (request, socket, head) => {
  const url = new URL(request.url || '', `http://${request.headers.host}`);

  if (url.pathname.startsWith(YJS_WEBSOCKET_PATH)) {
    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit('connection', ws, request);
    });
  } else {
    socket.destroy();
  }
});

server.listen(port, () => {
  console.log(`🚀 Server (HTTP + WebSocket) listening at http://localhost:${port}`);
});