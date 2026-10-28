import { NextResponse } from "next/server";
import { databaseConfigured, findUserByEmail } from "@/lib/db";
import { verifyPassword } from "@/lib/password";
import { sessionCookie, sessionCookieOptions, signSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!databaseConfigured()) {
    return NextResponse.json({ error: "Sign-in is unavailable." }, { status: 503 });
  }
  const body = await request.json().catch(() => null) as { email?: unknown; password?: unknown } | null;
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body?.password === "string" ? body.password : "";
  if (!email || !password) {
    return NextResponse.json({ error: "Enter your email and password." }, { status: 400 });
  }
  const user = await findUserByEmail(email);
  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    return NextResponse.json({ error: "Email or password is incorrect." }, { status: 401 });
  }
  const response = NextResponse.json({ email: user.email });
  response.cookies.set(sessionCookie, signSession(user.id, user.email), sessionCookieOptions());
  return response;
}
