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


test('Gemini validation success, outage handling, and model failover work safely', async () => {
  const previousKey = process.env.GEMINI_API_KEY;
  const previousModel = process.env.GEMINI_MODEL;
  const previousFallback = process.env.GEMINI_FALLBACK_MODEL;
  const previousFetch = global.fetch;

  try {
    process.env.GEMINI_API_KEY = 'test-key';
    process.env.GEMINI_MODEL = 'gemini-3.8-flash';
    process.env.GEMINI_FALLBACK_MODEL = 'gemini-3.7-flash';

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

    const semantic = await validateSubmission({
      letter: 'I',
      answers: {
        name: 'Ishita',
        place: 'India',
        animal: 'Iguana',
        thing: 'Ice'
      }
    });

    assert.equal(semantic.mode, 'gemini-api');
    assert.equal(semantic.checks.name.valid, true);
    assert.equal(semantic.checks.place.valid, true);
    assert.equal(semantic.checks.animal.valid, true);
    assert.equal(semantic.checks.thing.valid, false);

    let failoverCalls = [];
    global.fetch = async (url) => {
      failoverCalls.push(String(url));
      if (failoverCalls.length === 1) {
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

    const failover = await validateSubmission({
      letter: 'A',
      answers: {
        name: 'Aman',
        place: 'Agra',
        animal: 'Ant',
        thing: 'Apple'
      }
    });

    assert.equal(failover.mode, 'gemini-api');
    assert.equal(failover.checks.name.valid, true);
    assert.equal(failoverCalls.length, 2);
    assert.match(failoverCalls[0], /gemini-3\.8-flash:generateContent/);
    assert.match(failoverCalls[1], /gemini-3\.7-flash:generateContent/);

    global.fetch = async () => ({
      ok: false,
      status: 503,
      async text() { return '{}'; }
    });

    const unavailable = await validateSubmission({
      letter: 'A',
      answers: {
        name: 'Aman',
        place: 'Agra',
        animal: 'Ant',
        thing: 'Apple'
      }
    });

    assert.equal(unavailable.mode, 'validation-unavailable');
    assert.equal(unavailable.checks.name.valid, false);
    assert.equal(unavailable.checks.place.valid, false);
    assert.equal(unavailable.checks.animal.valid, false);
    assert.equal(unavailable.checks.thing.valid, false);
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
