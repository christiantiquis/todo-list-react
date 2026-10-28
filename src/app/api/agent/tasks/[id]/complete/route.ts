import { agentTaskAction } from "@/lib/agent-action";
import { completeAgentTask } from "@/lib/todo-store";

export const dynamic = "force-dynamic";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  return agentTaskAction(request, id, completeAgentTask);
}
