import assert from "node:assert/strict";
import test from "node:test";
import { hashPassword, minimumPasswordLength, verifyPassword } from "../src/lib/password.mjs";

test("password hashes verify only the original password", async () => {
  const stored = await hashPassword("correct-horse");
  assert.equal(await verifyPassword("correct-horse", stored), true);
  assert.equal(await verifyPassword("wrong-horse", stored), false);
  assert.equal(await verifyPassword("correct-horse", "not-a-hash"), false);
  assert.equal(minimumPasswordLength, 8);
});
