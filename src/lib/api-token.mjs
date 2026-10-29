import { createHash, randomBytes } from "node:crypto";

export function createApiToken() {
  return randomBytes(32).toString("base64url");
}

export function hashApiToken(token) {
  return createHash("sha256").update(String(token)).digest("hex");
}

export function normalizeApiTokenLabel(value) {
  if (typeof value !== "string") return null;
  const label = value.trim();
  if (!label || label.length > 64) return null;
  return label;
}
