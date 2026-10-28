import { NextResponse } from "next/server";
import { agentFailure, commitAgentChange, requireAgent } from "./agent-api";
import { AgentTaskError, type TodoData } from "./todo-store";
import type { Todo } from "@/types/todo";

type TaskChange = (data: TodoData, id: string, agent: string, now: number) => { data: TodoData; task: Todo };

export async function agentTaskAction(request: Request, id: string, change: TaskChange) {
  try {
    const auth = await requireAgent(request);
    if ("error" in auth && auth.error) return auth.error;
    const body = await request.json().catch(() => null) as { agent?: unknown } | null;
    if (!body || typeof body.agent !== "string") throw new AgentTaskError("Agent name must be 1–64 characters.", 400);
    const agent = body.agent;
    const now = Date.now();
    const saved = await commitAgentChange(auth.userId, current => change(current, id, agent, now).data);
    if (saved instanceof NextResponse) return saved;
    const task = saved.data.todos.find(todo => todo.id === id);
    if (!task) return NextResponse.json({ error: "That task was not found." }, { status: 404 });
    return NextResponse.json(task);
  } catch (error) {
    return agentFailure(error);
  }
}
