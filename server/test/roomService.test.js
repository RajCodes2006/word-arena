import test from 'node:test';
import assert from 'node:assert/strict';
import {
  addPlayer,
  attachPlayer,
  createRoomRecord,
  toPublicRoom
} from '../src/services/roomService.js';

test('room settings are clamped and host receives a private token', () => {
  const room = createRoomRecord({
    playerName: 'Raj',
    maxPlayers: 99,
    rounds: 0,
    roundSeconds: 999
  });

  assert.equal(room.maxPlayers, 5);
  assert.equal(room.totalRounds, 1);
  assert.equal(room.roundSeconds, 120);
  assert.equal(room.players.length, 1);
  assert.ok(room.players[0].playerToken);
  assert.equal(room.players[0].displayName, 'Raj');

  const publicRoom = toPublicRoom(room);
  assert.equal(publicRoom.players[0].playerToken, undefined);
});

test('players cannot reuse a display name case-insensitively', () => {
  const room = createRoomRecord({ playerName: 'Raj' });
  const first = addPlayer(room.roomId, {
    playerId: 'player-2',
    displayName: 'Alex'
  });
  const duplicate = addPlayer(room.roomId, {
    playerId: 'player-3',
    displayName: ' alex '
  });

  assert.equal(first.ok, true);
  assert.equal(duplicate.ok, false);
  assert.equal(duplicate.error, 'That display name is already in use.');
});

test('attachPlayer marks the player connected and binds socket id', () => {
  const room = createRoomRecord({ playerName: 'Raj' });
  const result = attachPlayer(room.roomId, room.hostId, 'socket-123');

  assert.equal(result.connected, true);
  assert.equal(result.socketId, 'socket-123');
});
