/**
 * API-ready answer validation service.
 *
 * Current starter behavior checks the first letter locally so the game can run
 * without any external dependency. Replace/extend `validateWithApi` with the
 * chosen validation provider later.
 */

const VALID_CATEGORIES = ['name', 'place', 'animal', 'thing'];

export async function validateAnswer({ category, answer, letter }) {
  const normalizedCategory = String(category).toLowerCase();
  const normalizedAnswer = String(answer || '').trim();
  const normalizedLetter = String(letter || '').trim().toUpperCase();

  if (!VALID_CATEGORIES.includes(normalizedCategory)) {
    return { valid: false, reason: 'UNKNOWN_CATEGORY' };
  }

  if (!normalizedAnswer) {
    return { valid: false, reason: 'EMPTY' };
  }

  if (!normalizedAnswer.toUpperCase().startsWith(normalizedLetter)) {
    return { valid: false, reason: 'WRONG_LETTER' };
  }

  return validateWithApi({
    category: normalizedCategory,
    answer: normalizedAnswer,
    letter: normalizedLetter
  });
}

async function validateWithApi({ category, answer, letter }) {
  // TODO: connect the selected external validation API here.
  // Keep this function server-side so API keys are never exposed in React.
  return {
    valid: true,
    reason: 'LOCAL_LETTER_CHECK',
    category,
    answer,
    letter
  };
}
