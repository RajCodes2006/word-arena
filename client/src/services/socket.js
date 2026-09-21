import { io } from 'socket.io-client';

let socket;

export function connectSocket(url) {
  if (!socket) {
    socket = io(url, { autoConnect: true });
  }
  return socket;
}

export function getSocket() {
  if (!socket) {
    throw new Error('Socket is not connected yet.');
  }
  return socket;
}
