import test from 'node:test';
import assert from 'node:assert/strict';
import { validateUnavailableSubmissions } from '../src/services/validationService.js';

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
      place: 'TotallyNotAPlace',
      animal: 'NotAnAnimal',
      thing: 'NotAThing'
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
