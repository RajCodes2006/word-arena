import {
  addPlayer,
  attachPlayer,
  detachPlayer,
  electNewHost,
  findPlayer,
  getConnectedPlayers,
  getRoomRecord,
  deleteRoom,
  removePlayer,
  toPublicRoom
} from '../services/roomService.js';
import {
  calculateRoundResults,
  leaderboard,
  normalizeAnswer,
  pickRandomLetter
} from '../services/gameService.js';
import { validateAllSubmissions } from '../services/validationService.js';

const CATEGORIES = ['name', 'place', 'animal', 'thing'];

function emitRoom(io, room, event = 'room:state') {
  io.to(room.roomId).emit(event, toPublicRoom(room));
}

function getAuthenticatedPlayer(room, playerId, socket) {
  const player = room && findPlayer(room, playerId);
  if (!player || !player.connected || player.socketId !== socket.id) return null;
  return player;
}

function sanitizeAnswers(answers) {
  return Object.fromEntries(
    CATEGORIES.map((category) => [
      category,
      normalizeAnswer(answers?.[category]).slice(0, 80)
    ])
  );
}

function startRound(io, room) {
  if (room.timer) clearTimeout(room.timer);
  if (room.lifecycleTimer) {
    clearTimeout(room.lifecycleTimer);
    room.lifecycleTimer = null;
  }

  room.currentLetter = pickRandomLetter(room.usedLetters);
  room.usedLetters.push(room.currentLetter);
  room.currentRound += 1;
  room.state = 'PLAYING';
  room.results = null;
  room.submissions = new Map();
  room.drafts = new Map();
  room.ending = false;

  room.players.forEach((player) => {
    player.submitted = false;
  });

  const serverNow = Date.now();
  room.roundEndsAt = serverNow + room.roundSeconds * 1000;

  io.to(room.roomId).emit('round:started', {
    room: toPublicRoom(room),
    letter: room.currentLetter,
    currentRound: room.currentRound,
    totalRounds: room.totalRounds,
    serverNow,
    roundEndsAt: room.roundEndsAt
  });

  room.timer = setTimeout(() => {
    finishRound(io, room).catch((error) => {
      console.error('Round finish error:', error);
      const safeResults = calculateRoundResults({
        players: room.players,
        submissions: room.submissions,
        validations: new Map()
      });

      room.results = {
        round: room.currentRound,
        letter: room.currentLetter,
        validationMode: 'basic-fallback',
        players: safeResults
      };

      room.players.forEach((player) => {
        const result = safeResults.find((entry) => entry.playerId === player.playerId);
        player.score = result?.totalScore ?? player.score;
        player.submitted = true;
      });

      room.state = room.currentRound >= room.totalRounds ? 'FINISHED' : 'RESULTS';
      room.roundEndsAt = null;
      room.ending = false;
      room.drafts = new Map();

      const payload = {
        room: toPublicRoom(room),
        results: room.results,
        leaderboard: leaderboard(room.players),
        final: room.state === 'FINISHED'
      };

      if (payload.final) {
        room.lifecycleTimer = setTimeout(() => {
          deleteRoom(room.roomId);
        }, 30 * 60 * 1000);
      }

      io.to(room.roomId).emit('error_message', {
        message: 'Validation service failed. Basic fallback scoring was used.'
      });
      io.to(room.roomId).emit('round:ended', payload);
      if (payload.final) io.to(room.roomId).emit('game:finished', payload);
    });
  }, room.roundSeconds * 1000 + 100);
}

async function finishRound(io, room) {
  if (!room || room.ending || room.state !== 'PLAYING') return;

  room.ending = true;
  if (room.timer) clearTimeout(room.timer);
  room.timer = null;

  // A player may type answers without pressing "Lock My Answers".
  // Drafts are kept on the server and become the submission at timeout.
  const effectiveSubmissions = new Map(room.drafts);
  for (const [playerId, answers] of room.submissions.entries()) {
    effectiveSubmissions.set(playerId, answers);
  }
  room.submissions = effectiveSubmissions;

  const { validations, mode } = await validateAllSubmissions({
    letter: room.currentLetter,
    submissions: room.submissions
  });

  const roundResults = calculateRoundResults({
    players: room.players,
    submissions: room.submissions,
    validations
  });

  const resultById = new Map(
    roundResults.map((result) => [result.playerId, result])
  );

  room.players.forEach((player) => {
    const result = resultById.get(player.playerId);
    player.score = result?.totalScore ?? player.score;
    player.submitted = true;
  });

  room.results = {
    round: room.currentRound,
    letter: room.currentLetter,
    validationMode: mode,
    players: roundResults
  };

  room.state =
    room.currentRound >= room.totalRounds ? 'FINISHED' : 'RESULTS';
  room.roundEndsAt = null;
  room.ending = false;
  room.drafts = new Map();

  const payload = {
    room: toPublicRoom(room),
    results: room.results,
    leaderboard: leaderboard(room.players),
    final: room.state === 'FINISHED'
  };

  if (payload.final) {
    room.lifecycleTimer = setTimeout(() => {
      deleteRoom(room.roomId);
    }, 30 * 60 * 1000);
    room.lifecycleTimer.unref?.();
  }

  io.to(room.roomId).emit('round:ended', payload);
  if (payload.final) io.to(room.roomId).emit('game:finished', payload);
}

export function registerSocketHandlers(io) {
  io.on('connection', (socket) => {
    socket.on('room:join', ({ roomId, playerId, playerToken, displayName }) => {
      const room = getRoomRecord(roomId);
      if (!room) {
        return socket.emit('error_message', { message: 'Room not found.' });
      }

      const existing = findPlayer(room, playerId);
      if (existing && existing.playerToken !== playerToken) {
        return socket.emit('error_message', { message: 'Invalid player session.' });
      }
      if (room.state !== 'WAITING' && !existing) {
        return socket.emit('error_message', {
          message: 'This game has already started.'
        });
      }

      const result = existing
        ? { ok: true, player: existing }
        : addPlayer(room.roomId, { playerId, displayName });

      if (!result.ok) {
        return socket.emit('error_message', { message: result.error });
      }

      attachPlayer(room.roomId, result.player.playerId, socket.id);
      socket.join(room.roomId);

      socket.emit('room:joined', {
        room: toPublicRoom(room),
        playerId: result.player.playerId,
        playerToken: result.player.playerToken,
        results: room.results,
        leaderboard: leaderboard(room.players),
        round: room.currentRound,
        letter: room.currentLetter,
        roundEndsAt: room.roundEndsAt,
        draft: room.drafts.get(result.player.playerId) || room.submissions.get(result.player.playerId) || null,
        serverNow: Date.now()
      });
      emitRoom(io, room);
    });

    socket.on('room:start', ({ roomId, playerId }) => {
      const room = getRoomRecord(roomId);
      const host = room && findPlayer(room, playerId);

      if (!room || !host || host.socketId !== socket.id || room.hostId !== playerId) {
        return socket.emit('error_message', {
          message: 'Only the host can start the game.'
        });
      }

      const connectedPlayers = getConnectedPlayers(room);
      if (connectedPlayers.length < 2) {
        return socket.emit('error_message', {
          message: 'At least 2 connected players are required.'
        });
      }

      if (room.state !== 'WAITING') {
        return socket.emit('error_message', {
          message: 'This game has already started.'
        });
      }

      startRound(io, room);
    });

    socket.on('round:draft', ({ roomId, playerId, round, answers }) => {
      const room = getRoomRecord(roomId);
      const player = getAuthenticatedPlayer(room, playerId, socket);

      if (!room || !player || room.state !== 'PLAYING' || room.ending) return;
      if (round !== room.currentRound || room.submissions.has(playerId)) return;
      if (room.roundEndsAt && Date.now() >= room.roundEndsAt) return;

      room.drafts.set(playerId, sanitizeAnswers(answers));
    });

    socket.on('round:submit', async ({ roomId, playerId, round, answers }) => {
      const room = getRoomRecord(roomId);
      const player = getAuthenticatedPlayer(room, playerId, socket);

      if (!room || !player) {
        return socket.emit('error_message', {
          message: 'Player or room not found.'
        });
      }
      if (room.state !== 'PLAYING' || round !== room.currentRound || room.ending) {
        return socket.emit('error_message', {
          message: 'This round is no longer accepting answers.'
        });
      }

      if (room.roundEndsAt && Date.now() >= room.roundEndsAt) {
        await finishRound(io, room);
        return;
      }

      if (room.submissions.has(playerId)) {
        return socket.emit('error_message', {
          message: 'You already submitted this round.'
        });
      }

      const sanitized = sanitizeAnswers(answers);
      room.drafts.set(playerId, sanitized);
      room.submissions.set(playerId, sanitized);
      player.submitted = true;

      socket.emit('round:submitted', { playerId });
      emitRoom(io, room);

      if (
        getConnectedPlayers(room).every((entry) =>
          room.submissions.has(entry.playerId)
        )
      ) {
        await finishRound(io, room);
      }
    });

    socket.on('round:next', ({ roomId, playerId }) => {
      const room = getRoomRecord(roomId);
      if (!room || room.hostId !== playerId || !getAuthenticatedPlayer(room, playerId, socket)) return;

      if (room.state !== 'RESULTS') {
        return socket.emit('error_message', {
          message: 'The round is not ready to advance.'
        });
      }

      startRound(io, room);
    });

    socket.on('room:leave', ({ roomId, playerId }) => {
      const room = getRoomRecord(roomId);
      const player = getAuthenticatedPlayer(room, playerId, socket);
      if (!room || !player) return;

      if (room.state === 'WAITING') {
        removePlayer(room.roomId, playerId);

        if (room.players.length === 0) {
          deleteRoom(room.roomId);
          socket.leave(room.roomId);
          return;
        }
      } else {
        if (!player.submitted) {
          room.drafts.delete(playerId);
          room.submissions.delete(playerId);
        }
        player.connected = false;
        player.socketId = null;
      }

      if (room.hostId === playerId) electNewHost(room);
      socket.leave(room.roomId);
      emitRoom(io, room);
    });

    socket.on('disconnect', () => {
      const match = detachPlayer(socket.id);
      if (!match) return;

      const { room, player } = match;

      // Lobby disconnects free the slot immediately so dead tabs cannot fill a room.
      if (room.state === 'WAITING') {
        removePlayer(room.roomId, player.playerId);

        if (room.players.length === 0) {
          deleteRoom(room.roomId);
          return;
        }

        if (room.hostId === player.playerId) electNewHost(room);
        emitRoom(io, room);
        return;
      }

      if (room.hostId === player.playerId) electNewHost(room);
      emitRoom(io, room);

      if (
        room.state === 'PLAYING' &&
        getConnectedPlayers(room).length > 0 &&
        getConnectedPlayers(room).every((entry) => room.submissions.has(entry.playerId))
      ) {
        finishRound(io, room).catch((error) => {
          console.error('Round finish after disconnect failed:', error);
        });
      }
    });
  });
}
