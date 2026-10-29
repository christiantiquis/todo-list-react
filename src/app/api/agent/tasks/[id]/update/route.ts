import { NextResponse } from "next/server";
import { agentFailure, commitAgentChange, requireAgent } from "@/lib/agent-api";
import { AgentTaskError, agentDueDate, findAgentTask, updateAgentTask } from "@/lib/todo-store";

export const dynamic = "force-dynamic";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireAgent(request);
    if ("error" in auth && auth.error) return auth.error;
    const { id } = await context.params;
    const body = await request.json().catch(() => null) as { agent?: unknown; text?: unknown; list?: unknown; dueDate?: unknown; status?: unknown } | null;
    if (!body || typeof body.agent !== "string") throw new AgentTaskError("Agent name must be 1–64 characters.", 400);
    if (body.text !== undefined && typeof body.text !== "string") throw new AgentTaskError("Task text cannot be empty.", 400);
    if (body.list !== undefined && body.list !== null && typeof body.list !== "string") throw new AgentTaskError("List name is not valid.", 400);
    if (body.status !== undefined && body.status !== "open" && body.status !== "pending") throw new AgentTaskError("Status must be open or pending.", 400);
    const dueDate = body.dueDate === undefined ? undefined : body.dueDate === null || body.dueDate === "" ? null : agentDueDate(body.dueDate);
    const now = Date.now();
    const saved = await commitAgentChange(auth.userId, current => updateAgentTask(current, id, {
      agent: body.agent as string,
      ...(body.status !== undefined ? { status: body.status as "open" | "pending" } : {}),
      ...(body.text !== undefined ? { text: body.text as string } : {}),
      ...(body.list !== undefined ? { list: typeof body.list === "string" ? body.list : null } : {}),
      ...(dueDate !== undefined ? { dueDate } : {}),
    }, now).data);
    if (saved instanceof NextResponse) return saved;
    const task = findAgentTask(saved.data, id);
    if (!task) return NextResponse.json({ error: "That task was not found." }, { status: 404 });
    return NextResponse.json(task);
  } catch (error) {
    return agentFailure(error);
  }
}
