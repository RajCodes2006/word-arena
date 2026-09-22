import 'dotenv/config';
import http from 'http';
import cors from 'cors';
import express from 'express';
import { Server } from 'socket.io';
import roomRoutes from './routes/roomRoutes.js';
import { registerSocketHandlers } from './sockets/gameSocket.js';

const app = express();
const server = http.createServer(app);
const PORT = Number(process.env.PORT || 5000);
const clientOrigins = String(process.env.CLIENT_ORIGIN || 'http://localhost:5173')
  .split(',')
  .map((origin) => origin.trim().replace(/\/+$/, ''))
  .filter(Boolean);

const corsOptions = {
  origin: clientOrigins,
  methods: ['GET', 'POST'],
  credentials: true
};

app.use(cors(corsOptions));
app.use(express.json({ limit: '32kb' }));

app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    app: 'Word Arena',
    validation: process.env.GEMINI_API_KEY ? 'gemini-api' : 'validation-unavailable'
  });
});

app.use('/api/rooms', roomRoutes);

const io = new Server(server, { cors: corsOptions });
registerSocketHandlers(io);

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Word Arena server listening on port ${PORT}`);
});
