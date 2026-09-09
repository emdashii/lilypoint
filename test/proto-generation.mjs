// Run after bun run build. These seeds exhaust the cantus search on the first attempt.
import assert from 'node:assert/strict';
import { generatePhrase } from '../dist/proto/shared/studio.js';
for (const [species, seed] of [[1, 6], [4, 1]]) {
  const spec = {key:'G', mode:'minor', species, seed, measures:4, time:'4/4'};
  const result = generatePhrase(spec);
  for (const field of ['key','mode','species','measures','time']) assert.equal(result.spec[field], spec[field]);
  assert.ok(result.upper.length && result.lower.length);
  assert.equal(generatePhrase(spec).spec.seed, result.spec.seed, 'Recovery stays reproducible');
}
console.log('Failed cantus searches recover without changing the requested settings.');
