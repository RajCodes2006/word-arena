const CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export function generateRoomId() {
  let id = 'WW-';
  for (let i = 0; i < 4; i += 1) {
    id += CHARS[Math.floor(Math.random() * CHARS.length)];
  }
  return id;
}
