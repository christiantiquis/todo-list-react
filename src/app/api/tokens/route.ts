import { NextResponse } from "next/server";
import { createApiToken, hashApiToken, normalizeApiTokenLabel } from "@/lib/api-token";
import { databaseConfigured, insertApiToken, listApiTokens } from "@/lib/db";
import { currentSession } from "@/lib/session";

export const dynamic = "force-dynamic";

async function requireUser() {
  if (!databaseConfigured()) return { error: NextResponse.json({ error: "Sign-in is unavailable." }, { status: 503 }) };
  const session = await currentSession();
  if (!session) return { error: NextResponse.json({ error: "Log in to manage API tokens." }, { status: 401 }) };
  return { session };
}

export async function GET() {
  const auth = await requireUser();
  if ("error" in auth && auth.error) return auth.error;
  const tokens = await listApiTokens(auth.session.userId);
  return NextResponse.json({ tokens });
}

export async function POST(request: Request) {
  const auth = await requireUser();
  if ("error" in auth && auth.error) return auth.error;
  const body = await request.json().catch(() => null) as { label?: unknown } | null;
  const label = normalizeApiTokenLabel(body?.label);
  if (!label) return NextResponse.json({ error: "Label must be 1–64 characters." }, { status: 400 });
  const token = createApiToken();
  const saved = await insertApiToken(auth.session.userId, hashApiToken(token), label);
  return NextResponse.json({ ...saved, token });
}
