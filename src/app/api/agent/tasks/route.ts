import { NextResponse } from "next/server";
import { agentFailure, commitAgentChange, requireAgent } from "@/lib/agent-api";
import { addAgentTask, agentDueDate, agentName, selectAgentTasks, taskPriority } from "@/lib/todo-store";
import { readDocument } from "@/lib/db";

export const dynamic = "force-dynamic";

const statuses = ["open", "done", "all"] as const;

export async function GET(request: Request) {
  try {
    const auth = await requireAgent(request);
    if ("error" in auth && auth.error) return auth.error;
    const url = new URL(request.url);
    const status = url.searchParams.get("status") ?? "open";
    if (!statuses.includes(status as typeof statuses[number])) {
      return NextResponse.json({ error: "Status must be open, done, or all." }, { status: 400 });
    }
    const agentQuery = url.searchParams.get("agent");
    const agent = agentQuery ? agentName(agentQuery) : undefined;
    const document = await readDocument(auth.userId);
    return NextResponse.json({ tasks: selectAgentTasks(document.data.todos, status as typeof statuses[number], agent) });
  } catch (error) {
    return agentFailure(error);
  }
}

export async function POST(request: Request) {
  try {
    const auth = await requireAgent(request);
    if ("error" in auth && auth.error) return auth.error;
    const body = await request.json().catch(() => null) as { text?: unknown; list?: unknown; dueDate?: unknown; agent?: unknown; priority?: unknown } | null;
    if (!body || typeof body.text !== "string") return NextResponse.json({ error: "Task text cannot be empty." }, { status: 400 });
    if (body.list !== undefined && typeof body.list !== "string") return NextResponse.json({ error: "List name is not valid." }, { status: 400 });
    if (body.priority !== undefined && body.priority !== null && body.priority !== "" && typeof body.priority !== "string") {
      return NextResponse.json({ error: "Priority must be high, medium, or low." }, { status: 400 });
    }
    if (body.agent !== undefined && body.agent !== "" && typeof body.agent !== "string") {
      return NextResponse.json({ error: "Agent name must be 1–64 characters." }, { status: 400 });
    }
    const dueDate = agentDueDate(body.dueDate);
    const list = typeof body.list === "string" ? body.list : undefined;
    const agent = typeof body.agent === "string" && body.agent.trim() !== "" ? body.agent : undefined;
    const priority = typeof body.priority === "string" ? taskPriority(body.priority) : undefined;
    const id = crypto.randomUUID();
    const now = Date.now();
    const saved = await commitAgentChange(auth.userId, current => addAgentTask(current, { text: body.text as string, list, dueDate, agent, priority }, now, id).data);
    if (saved instanceof NextResponse) return saved;
    const task = saved.data.todos.find(todo => todo.id === id);
    if (!task) return NextResponse.json({ error: "That task was not found." }, { status: 404 });
    return NextResponse.json(task);
  } catch (error) {
    return agentFailure(error);
  }
}
