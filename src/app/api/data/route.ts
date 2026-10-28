import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { databaseConfigured, readDocument, saveDocument } from "@/lib/db";
import { parseTodoData } from "@/lib/todo-store";
import { currentSession } from "@/lib/session";

export const dynamic = "force-dynamic";

async function requireUser() {
  if (!databaseConfigured()) return { error: NextResponse.json({ error: "Sign-in is unavailable." }, { status: 503 }) };
  const session = await currentSession();
  if (!session) return { error: NextResponse.json({ error: "Log in to open your account tasks." }, { status: 401 }) };
  return { session };
}

export async function GET() {
  const auth = await requireUser();
  if ("error" in auth && auth.error) return auth.error;
  const document = await readDocument(auth.session.userId);
  return NextResponse.json(document);
}

export async function PUT(request: Request) {
  const auth = await requireUser();
  if ("error" in auth && auth.error) return auth.error;
  const body = await request.json().catch(() => null) as { data?: unknown; revision?: unknown } | null;
  if (!body || typeof body.revision !== "number" || !Number.isInteger(body.revision) || body.revision < 0) {
    return NextResponse.json({ error: "This task data is not valid." }, { status: 400 });
  }
  try {
    const data = parseTodoData(body.data);
    const saved = await saveDocument(auth.session.userId, data, body.revision);
    if (!saved) {
      return NextResponse.json({ error: "Another session changed your tasks. Please try again." }, { status: 409 });
    }
    return NextResponse.json(saved);
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: "This task data is not valid." }, { status: 400 });
    }
    throw error;
  }
}
