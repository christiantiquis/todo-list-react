import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { hashApiToken } from "./api-token";
import { databaseConfigured, findUserIdByTokenHash, updateDocument } from "./db";
import { AgentTaskError, type TodoData } from "./todo-store";

export function agentFailure(error: unknown) {
  if (error instanceof AgentTaskError) return NextResponse.json({ error: error.message }, { status: error.status });
  if (error instanceof ZodError) return NextResponse.json({ error: "This task data is not valid." }, { status: 400 });
  throw error;
}

export async function requireAgent(request: Request) {
  if (!databaseConfigured()) return { error: NextResponse.json({ error: "Sign-in is unavailable." }, { status: 503 }) };
  const token = /^Bearer\s+(\S+)$/i.exec(request.headers.get("authorization") ?? "")?.[1];
  if (!token) return { error: NextResponse.json({ error: "API token is not valid." }, { status: 401 }) };
  const userId = await findUserIdByTokenHash(hashApiToken(token));
  if (!userId) return { error: NextResponse.json({ error: "API token is not valid." }, { status: 401 }) };
  return { userId };
}

export async function commitAgentChange(userId: string, change: (data: TodoData) => TodoData) {
  const saved = await updateDocument(userId, change);
  if (!saved) return NextResponse.json({ error: "Another session changed your tasks. Please try again." }, { status: 409 });
  return saved;
}
