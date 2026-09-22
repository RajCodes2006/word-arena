import test from 'node:test';
import assert from 'node:assert/strict';
import { generateRoomId } from '../src/utils/generateRoomId.js';

test('room codes are readable four-letter words', () => {
  const code = generateRoomId();
  assert.match(code, /^[A-Z]{4}$/);
});
