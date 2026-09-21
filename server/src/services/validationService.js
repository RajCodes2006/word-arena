const CATEGORIES = ['name', 'place', 'animal', 'thing'];
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models';

function startsWithLetter(answer, letter) {
  const normalized = String(answer ?? '').trim();
  return normalized.length > 0 &&
    normalized.toLocaleUpperCase().startsWith(letter.toLocaleUpperCase());
}

function looksLikePlausibleName(answer) {
  const value = String(answer ?? '').trim();
  if (value.length < 2 || value.length > 40) return false;
  if (!/^[A-Za-z]+(?:[ '-][A-Za-z]+)*$/.test(value)) return false;

  const lettersOnly = value.replace(/[^A-Za-z]/g, '').toLowerCase();
  if (!/[aeiouy]/.test(lettersOnly)) return false;
  if (/[^aeiouy]{4,}/.test(lettersOnly)) return false;
  return true;
}

function localFallback({ category, answer, letter }) {
  const normalized = String(answer ?? '').trim();
  if (!normalized) return { valid: false, reason: 'EMPTY' };
  if (!startsWithLetter(normalized, letter)) return { valid: false, reason: 'WRONG_LETTER' };

  if (category === 'name' && !looksLikePlausibleName(normalized)) {
    return { valid: false, reason: 'NOT_A_PLAUSIBLE_NAME' };
  }

  return {
    valid: true,
    reason: category === 'name' ? 'BASIC_NAME_CHECK' : 'BASIC_LETTER_CHECK'
  };
}

function normalizeValidationPayload(raw, answers, letter) {
  const output = {};

  for (const category of CATEGORIES) {
    const answer = String(answers?.[category] ?? '').trim();
    const candidate = raw?.results?.[category] ?? raw?.[category] ?? {};

    if (!answer) {
      output[category] = { valid: false, reason: 'EMPTY' };
      continue;
    }

    const startsCorrectly = answer
      .toLocaleUpperCase()
      .startsWith(letter.toLocaleUpperCase());

    output[category] = {
      valid: Boolean(candidate.valid) && startsCorrectly,
      reason: startsCorrectly
        ? String(candidate.reason || 'API_CHECKED').slice(0, 120)
        : 'WRONG_LETTER'
    };
  }

  return output;
}

function extractJson(text) {
  const cleaned = String(text ?? '')
    .trim()
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/\s*```$/i, '');

  return JSON.parse(cleaned);
}

function basicChecks(answers, letter) {
  return Object.fromEntries(
    CATEGORIES.map((category) => [
      category,
      localFallback({ category, answer: answers[category], letter })
    ])
  );
}

export async function validateSubmission({ letter, answers }) {
  const preparedAnswers = Object.fromEntries(
    CATEGORIES.map((category) => [
      category,
      String(answers?.[category] ?? '').trim().slice(0, 80)
    ])
  );

  const apiKey = process.env.GEMINI_API_KEY;
  const model = process.env.GEMINI_MODEL || 'gemini-3.8-flash';

  if (!apiKey) {
    return {
      mode: 'basic-fallback',
      checks: basicChecks(preparedAnswers, letter)
    };
  }

  const prompt = `
You are the strict answer judge for a multiplayer Name, Place, Animal, Thing game.

Required starting letter: "${letter}"

Judge each answer independently.

Rules:
- Name: a plausible real human given name or commonly accepted personal name. Reject random strings, keyboard-smash text, and obvious category mismatches.
- Place: a real geographic place, such as a city, town, country, state, landmark, river, mountain, region, etc.
- Animal: a real animal or recognized animal species/common animal name.
- Thing: a real, recognizable concrete object, item, product, tool, device, food item, or physical thing.
- The answer must begin with the required letter, ignoring leading whitespace.
- Reject gibberish, random strings, obvious category mismatches, and made-up terms.
- Common proper nouns are allowed.
- Be practical rather than pedantic.
- Return ONLY valid JSON.

Return exactly:
{
  "results": {
    "name": {"valid": true|false, "reason": "short reason"},
    "place": {"valid": true|false, "reason": "short reason"},
    "animal": {"valid": true|false, "reason": "short reason"},
    "thing": {"valid": true|false, "reason": "short reason"}
  }
}

Answers:
${JSON.stringify(preparedAnswers, null, 2)}
`.trim();

  try {
    const response = await fetch(
      `${GEMINI_API_URL}/${encodeURIComponent(model)}:generateContent`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': apiKey
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0,
            maxOutputTokens: 500,
            responseMimeType: 'application/json'
          }
        })
      }
    );

    if (!response.ok) {
      const details = await response.text().catch(() => '');
      console.error(`Gemini validation failed (${response.status}): ${details}`);
      return { mode: 'basic-fallback', checks: basicChecks(preparedAnswers, letter) };
    }

    const payload = await response.json();
    const text =
      payload?.candidates?.[0]?.content?.parts
        ?.map((part) => part.text || '')
        .join('') || '';

    return {
      mode: 'gemini-api',
      checks: normalizeValidationPayload(
        extractJson(text),
        preparedAnswers,
        letter
      )
    };
  } catch (error) {
    console.error('Validation API error:', error);
    return { mode: 'basic-fallback', checks: basicChecks(preparedAnswers, letter) };
  }
}

export async function validateAllSubmissions({ letter, submissions }) {
  const entries = [...submissions.entries()];
  const validated = await Promise.all(
    entries.map(async ([playerId, answers]) => {
      const result = await validateSubmission({ letter, answers });
      return [playerId, result.checks];
    })
  );

  return {
    validations: new Map(validated),
    mode: process.env.GEMINI_API_KEY ? 'gemini-api' : 'basic-fallback'
  };
}
