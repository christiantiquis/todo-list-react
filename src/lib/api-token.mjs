import { createHash, randomBytes } from "node:crypto";

export function createApiToken() {
  return randomBytes(32).toString("base64url");
}

export function hashApiToken(token) {
  return createHash("sha256").update(String(token)).digest("hex");
}
