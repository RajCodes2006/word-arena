import crypto from 'node:crypto';
import { generateRoomId } from '../utils/generateRoomId.js';

const rooms = new Map();
const ROOM_IDLE_MS = 30 * 60 * 1000;

function clamp(value, min, max) {
  return Math.min(Math.max(Number(value) || min, min), max);
}

function cleanName(value) {
  return String(value ?? '').trim().replace(/\s+/g, ' ').slice(0, 24);
}

export function createRoomRecord({
  playerName,
  maxPlayers = 5,
  rounds = 5,
  roundSeconds = 45
}) {
  let roomId = generateRoomId();
  while (rooms.has(roomId)) roomId = generateRoomId();

  const hostId = crypto.randomUUID();
  const room = {
    roomId,
    hostId,
    maxPlayers: clamp(maxPlayers, 2, 5),
    totalRounds: clamp(rounds, 1, 10),
    roundSeconds: clamp(roundSeconds, 15, 120),
    currentRound: 0,
    state: 'WAITING',
    currentLetter: null,
    roundEndsAt: null,
    usedLetters: [],
    players: [
      {
        playerId: hostId,
        playerToken: crypto.randomUUID(),
        displayName: cleanName(playerName),
        score: 0,
        connected: false,
        socketId: null,
        submitted: false
      }
    ],
    submissions: new Map(),
    drafts: new Map(),
    results: null,
    timer: null,
    lifecycleTimer: null,
    ending: false
  };

  room.lifecycleTimer = setTimeout(() => {
    if (room.state === 'WAITING') deleteRoom(room.roomId);
  }, ROOM_IDLE_MS);
  room.lifecycleTimer.unref?.();

  rooms.set(roomId, room);
  return room;
}

export function getRoomRecord(roomId) {
  return rooms.get(String(roomId ?? '').trim().toUpperCase());
}

export function findPlayer(room, playerId) {
  if (!room || !playerId) return null;
  return room.players.find((player) => player.playerId === playerId) || null;
}

export function findPlayerBySocketId(socketId) {
  for (const room of rooms.values()) {
    const player = room.players.find((entry) => entry.socketId === socketId);
    if (player) return { room, player };
  }
  return null;
}

export function addPlayer(roomId, { playerId, displayName }) {
  const room = getRoomRecord(roomId);
  if (!room) return { ok: false, error: 'Room not found.' };

  const normalizedId = String(playerId || '').trim();
  const normalizedName = cleanName(displayName);

  if (!normalizedId) return { ok: false, error: 'Player ID is required.' };
  if (!normalizedName) return { ok: false, error: 'Display name is required.' };

  // A reconnecting player is allowed back even when the room is currently full.
  const existing = findPlayer(room, normalizedId);
  if (existing) {
    if (existing.displayName.toLowerCase() !== normalizedName.toLowerCase()) {
      const duplicateName = room.players.some(
        (player) =>
          player.playerId !== existing.playerId &&
          player.displayName.toLowerCase() === normalizedName.toLowerCase()
      );
      if (duplicateName) {
        return { ok: false, error: 'That display name is already in use.' };
      }
      existing.displayName = normalizedName;
    }
    return { ok: true, player: existing };
  }

  if (room.players.length >= room.maxPlayers) return { ok: false, error: 'Room is full.' };

  const duplicateName = room.players.some(
    (player) => player.displayName.toLowerCase() === normalizedName.toLowerCase()
  );
  if (duplicateName) return { ok: false, error: 'That display name is already in use.' };

  const player = {
    playerId: normalizedId,
    playerToken: crypto.randomUUID(),
    displayName: normalizedName,
    score: 0,
    connected: false,
    socketId: null,
    submitted: false
  };

  room.players.push(player);
  return { ok: true, player };
}

export function attachPlayer(roomId, playerId, socketId) {
  const room = getRoomRecord(roomId);
  const player = findPlayer(room, playerId);
  if (!room || !player) return null;

  player.socketId = socketId;
  player.connected = true;
  return player;
}

export function detachPlayer(socketId) {
  const match = findPlayerBySocketId(socketId);
  if (!match) return null;

  match.player.connected = false;
  match.player.socketId = null;
  return match;
}

export function removePlayer(roomId, playerId) {
  const room = getRoomRecord(roomId);
  if (!room) return null;

  room.players = room.players.filter((player) => player.playerId !== playerId);
  room.submissions.delete(playerId);
  room.drafts.delete(playerId);
  return room;
}

export function deleteRoom(roomId) {
  const room = getRoomRecord(roomId);
  if (!room) return false;

  if (room.timer) clearTimeout(room.timer);
  if (room.lifecycleTimer) clearTimeout(room.lifecycleTimer);
  return rooms.delete(room.roomId);
}

export function electNewHost(room) {
  if (!room) return null;
  const currentHost = findPlayer(room, room.hostId);

  if (currentHost?.connected) return currentHost;

  const replacement = room.players.find((player) => player.connected);
  if (replacement) room.hostId = replacement.playerId;
  return replacement || null;
}

export function getConnectedPlayers(room) {
  return room?.players.filter((player) => player.connected) || [];
}

export function toPublicRoom(room) {
  if (!room) return null;

  return {
    roomId: room.roomId,
    hostId: room.hostId,
    maxPlayers: room.maxPlayers,
    totalRounds: room.totalRounds,
    roundSeconds: room.roundSeconds,
    currentRound: room.currentRound,
    state: room.state,
    currentLetter: room.currentLetter,
    roundEndsAt: room.roundEndsAt,
    players: room.players.map((player) => ({
      playerId: player.playerId,
      displayName: player.displayName,
      score: player.score,
      connected: player.connected,
      submitted: player.submitted
    }))
  };
}
