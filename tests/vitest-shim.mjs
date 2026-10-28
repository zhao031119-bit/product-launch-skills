// The slice of vitest that the tests under skills/ use, on top of node:test.
import assert from 'node:assert/strict';

export { describe, test } from 'node:test';

export const expect = (actual) => ({
  toBe: (expected) => assert.equal(actual, expected),
  toBeNull: () => assert.equal(actual, null),
});
