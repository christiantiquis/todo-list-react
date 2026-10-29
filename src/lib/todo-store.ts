import { z } from "zod";
import type { Todo } from "../types/todo";

export const predefinedCategories = ["Work", "Personal", "Shopping"];
export const taskPriorities = ["high", "medium", "low"] as const;
export type TaskPriority = (typeof taskPriorities)[number];
const priorityRank: Record<TaskPriority, number> = { high: 0, medium: 1, low: 2 };
export function priorityLabel(priority?: string) {
  return priority === "high" ? "High" : priority === "medium" ? "Medium" : priority === "low" ? "Low" : "";
}
export const categoryValue = (name: string) => `category:${name}`;
export const decodeCategory = (value: string) => value.startsWith("category:") ? value.slice(9) : undefined;
export const DATA_KEY = "todo-data-v1";
export const TRASH_RETENTION_MS = 30 * 24 * 60 * 60 * 1000;
export const MAX_BACKUP_BYTES = 5 * 1024 * 1024;
const timestamp = z.number().finite().refine(value => !Number.isNaN(new Date(value).getTime()));
const todoSchema = z.object({
  id: z.string().min(1), text: z.string().trim().min(1), completed: z.boolean(),
  category: z.string().trim().min(1).optional(), createdAt: timestamp,
  updatedAt: timestamp.optional(), completedAt: timestamp.optional(), dueDate: timestamp.optional(),
  agent: z.string().trim().min(1).max(64).optional(),
  priority: z.enum(taskPriorities).optional(),
  note: z.string().trim().min(1).max(2000).optional(),
  finishedBy: z.string().trim().min(1).max(64).optional(),
});
const todosSchema = z.array(todoSchema).refine(items => new Set(items.map(item => item.id)).size === items.length);
const categoriesSchema = z.array(z.string().trim().min(1)).transform(items =>
  [...new Set(items)].filter(name => !predefinedCategories.includes(name)));
const trashSchema = z.array(z.object({ todo: todoSchema, deletedAt: timestamp }));
export type TrashedTodo = z.infer<typeof trashSchema>[number];
export type TodoData = { todos: Todo[]; customCategories: string[]; trash: TrashedTodo[] };
export const emptyTodoData = (): TodoData => ({ todos: [], customCategories: [], trash: [] });
type Storage = Pick<globalThis.Storage, "getItem" | "setItem">;
const dataSchema = z.object({
  todos: todosSchema, customCategories: categoriesSchema, trash: trashSchema.default([]),
}).refine(data => {
  const ids = [...data.todos.map(todo => todo.id), ...data.trash.map(entry => entry.todo.id)];
  return new Set(ids).size === ids.length;
}, "Task IDs must be unique across active tasks and Trash.");
const storedSchema = z.object({
  todos: todosSchema, customCategories: categoriesSchema, trash: trashSchema.default([]),
  revision: z.number().int().nonnegative().safe().default(0),
}).refine(data => dataSchema.safeParse(data).success);

// Never replace invalid originals unless their recovery copy was saved successfully.
function read<T>(storage: Storage, key: string, schema: z.ZodType<T, z.ZodTypeDef, unknown>, fallback: T, warnings: string[]): T {
  const raw = storage.getItem(key);
  if (raw === null) return fallback;
  try { return schema.parse(JSON.parse(raw)); }
  catch {
    storage.setItem(`${key}.recovery.${crypto.randomUUID()}`, raw);
    warnings.push("Some saved data could not be read. A recovery copy was preserved in this browser.");
    return fallback;
  }
}
export function loadTodoData(storage: Storage) {
  const warnings: string[] = [];
  const raw = storage.getItem(DATA_KEY);
  let data: TodoData;
  let revision = 0;
  if (raw !== null) {
    const stored = read(storage, DATA_KEY, storedSchema, { ...emptyTodoData(), revision: 0 }, warnings);
    revision = stored.revision;
    data = { todos: stored.todos, customCategories: stored.customCategories, trash: stored.trash };
  } else {
    data = {
      todos: read(storage, "todo-list", todosSchema, [], warnings),
      customCategories: read(storage, "todo-categories", categoriesSchema, [], warnings),
      trash: [],
    };
  }
  data.customCategories = [...new Set([...data.customCategories, ...data.todos.flatMap(todo =>
    todo.category && !predefinedCategories.includes(todo.category) ? [todo.category] : [])])];
  return { data, warnings, revision, raw };
}
export class TodoConflictError extends Error {}
export function saveTodoData(storage: Storage, data: TodoData, revision = 0, expectedRaw?: string | null) {
  const parsed = storedSchema.parse({ ...data, revision });
  if (expectedRaw !== undefined && storage.getItem(DATA_KEY) !== expectedRaw) {
    throw new TodoConflictError("Another tab changed your tasks. Please try again.");
  }
  storage.setItem(DATA_KEY, JSON.stringify(parsed));
}
export function pruneTrash(data: TodoData, now = Date.now()): TodoData {
  return { ...data, trash: data.trash.filter(entry => entry.deletedAt > now - TRASH_RETENTION_MS) };
}
export function parseTodoData(value: unknown): TodoData {
  return dataSchema.parse(value);
}
export function nextTodoData(current: TodoData, change: (current: TodoData) => TodoData, now = Date.now()): TodoData {
  return pruneTrash(dataSchema.parse(change(pruneTrash(current, now))), now);
}

// Every write re-reads shared storage inside the same cross-tab lock.
export async function commitTodoChange(
  storage: Storage,
  locks: Pick<LockManager, "request"> | undefined,
  change: (current: TodoData) => TodoData,
  now = Date.now(),
  guard: { minimumRevision?: number; requireExisting?: boolean } = {},
) {
  if (!locks) throw new Error("Safe saving needs a browser that supports tab coordination. Open this app over HTTPS or localhost in a current browser.");
  return locks.request("daylight-todo-storage", () => {
    const loaded = loadTodoData(storage);
    if ((guard.requireExisting && loaded.raw === null) || loaded.revision < (guard.minimumRevision ?? 0)) {
      throw new TodoConflictError("Saved data was cleared or replaced in another tab. Export your visible tasks and reload before making changes.");
    }
    const data = pruneTrash(dataSchema.parse(change(pruneTrash(loaded.data, now))), now);
    const revision = loaded.revision + 1;
    saveTodoData(storage, data, revision, loaded.raw);
    return { data, revision, warnings: loaded.warnings };
  });
}
export function assertTaskUnchanged(data: TodoData, expected: Todo) {
  const current = data.todos.find(todo => todo.id === expected.id);
  if (!current || JSON.stringify(todoSchema.parse(current)) !== JSON.stringify(todoSchema.parse(expected))) {
    throw new TodoConflictError("This task changed in another tab. Your draft has been kept. Cancel editing to load the latest task, then try again.");
  }
}
export function trashTodos(data: TodoData, ids: string[], now = Date.now()): TodoData {
  const removed = data.todos.filter(todo => ids.includes(todo.id));
  return {
    ...data,
    todos: data.todos.filter(todo => !ids.includes(todo.id)),
    trash: [...data.trash, ...removed.map(todo => ({ todo, deletedAt: now }))],
  };
}
export function restoreTrash(data: TodoData, ids: string[], now = Date.now()): TodoData {
  const current = pruneTrash(data, now);
  const categories = [...predefinedCategories, ...current.customCategories];
  const restoring = current.trash.filter(entry => ids.includes(entry.todo.id));
  return {
    ...current,
    todos: [...current.todos, ...restoring.map(({ todo }) => ({ ...todo,
      category: todo.category && categories.includes(todo.category) ? todo.category : undefined,
    }))],
    trash: current.trash.filter(entry => !ids.includes(entry.todo.id)),
  };
}
const backupSchema = z.object({
  format: z.literal("daylight-backup"), version: z.literal(1),
  exportedAt: z.string().datetime(), data: dataSchema,
});
export function createBackup(data: TodoData, now = Date.now()) {
  return JSON.stringify(backupSchema.parse({
    format: "daylight-backup", version: 1, exportedAt: new Date(now).toISOString(), data: pruneTrash(data, now),
  }), null, 2);
}
export function parseBackup(raw: string, now = Date.now()): TodoData {
  if (new TextEncoder().encode(raw).length > MAX_BACKUP_BYTES) throw new Error("Choose a backup smaller than 5 MB.");
  const backup = backupSchema.safeParse((() => {
    try { return JSON.parse(raw); } catch { throw new Error("This file is not valid JSON. Choose a TodoLizt backup."); }
  })());
  if (!backup.success) throw new Error("This is not a supported TodoLizt backup, or its task data is invalid. No tasks were changed.");
  return pruneTrash(backup.data.data, now);
}
export function mergeGuestTasks(account: TodoData, guest: TodoData, now = Date.now()) {
  const current = pruneTrash(account, now);
  const data = mergeBackup(current, guest, now);
  const tasks = data.todos.length - current.todos.length + data.trash.length - current.trash.length;
  const lists = data.customCategories.filter(name => !current.customCategories.includes(name)).length;
  return { data, tasks, lists };
}
export function mergeBackup(current: TodoData, incoming: TodoData, now = Date.now()): TodoData {
  const existing = new Set([...current.todos.map(todo => todo.id), ...current.trash.map(entry => entry.todo.id)]);
  const todos = incoming.todos.filter(todo => !existing.has(todo.id));
  const trash = incoming.trash.filter(entry => !existing.has(entry.todo.id));
  const names = [...current.customCategories, ...incoming.customCategories, ...todos.flatMap(todo => todo.category ? [todo.category] : [])];
  return pruneTrash({
    todos: [...current.todos, ...todos], trash: [...current.trash, ...trash],
    customCategories: [...new Set(names)].filter(name => !predefinedCategories.includes(name)),
  }, now);
}
export class AgentTaskError extends Error {
  readonly status: 400 | 404 | 409;
  constructor(message: string, status: 400 | 404 | 409) {
    super(message);
    this.name = "AgentTaskError";
    this.status = status;
  }
}
const agentNameSchema = z.string().trim().min(1).max(64);
export function agentName(value: string) {
  const parsed = agentNameSchema.safeParse(value);
  if (!parsed.success) throw new AgentTaskError("Agent name must be 1–64 characters.", 400);
  return parsed.data;
}
function activeTask(data: TodoData, id: string) {
  const todo = data.todos.find(item => item.id === id);
  if (!todo) throw new AgentTaskError("That task was not found.", 404);
  return todo;
}
function replaceTask(data: TodoData, task: Todo): TodoData {
  return { ...data, todos: data.todos.map(todo => todo.id === task.id ? task : todo) };
}
function listedTask(data: TodoData, list?: string) {
  const trimmed = list?.trim() ?? "";
  if (!trimmed) return { data, category: undefined as string | undefined };
  const known = [...predefinedCategories, ...data.customCategories].find(name => name.toLowerCase() === trimmed.toLowerCase());
  if (known) return { data, category: known };
  return { data: { ...data, customCategories: [...data.customCategories, trimmed] }, category: trimmed };
}
function dueStamp(value?: number) {
  if (value === undefined) return undefined;
  if (!Number.isFinite(value) || Number.isNaN(new Date(value).getTime())) throw new AgentTaskError("Due date is not valid.", 400);
  return value;
}
export function taskPriority(value?: string | null): TaskPriority | undefined {
  const priority = value?.trim().toLowerCase() ?? "";
  if (!priority || priority === "none") return undefined;
  const parsed = z.enum(taskPriorities).safeParse(priority);
  if (!parsed.success) throw new AgentTaskError("Priority must be high, medium, or low.", 400);
  return parsed.data;
}
export function taskNote(value?: string) {
  const note = value?.trim() ?? "";
  if (!note) return undefined;
  if (note.length > 2000) throw new AgentTaskError("Note must be 2,000 characters or fewer.", 400);
  return note;
}
export function agentDueDate(value: unknown) {
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value === "number") return dueStamp(value);
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) return dueStamp(Date.parse(`${value}T00:00:00.000Z`));
  throw new AgentTaskError("Due date is not valid.", 400);
}
export function addAgentTask(
  data: TodoData,
  input: { text: string; list?: string; dueDate?: number; agent?: string; priority?: string; note?: string },
  now = Date.now(),
  id = crypto.randomUUID(),
) {
  const text = input.text.trim();
  if (!text) throw new AgentTaskError("Task text cannot be empty.", 400);
  const listed = listedTask(data, input.list);
  const owner = input.agent === undefined || input.agent.trim() === "" ? undefined : agentName(input.agent);
  const dueDate = dueStamp(input.dueDate);
  const priority = taskPriority(input.priority);
  const note = taskNote(input.note);
  const task: Todo = {
    id, text, completed: false, createdAt: now,
    ...(listed.category ? { category: listed.category } : {}),
    ...(dueDate !== undefined ? { dueDate } : {}),
    ...(owner ? { agent: owner } : {}),
    ...(priority ? { priority } : {}),
    ...(note ? { note } : {}),
  };
  return { data: { ...listed.data, todos: [...listed.data.todos, task] }, task };
}
export function claimAgentTask(data: TodoData, id: string, agent: string, now = Date.now()) {
  const name = agentName(agent);
  const todo = activeTask(data, id);
  if (todo.completed) throw new AgentTaskError("That task is already complete.", 409);
  if (todo.agent && todo.agent !== name) throw new AgentTaskError(`Claimed by ${todo.agent}.`, 409);
  const task: Todo = { ...todo, agent: name, updatedAt: now };
  return { data: replaceTask(data, task), task };
}
export function completeAgentTask(data: TodoData, id: string, agent: string, now = Date.now()) {
  const name = agentName(agent);
  const todo = activeTask(data, id);
  if (todo.completed) throw new AgentTaskError("That task is already complete.", 409);
  const task: Todo = { ...todo, agent: todo.agent ?? name, finishedBy: name, completed: true, completedAt: now, updatedAt: now };
  return { data: replaceTask(data, task), task };
}
export function releaseAgentTask(data: TodoData, id: string, agent: string, now = Date.now()) {
  agentName(agent);
  const todo = activeTask(data, id);
  if (!todo.agent) throw new AgentTaskError("That task is not claimed.", 409);
  const task: Todo = { ...todo, updatedAt: now };
  delete task.agent;
  return { data: replaceTask(data, task), task };
}
export function deleteAgentTask(data: TodoData, id: string, agent: string, now = Date.now()) {
  const name = agentName(agent);
  const todo = activeTask(data, id);
  const task: Todo = { ...todo, agent: todo.agent ?? name, finishedBy: todo.finishedBy ?? name, updatedAt: now };
  return { data: trashTodos(replaceTask(data, task), [id], now), task };
}
export function updateAgentTask(
  data: TodoData,
  id: string,
  input: { agent: string; text?: string; list?: string | null; dueDate?: number | null },
  now = Date.now(),
) {
  const name = agentName(input.agent);
  const todo = activeTask(data, id);
  if (todo.completed) throw new AgentTaskError("That task is already complete.", 409);
  if (todo.agent && todo.agent !== name) throw new AgentTaskError(`Claimed by ${todo.agent}.`, 409);
  if (!("text" in input) && !("list" in input) && !("dueDate" in input)) {
    throw new AgentTaskError("Choose text, a list, or a due date to update.", 400);
  }
  let text = todo.text;
  if ("text" in input) {
    text = input.text?.trim() ?? "";
    if (!text) throw new AgentTaskError("Task text cannot be empty.", 400);
  }
  let nextData = data;
  let category = todo.category;
  if ("list" in input) {
    const raw = input.list ?? "";
    if (raw.trim() === "") category = undefined;
    else {
      const listed = listedTask(data, raw);
      nextData = listed.data;
      category = listed.category;
    }
  }
  let dueDate = todo.dueDate;
  if ("dueDate" in input) dueDate = input.dueDate === null ? undefined : dueStamp(input.dueDate);
  const task: Todo = { ...todo, text, agent: name, updatedAt: now };
  if (category) task.category = category;
  else delete task.category;
  if (dueDate !== undefined) task.dueDate = dueDate;
  else delete task.dueDate;
  return { data: replaceTask(nextData, task), task };
}
export function findAgentTask(data: TodoData, id: string) {
  return data.todos.find(todo => todo.id === id) ?? data.trash.find(entry => entry.todo.id === id)?.todo;
}
export function selectAgentTasks(todos: Todo[], status: "open" | "done" | "all", agent?: string, list?: string) {
  const project = list?.trim().toLowerCase();
  return todos.filter(todo =>
    (status === "all" || (status === "done" ? todo.completed : !todo.completed)) &&
    (!agent || todo.agent === agent) &&
    (!project || todo.category?.toLowerCase() === project));
}
export function editTodo(todos: Todo[], id: string, text: string, category?: string, dueDate?: number, priority?: string, note?: string): Todo[] {
  if (!text.trim()) throw new Error("Task text cannot be empty.");
  let nextPriority: TaskPriority | undefined;
  let trimmedNote: string | undefined;
  try { nextPriority = taskPriority(priority); }
  catch (error) { throw new Error(error instanceof Error ? error.message : "Priority must be high, medium, or low."); }
  try { trimmedNote = taskNote(note); }
  catch (error) { throw new Error(error instanceof Error ? error.message : "Note must be 2,000 characters or fewer."); }
  return todos.map(todo => {
    if (todo.id !== id) return todo;
    const next: Todo = { ...todo, text: text.trim(), category, dueDate, updatedAt: Date.now() };
    if (nextPriority) next.priority = nextPriority;
    else delete next.priority;
    if (trimmedNote) next.note = trimmedNote;
    else delete next.note;
    return next;
  });
}
export function renameCategory(data: TodoData, from: string, to: string, now = Date.now()): TodoData {
  const current = from.trim();
  const next = to.trim();
  if (predefinedCategories.includes(current)) throw new Error("That list cannot be renamed.");
  if (!current || !data.customCategories.includes(current)) throw new Error("That list was not found.");
  if (!next) throw new Error("List name cannot be empty.");
  if ([...predefinedCategories, ...data.customCategories].some(name => name !== current && name.toLowerCase() === next.toLowerCase())) {
    throw new Error("List already exists.");
  }
  if (next === current) return data;
  return {
    ...data,
    customCategories: data.customCategories.map(name => name === current ? next : name),
    todos: data.todos.map(todo => todo.category === current ? { ...todo, category: next, updatedAt: now } : todo),
    trash: data.trash.map(entry => entry.todo.category === current ? { ...entry, todo: { ...entry.todo, category: next } } : entry),
  };
}
export function deleteCategory(data: TodoData, category: string): TodoData {
  if (predefinedCategories.includes(category)) return data;
  return {
    ...data,
    customCategories: data.customCategories.filter(name => name !== category),
    todos: data.todos.map(todo => todo.category === category ? { ...todo, category: undefined, updatedAt: Date.now() } : todo),
  };
}
export function restoreTodos(current: Todo[], removed: Todo[], categories: string[]) {
  return [...current, ...removed.filter(todo => !current.some(item => item.id === todo.id)).map(todo => ({
    ...todo, category: todo.category && categories.includes(todo.category) ? todo.category : undefined,
  }))];
}
export function deadline(todo: Todo, now: Date) {
  if (todo.completed || todo.dueDate === undefined) return "none";
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).getTime();
  return todo.dueDate < today ? "overdue" : todo.dueDate < tomorrow ? "today" : "upcoming";
}
export function selectTodos(todos: Todo[], search: string, category: string, status: string, due: string, sort: string, now: Date) {
  const query = search.trim().toLowerCase();
  return todos.filter(todo => (todo.text.toLowerCase().includes(query) || (todo.note?.toLowerCase().includes(query) ?? false)) &&
    (category === "all" || todo.category === decodeCategory(category)) &&
    (status === "All" || (status === "Completed" ? todo.completed : !todo.completed)) &&
    (due === "all" || deadline(todo, now) === due))
    .sort((a, b) => sort === "alphabetical" ? a.text.localeCompare(b.text) :
      sort === "completed-last" ? Number(a.completed) - Number(b.completed) || b.createdAt - a.createdAt :
      sort === "priority" ? (a.priority ? priorityRank[a.priority] : 3) - (b.priority ? priorityRank[b.priority] : 3) || (a.dueDate ?? Infinity) - (b.dueDate ?? Infinity) || b.createdAt - a.createdAt :
      sort === "due-date" ? (a.dueDate ?? Infinity) - (b.dueDate ?? Infinity) || b.createdAt - a.createdAt : b.createdAt - a.createdAt);
}

export function matchesWorkspaceAgent(agent: string | undefined, owner = "all") {
  if (!owner || owner === "all") return true;
  if (owner === "unclaimed") return !agent;
  if (owner.startsWith("agent:")) return agent === owner.slice(6);
  return agent === owner;
}
const builtinViews = new Set(["day", "all", "upcoming", "trash", "completed", "settings"]);
export function workspaceView(value: string | null | undefined) {
  const list = value ? decodeCategory(value) : undefined;
  if (value && (builtinViews.has(value) || (list && value === categoryValue(list)))) return value;
  return "day";
}
export function workspaceTodos(todos: Todo[], view: string, search: string, sort: string, now: Date, owner = "all") {
  if (view === "settings") return [];
  const tasks = todos.filter(todo => {
    if (!matchesWorkspaceAgent(todo.agent, owner)) return false;
    if (view === "day") return ["today", "overdue"].includes(deadline(todo, now));
    if (view === "upcoming") return deadline(todo, now) === "upcoming";
    if (view === "completed") return todo.completed;
    if (view.startsWith("category:")) return todo.category === decodeCategory(view);
    return true;
  });
  return selectTodos(tasks, search, "all", "All", "all", sort, now);
}
