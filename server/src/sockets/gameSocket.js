import { addPlayer, getRoomRecord, removePlayer } from '../services/roomService.js';
import { pickRandomLetter } from '../services/gameService.js';

export function registerSocketHandlers(io) {
  io.on('connection', (socket) => {
    socket.on('join_room', ({ roomId, playerId, displayName }) => {
      const room = getRoomRecord(roomId);
      if (!room) {
        socket.emit('error_message', { message: 'Room not found.' });
        return;
      }

      if (room.state !== 'WAITING') {
        socket.emit('error_message', { message: 'Game already started.' });
        return;
      }

      if (room.players.length >= room.maxPlayers) {
        socket.emit('error_message', { message: 'Room is full.' });
        return;
      }

      const existing = room.players.find((player) => player.playerId === playerId);
      if (!existing) {
        addPlayer(room.roomId, {
          playerId,
          displayName,
          score: 0,
          connected: true
        });
      }

      socket.join(room.roomId);
      io.to(room.roomId).emit('room_updated', getRoomRecord(room.roomId));
    });

    socket.on('start_game', ({ roomId, playerId }) => {
      const room = getRoomRecord(roomId);
      if (!room || room.hostId !== playerId) return;

      room.state = 'PLAYING';
      room.currentRound = 1;
      const letter = pickRandomLetter(room.usedLetters);
      room.usedLetters.push(letter);
      room.currentLetter = letter;

      io.to(room.roomId).emit('game_started', {
        currentRound: room.currentRound,
        totalRounds: room.totalRounds,
        letter
      });
    });

    socket.on('disconnect', () => {
      // Reconnection/host transfer will be implemented in the lobby phase.
    });
  });
}
