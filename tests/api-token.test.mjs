import assert from "node:assert/strict";
import test from "node:test";
import { createApiToken, hashApiToken } from "../src/lib/api-token.mjs";

test("API tokens are random and only their hash is comparable", () => {
  const token = createApiToken();
  assert.notEqual(token, hashApiToken(token));
  assert.match(hashApiToken(token), /^[a-f0-9]{64}$/);
  assert.equal(hashApiToken(token), hashApiToken(token));
  assert.notEqual(hashApiToken(token), hashApiToken(createApiToken()));
});
