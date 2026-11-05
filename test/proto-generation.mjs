// Run after bun run build. The Write room retries a request whose cantus search
// is exhausted with the next seed. No supported setting is known to exhaust the
// search since the October 2026 cantus fix, so this injects the failure at the
// cantus boundary to reach the recovery path.
import assert from 'node:assert/strict';
import { generatePhrase } from '../dist/proto/shared/studio.js';
import { CantusFirmus } from '../dist/cantus-firmus.js';

const original = CantusFirmus.prototype.generate;
const failNext = (count, message = 'Cantus firmus search exhausted its budget or legal melodies') => {
  CantusFirmus.prototype.generate = function () {
    if (count-- > 0) throw new Error(message);
    return original.call(this);
  };
};
const pitches = r => [r.upper, r.lower].map(voice => voice.map(e => e.pitch));
try {
  for (const [species, seed] of [[1, 6], [4, 1]]) {
    const spec = { key: 'G', mode: 'minor', species, seed, measures: 4, time: '4/4' };
    failNext(2);
    const result = generatePhrase(spec);
    CantusFirmus.prototype.generate = original;
    assert.ok(result, 'Recovery returns a phrase');
    for (const field of ['key', 'mode', 'species', 'measures', 'time']) assert.equal(result.spec[field], spec[field]);
    assert.equal(result.spec.seed, seed + 2, 'Two exhausted searches advance the stored seed twice');
    assert.deepEqual(pitches(result), pitches(generatePhrase({ ...spec, seed: seed + 2 })), 'The stored seed reproduces the recovered phrase');
  }
  failNext(6);
  assert.throws(() => generatePhrase({ key: 'C', mode: 'major', species: 1, seed: 1, measures: 2, time: '4/4' }), /search exhausted/, 'Six exhausted searches give up');
  failNext(1, 'unrelated failure');
  assert.throws(() => generatePhrase({ key: 'C', mode: 'major', species: 1, seed: 1, measures: 2, time: '4/4' }), /unrelated failure/, 'Other errors are not retried');
} finally {
  CantusFirmus.prototype.generate = original;
}
console.log('Exhausted cantus searches retry with the next seed and keep the requested settings.');
