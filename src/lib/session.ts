import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

export const sessionCookie = "todolizt_session";
const maxAgeSeconds = 60 * 60 * 24 * 30;

export type Session = { userId: string; email: string; exp: number };

function authSecret() {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET is not set.");
  return secret;
}

export function signSession(userId: string, email: string, now = Date.now()) {
  const payload = Buffer.from(JSON.stringify({ userId, email, exp: now + maxAgeSeconds * 1000 })).toString("base64url");
  const signature = createHmac("sha256", authSecret()).update(payload).digest("base64url");
  return `${payload}.${signature}`;
}

export function readSessionToken(token: string | undefined, now = Date.now()): Session | null {
  if (!token) return null;
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return null;
  const expected = createHmac("sha256", authSecret()).update(payload).digest("base64url");
  const actual = Buffer.from(signature);
  const wanted = Buffer.from(expected);
  if (actual.length !== wanted.length || !timingSafeEqual(actual, wanted)) return null;
  try {
    const session = JSON.parse(Buffer.from(payload, "base64url").toString()) as Session;
    if (!session.userId || !session.email || session.exp <= now) return null;
    return session;
  } catch {
    return null;
  }
}

export function sessionCookieOptions() {
  return {
    httpOnly: true,
    secure: true,
    sameSite: "lax" as const,
    path: "/",
    maxAge: maxAgeSeconds,
  };
}

export async function currentSession() {
  const token = (await cookies()).get(sessionCookie)?.value;
  return readSessionToken(token);
}
