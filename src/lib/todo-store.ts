import { z } from "zod";
import type { Todo } from "../types/todo";

export const predefinedCategories = ["Work", "Personal", "Shopping"];
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
export function editTodo(todos: Todo[], id: string, text: string, category?: string, dueDate?: number): Todo[] {
  if (!text.trim()) throw new Error("Task text cannot be empty.");
  return todos.map(todo => todo.id === id ? { ...todo, text: text.trim(), category, dueDate, updatedAt: Date.now() } : todo);
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
  return todos.filter(todo => todo.text.toLowerCase().includes(search.trim().toLowerCase()) &&
    (category === "all" || todo.category === decodeCategory(category)) &&
    (status === "All" || (status === "Completed" ? todo.completed : !todo.completed)) &&
    (due === "all" || deadline(todo, now) === due))
    .sort((a, b) => sort === "alphabetical" ? a.text.localeCompare(b.text) :
      sort === "completed-last" ? Number(a.completed) - Number(b.completed) || b.createdAt - a.createdAt :
      sort === "due-date" ? (a.dueDate ?? Infinity) - (b.dueDate ?? Infinity) || b.createdAt - a.createdAt : b.createdAt - a.createdAt);
}

export function workspaceTodos(todos: Todo[], view: string, search: string, sort: string, now: Date) {
  const tasks = todos.filter(todo => {
    if (view === "day") return ["today", "overdue"].includes(deadline(todo, now));
    if (view === "upcoming") return deadline(todo, now) === "upcoming";
    if (view === "completed") return todo.completed;
    if (view.startsWith("category:")) return todo.category === decodeCategory(view);
    return true;
  });
  return selectTodos(tasks, search, "all", "All", "all", sort, now);
}
