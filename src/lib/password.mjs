import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scrypt = promisify(scryptCallback);
const keyLength = 64;
export const minimumPasswordLength = 8;

export async function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const hash = (await scrypt(password, salt, keyLength)).toString("hex");
  return `${salt}:${hash}`;
}

export async function verifyPassword(password, stored) {
  const [salt, hash] = String(stored ?? "").split(":");
  if (!salt || !hash) return false;
  const actual = await scrypt(password, salt, keyLength);
  const expected = Buffer.from(hash, "hex");
  if (expected.length !== actual.length) return false;
  return timingSafeEqual(actual, expected);
}
