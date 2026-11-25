import assert from 'node:assert/strict';
import { test } from 'node:test';
import { evaluate, sampleFixtures, validateFixtures } from './checks.js';

test('distinguishes failed, incomplete, passing and absent observations', () => {
  const fixtures = validateFixtures([
    { name: 'One', protectedDataRedacted: false, outputSchemaValid: true, humanApprovalEnforced: true },
    { name: 'Two', humanApprovalEnforced: true },
  ]);
  const results = evaluate(fixtures);
  assert.deepEqual(results.map(result => result.status), ['Failed', 'Needs attention', 'Not run', 'Passed']);
  assert.deepEqual(results[0].failed, ['One']);
  assert.equal(results[1].missing, 1);
});

test('rejects invalid findings and duplicate fixture identifiers', () => {
  assert.throws(() => validateFixtures([{ name: 'One', outputSchemaValid: 'true' }]), /must be true or false/);
  assert.throws(() => validateFixtures([sampleFixtures[0], sampleFixtures[0]]), /unique/);
});
