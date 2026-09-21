import { createRoomRecord, getRoomRecord } from '../services/roomService.js';

export function createRoom(req, res) {
  const { playerName, maxPlayers = 5, rounds = 5 } = req.body;

  if (!playerName?.trim()) {
    return res.status(400).json({ error: 'playerName is required' });
  }

  const room = createRoomRecord({
    playerName: playerName.trim(),
    maxPlayers: Number(maxPlayers),
    rounds: Number(rounds)
  });

  return res.status(201).json(room);
}

export function getRoom(req, res) {
  const room = getRoomRecord(req.params.roomId);

  if (!room) {
    return res.status(404).json({ error: 'Room not found' });
  }

  return res.json(room);
}
