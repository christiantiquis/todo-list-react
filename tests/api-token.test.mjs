import assert from "node:assert/strict";
import test from "node:test";
import { createApiToken, hashApiToken, normalizeApiTokenLabel } from "../src/lib/api-token.mjs";

test("API tokens are random and only their hash is comparable", () => {
  const token = createApiToken();
  assert.notEqual(token, hashApiToken(token));
  assert.match(hashApiToken(token), /^[a-f0-9]{64}$/);
  assert.equal(hashApiToken(token), hashApiToken(token));
  assert.notEqual(hashApiToken(token), hashApiToken(createApiToken()));
});

test("API token labels are trimmed and limited to 64 characters", () => {
  assert.equal(normalizeApiTokenLabel("  agents  "), "agents");
  assert.equal(normalizeApiTokenLabel(""), null);
  assert.equal(normalizeApiTokenLabel("   "), null);
  assert.equal(normalizeApiTokenLabel("x".repeat(64)), "x".repeat(64));
  assert.equal(normalizeApiTokenLabel("x".repeat(65)), null);
  assert.equal(normalizeApiTokenLabel(12), null);
});
