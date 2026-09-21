const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

export function pickRandomLetter(usedLetters = []) {
  const available = LETTERS.filter((letter) => !usedLetters.includes(letter));
  const pool = available.length ? available : LETTERS;
  return pool[Math.floor(Math.random() * pool.length)];
}

export function calculateAnswerScore({ valid, duplicate }) {
  if (!valid) return 0;
  return duplicate ? 5 : 10;
}
