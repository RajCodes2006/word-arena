import test from 'node:test';
import assert from 'node:assert/strict';
import {
  validateSubmission,
  validateUnavailableSubmissions
} from '../src/services/validationService.js';

test('validation unavailable rejects empty answers', () => {
  const checks = validateUnavailableSubmissions({
    letter: 'A',
    submissions: new Map([
      ['p1', { name: '', place: 'Agra', animal: '', thing: '  ' }]
    ])
  });

  assert.equal(checks.get('p1').name.reason, 'EMPTY');
  assert.equal(checks.get('p1').animal.reason, 'EMPTY');
  assert.equal(checks.get('p1').thing.reason, 'EMPTY');
});


test('validation unavailable never marks non-empty answers as valid', () => {
  const submissions = new Map([
    ['p1', {
      name: 'Aman',
      place: 'AlienPlace',
      animal: 'AntyThing',
      thing: 'AppleThing'
    }]
  ]);

  const checks = validateUnavailableSubmissions({
    letter: 'A',
    submissions
  });

  assert.equal(checks.get('p1').name.valid, false);
  assert.equal(checks.get('p1').place.valid, false);
  assert.equal(checks.get('p1').animal.valid, false);
  assert.equal(checks.get('p1').thing.valid, false);
  assert.equal(checks.get('p1').place.reason, 'AI_VALIDATION_UNAVAILABLE');
});


test('Gemini response is used per category and server constraints are enforced', async () => {
  const previousKey = process.env.GEMINI_API_KEY;
  const previousFetch = global.fetch;

  process.env.GEMINI_API_KEY = 'test-key';
  global.fetch = async () => ({
    ok: true,
    status: 200,
    async json() {
      return {
        candidates: [{
          content: {
            parts: [{
              text: JSON.stringify({
                results: {
                  name: { valid: true, reason: 'real name' },
                  place: { valid: true, reason: 'real place' },
                  animal: { valid: true, reason: 'real animal' },
                  thing: { valid: false, reason: 'not a concrete thing' }
                }
              })
            }]
          }
        }]
      };
    }
  });

  try {
    const result = await validateSubmission({
      letter: 'I',
      answers: {
        name: 'Ishita',
        place: 'India',
        animal: 'Iguana',
        thing: 'Ice'
      }
    });

    assert.equal(result.mode, 'gemini-api');
    assert.equal(result.checks.name.valid, true);
    assert.equal(result.checks.place.valid, true);
    assert.equal(result.checks.animal.valid, true);
    assert.equal(result.checks.thing.valid, false);
  } finally {
    if (previousKey === undefined) delete process.env.GEMINI_API_KEY;
    else process.env.GEMINI_API_KEY = previousKey;
    global.fetch = previousFetch;
  }
});

test('Gemini outage fails closed after retries', async () => {
  const previousKey = process.env.GEMINI_API_KEY;
  const previousFetch = global.fetch;

  process.env.GEMINI_API_KEY = 'test-key';
  let calls = 0;
  global.fetch = async () => {
    calls += 1;
    return {
      ok: false,
      status: 503,
      async text() { return '{}'; }
    };
  };

  try {
    const result = await validateSubmission({
      letter: 'A',
      answers: {
        name: 'Aman',
        place: 'Agra',
        animal: 'Ant',
        thing: 'Apple'
      }
    });

    assert.equal(result.mode, 'validation-unavailable');
    assert.equal(calls, 3);
    assert.equal(result.checks.name.valid, false);
    assert.equal(result.checks.place.valid, false);
    assert.equal(result.checks.animal.valid, false);
    assert.equal(result.checks.thing.valid, false);
  } finally {
    if (previousKey === undefined) delete process.env.GEMINI_API_KEY;
    else process.env.GEMINI_API_KEY = previousKey;
    global.fetch = previousFetch;
  }
});


test('Gemini transient outage can fail over to the secondary model', async () => {
  const previousKey = process.env.GEMINI_API_KEY;
  const previousModel = process.env.GEMINI_MODEL;
  const previousFallback = process.env.GEMINI_FALLBACK_MODEL;
  const previousFetch = global.fetch;

  process.env.GEMINI_API_KEY = 'test-key';
  process.env.GEMINI_MODEL = 'gemini-3.8-flash';
  process.env.GEMINI_FALLBACK_MODEL = 'gemini-3.7-flash';

  const calls = [];
  global.fetch = async (url) => {
    calls.push(String(url));
    if (calls.length === 1) {
      return {
        ok: false,
        status: 503,
        async text() { return '{}'; }
      };
    }

    return {
      ok: true,
      status: 200,
      async json() {
        return {
          candidates: [{
            content: {
              parts: [{
                text: JSON.stringify({
                  results: {
                    name: { valid: true, reason: 'real name' },
                    place: { valid: true, reason: 'real place' },
                    animal: { valid: true, reason: 'real animal' },
                    thing: { valid: true, reason: 'real thing' }
                  }
                })
              }]
            }
          }]
        };
      }
    };
  };

  try {
    const result = await validateSubmission({
      letter: 'A',
      answers: {
        name: 'Aman',
        place: 'Agra',
        animal: 'Ant',
        thing: 'Apple'
      }
    });

    assert.equal(result.mode, 'gemini-api');
    assert.equal(result.checks.name.valid, true);
    assert.equal(calls.length, 2);
    assert.match(calls[0], /gemini-3\.8-flash:generateContent/);
    assert.match(calls[1], /gemini-3\.7-flash:generateContent/);
  } finally {
    if (previousKey === undefined) delete process.env.GEMINI_API_KEY;
    else process.env.GEMINI_API_KEY = previousKey;
    if (previousModel === undefined) delete process.env.GEMINI_MODEL;
    else process.env.GEMINI_MODEL = previousModel;
    if (previousFallback === undefined) delete process.env.GEMINI_FALLBACK_MODEL;
    else process.env.GEMINI_FALLBACK_MODEL = previousFallback;
    global.fetch = previousFetch;
  }
});
