import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import crypto from 'node:crypto';
import { Server } from 'socket.io';
import { io as connect } from 'socket.io-client';
import { registerSocketHandlers } from '../src/sockets/gameSocket.js';
import { createRoomRecord } from '../src/services/roomService.js';

function waitForEvent(socket, event, timeout = 4000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      socket.off(event, onEvent);
      reject(new Error('Timed out waiting for ' + event));
    }, timeout);

    const onEvent = (payload) => {
      clearTimeout(timer);
      socket.off(event, onEvent);
      resolve(payload);
    };

    socket.once(event, onEvent);
  });
}

test('two-player game flow, scoring, auth, and host transfer work', async (t) => {
  const httpServer = http.createServer();
  const ioServer = new Server(httpServer, { cors: { origin: '*' } });
  registerSocketHandlers(ioServer);

  await new Promise((resolve) => httpServer.listen(0, '127.0.0.1', resolve));
  const address = httpServer.address();
  const url = 'http://127.0.0.1:' + address.port;

  const room = createRoomRecord({ playerName: 'Host', maxPlayers: 2, rounds: 2, roundSeconds: 15 });
  const host = connect(url, { transports: ['websocket'], reconnection: false });
  const player2 = connect(url, { transports: ['websocket'], reconnection: false });

  t.after(async () => {
    host.disconnect();
    player2.disconnect();
    await new Promise((resolve) => ioServer.close(resolve));
    await new Promise((resolve) => httpServer.close(resolve));
  });

  const hostJoinPromise = waitForEvent(host, 'room:joined');
  host.emit('room:join', { roomId: room.roomId, playerId: room.hostId, playerToken: room.players[0].playerToken, displayName: 'Host' });
  const hostJoin = await hostJoinPromise;
  assert.equal(hostJoin.playerId, room.hostId);
  assert.ok(hostJoin.playerToken);

  const player2Id = crypto.randomUUID();
  const joinPromise = waitForEvent(player2, 'room:joined');
  player2.emit('room:join', { roomId: room.roomId, playerId: player2Id, playerToken: null, displayName: 'Player 2' });
  const player2Join = await joinPromise;
  assert.equal(player2Join.room.players.length, 2);
  assert.ok(player2Join.playerToken);

  const badStartPromise = waitForEvent(player2, 'error_message');
  player2.emit('room:start', { roomId: room.roomId, playerId: room.hostId });
  assert.equal((await badStartPromise).message, 'Only the host can start the game.');

  const starts = Promise.all([waitForEvent(host, 'round:started'), waitForEvent(player2, 'round:started')]);
  host.emit('room:start', { roomId: room.roomId, playerId: room.hostId });
  const started = await starts;
  const letter = started[0].letter;
  assert.match(letter, /^[A-Z]$/);

  const answers = { name: letter + 'man', place: letter + 'city', animal: letter + 'cat', thing: letter + 'box' };
  const hostEnded = waitForEvent(host, 'round:ended');
  const player2Ended = waitForEvent(player2, 'round:ended');
  host.emit('round:submit', { roomId: room.roomId, playerId: room.hostId, playerToken: null, round: 1, answers });
  player2.emit('round:submit', { roomId: room.roomId, playerId: player2Id, playerToken: null, round: 1, answers });

  const round1 = await hostEnded;
  await player2Ended;
  assert.equal(round1.results.validationMode, 'basic-fallback');
  assert.equal(round1.results.players.length, 2);
  assert.deepEqual(round1.results.players.map((p) => p.roundScore).sort((a, b) => a - b), [20, 20]);
  assert.equal(round1.results.players[0].breakdown.name.duplicate, true);

  const hostTransferPromise = waitForEvent(player2, 'room:state');
  host.disconnect();
  const transferred = await hostTransferPromise;
  assert.equal(transferred.hostId, player2Id);

  const round2Start = waitForEvent(player2, 'round:started');
  player2.emit('round:next', { roomId: room.roomId, playerId: player2Id });
  const round2 = await round2Start;
  assert.equal(round2.currentRound, 2);

  const finish2 = waitForEvent(player2, 'round:ended');
  const answer2 = { name: round2.letter + 'man', place: round2.letter + 'city', animal: round2.letter + 'cat', thing: round2.letter + 'box' };
  player2.emit('round:submit', { roomId: room.roomId, playerId: player2Id, round: 2, answers: answer2 });
  const final = await finish2;
  assert.equal(final.final, true);
  assert.equal(final.results.round, 2);
  assert.equal(final.room.state, 'FINISHED');

  const unauthenticatedAttempt = connect(url, { transports: ['websocket'], reconnection: false });
  t.after(() => unauthenticatedAttempt.disconnect());
  const unauthorized = waitForEvent(unauthenticatedAttempt, 'error_message');
  unauthenticatedAttempt.emit('room:join', { roomId: room.roomId, playerId: room.hostId, playerToken: null, displayName: 'Host' });
  assert.equal((await unauthorized).message, 'Invalid player session.');
});
