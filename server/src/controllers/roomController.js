import crypto from 'node:crypto';
import { createRoomRecord, getRoomRecord, toPublicRoom } from '../services/roomService.js';

export function createRoom(req, res) {
  const { playerName, maxPlayers = 5, rounds = 5, roundSeconds = 45 } = req.body || {};
  const name = String(playerName || '').trim();

  if (!name) return res.status(400).json({ error: 'playerName is required.' });
  if (name.length > 24) return res.status(400).json({ error: 'Name must be 24 characters or fewer.' });

  const room = createRoomRecord({ playerName: name, maxPlayers, rounds, roundSeconds });
  return res.status(201).json({ roomId: room.roomId, playerId: room.hostId, room: toPublicRoom(room) });
}

export function getRoom(req, res) {
  const room = getRoomRecord(req.params.roomId);
  if (!room) return res.status(404).json({ error: 'Room not found.' });
  return res.json(toPublicRoom(room));
}

export function createPlayerId(_req, res) {
  res.json({ playerId: crypto.randomUUID() });
}
