import { NextResponse } from "next/server";
import { sessionCookie, sessionCookieOptions } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function POST() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set(sessionCookie, "", { ...sessionCookieOptions(), maxAge: 0 });
  return response;
}
