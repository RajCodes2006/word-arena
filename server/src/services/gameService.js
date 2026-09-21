const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

export function pickRandomLetter(usedLetters = []) {
  const unused = LETTERS.filter((letter) => !usedLetters.includes(letter));
  const pool = unused.length ? unused : LETTERS;
  const last = usedLetters.at(-1);

  if (pool.length > 1 && last) {
    const withoutLast = pool.filter((letter) => letter !== last);
    return withoutLast[Math.floor(Math.random() * withoutLast.length)];
  }

  return pool[Math.floor(Math.random() * pool.length)];
}

export function normalizeAnswer(answer) {
  return String(answer ?? '').trim().replace(/\s+/g, ' ');
}

export function calculateRoundResults({ players, submissions, validations }) {
  const duplicateCounts = new Map();

  for (const player of players) {
    const submission = submissions.get(player.playerId) || {};
    const validation = validations.get(player.playerId) || {};

    for (const category of ['name', 'place', 'animal', 'thing']) {
      const answer = normalizeAnswer(submission[category]);
      if (answer && validation[category]?.valid) {
        const key = answer.toLocaleLowerCase();
        duplicateCounts.set(key, (duplicateCounts.get(key) || 0) + 1);
      }
    }
  }

  const results = players.map((player) => {
    const submission = submissions.get(player.playerId) || {};
    const validation = validations.get(player.playerId) || {};
    const breakdown = {};
    let roundScore = 0;

    for (const category of ['name', 'place', 'animal', 'thing']) {
      const answer = normalizeAnswer(submission[category]);
      const check = validation[category] || { valid: false, reason: 'NOT_CHECKED' };
      const duplicate = Boolean(
        answer &&
        check.valid &&
        duplicateCounts.get(answer.toLocaleLowerCase()) > 1
      );

      const score = check.valid ? (duplicate ? 5 : 10) : 0;
      roundScore += score;

      breakdown[category] = {
        answer,
        valid: Boolean(check.valid),
        duplicate,
        score,
        reason: check.reason || 'UNKNOWN'
      };
    }

    return {
      playerId: player.playerId,
      displayName: player.displayName,
      roundScore,
      totalScore: player.score + roundScore,
      breakdown
    };
  });

  return results.sort(
    (a, b) => b.roundScore - a.roundScore || b.totalScore - a.totalScore
  );
}

export function leaderboard(players) {
  return [...players]
    .sort((a, b) => b.score - a.score || a.displayName.localeCompare(b.displayName))
    .map((player, index) => ({
      rank: index + 1,
      playerId: player.playerId,
      displayName: player.displayName,
      score: player.score
    }));
}
