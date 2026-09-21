import crypto from 'node:crypto';
import { generateRoomId } from '../utils/generateRoomId.js';

const rooms = new Map();

export function createRoomRecord({ playerName, maxPlayers = 5, rounds = 5 }) {
  const roomId = generateRoomId();
  const hostId = crypto.randomUUID();

  const room = {
    roomId,
    hostId,
    maxPlayers: Math.min(Math.max(maxPlayers, 2), 5),
    totalRounds: Math.max(rounds, 1),
    currentRound: 0,
    state: 'WAITING',
    players: [
      {
        playerId: hostId,
        displayName: playerName,
        score: 0,
        connected: false
      }
    ],
    usedLetters: []
  };

  rooms.set(roomId, room);
  return room;
}

export function getRoomRecord(roomId) {
  return rooms.get(String(roomId).toUpperCase());
}

export function addPlayer(roomId, player) {
  const room = getRoomRecord(roomId);
  if (!room) return null;
  room.players.push(player);
  return room;
}

export function removePlayer(roomId, playerId) {
  const room = getRoomRecord(roomId);
  if (!room) return null;
  room.players = room.players.filter((player) => player.playerId !== playerId);
  return room;
}
