import { NextResponse } from "next/server";
import { databaseConfigured, deleteApiToken } from "@/lib/db";
import { currentSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  if (!databaseConfigured()) return NextResponse.json({ error: "Sign-in is unavailable." }, { status: 503 });
  const session = await currentSession();
  if (!session) return NextResponse.json({ error: "Log in to manage API tokens." }, { status: 401 });
  const { id } = await context.params;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
    return NextResponse.json({ error: "That token was not found." }, { status: 404 });
  }
  const removed = await deleteApiToken(session.userId, id);
  if (!removed) return NextResponse.json({ error: "That token was not found." }, { status: 404 });
  return NextResponse.json({ id });
}
