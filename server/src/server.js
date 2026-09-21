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
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || 'http://localhost:5173';

app.use(cors({ origin: CLIENT_ORIGIN }));
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', app: 'WordWars' });
});

app.use('/api/rooms', roomRoutes);

const io = new Server(server, {
  cors: {
    origin: CLIENT_ORIGIN,
    methods: ['GET', 'POST']
  }
});

registerSocketHandlers(io);

server.listen(PORT, () => {
  console.log(`WordWars server running on http://localhost:${PORT}`);
});
