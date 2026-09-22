import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import express from 'express';
import roomRoutes from '../src/routes/roomRoutes.js';

test('room HTTP API creates rooms and never exposes player tokens', async (t) => {
  const app = express();
  app.use(express.json());
  app.use('/api/rooms', roomRoutes);
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  const base = 'http://127.0.0.1:' + address.port;

  t.after(async () => {
    await new Promise((resolve) => server.close(resolve));
  });

  const createdResponse = await fetch(base + '/api/rooms', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ playerName: '  Raj   Kumar  ', maxPlayers: 5, rounds: 2, roundSeconds: 30 })
  });
  assert.equal(createdResponse.status, 201);
  const created = await createdResponse.json();
  assert.match(created.roomId, /^WW-[A-Z0-9]{6}$/);
  assert.ok(created.playerId);
  assert.ok(created.playerToken);
  assert.equal(created.room.players[0].playerToken, undefined);
  assert.equal(created.room.players[0].displayName, 'Raj Kumar');

  const fetchedResponse = await fetch(base + '/api/rooms/' + encodeURIComponent(created.roomId));
  assert.equal(fetchedResponse.status, 200);
  const fetched = await fetchedResponse.json();
  assert.equal(fetched.roomId, created.roomId);
  assert.equal(fetched.players[0].playerToken, undefined);
});

test('room HTTP API validates player names', async (t) => {
  const app = express();
  app.use(express.json());
  app.use('/api/rooms', roomRoutes);
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  const base = 'http://127.0.0.1:' + address.port;
  t.after(async () => { await new Promise((resolve) => server.close(resolve)); });

  const missing = await fetch(base + '/api/rooms', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ playerName: '   ' })
  });
  assert.equal(missing.status, 400);

  const tooLong = await fetch(base + '/api/rooms', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ playerName: 'A'.repeat(25) })
  });
  assert.equal(tooLong.status, 400);
});
