import { z } from "zod";
import type { Todo } from "../types/todo";

export const predefinedCategories = ["Work", "Personal", "Shopping"];
export const categoryValue = (name: string) => `category:${name}`;
export const decodeCategory = (value: string) => value.startsWith("category:") ? value.slice(9) : undefined;
const timestamp = z.number().finite().refine(value => !Number.isNaN(new Date(value).getTime()));
const todoSchema = z.object({
  id: z.string().min(1), text: z.string().trim().min(1), completed: z.boolean(),
  category: z.string().trim().min(1).optional(), createdAt: timestamp,
  updatedAt: timestamp.optional(), completedAt: timestamp.optional(), dueDate: timestamp.optional(),
});
const todosSchema = z.array(todoSchema).refine(items => new Set(items.map(item => item.id)).size === items.length);
const categoriesSchema = z.array(z.string().trim().min(1)).transform(items =>
  [...new Set(items)].filter(name => !predefinedCategories.includes(name)));
export type TodoData = { todos: Todo[]; customCategories: string[] };
type Storage = Pick<globalThis.Storage, "getItem" | "setItem">;
const DATA_KEY = "todo-data-v1";
const dataSchema = z.object({ todos: todosSchema, customCategories: categoriesSchema });

// Invalid originals must be backed up successfully before they can be replaced.
function read<T>(storage: Storage, key: string, schema: z.ZodType<T, z.ZodTypeDef, unknown>, fallback: T, warnings: string[]): T {
  const raw = storage.getItem(key);
  if (raw === null) return fallback;
  try { return schema.parse(JSON.parse(raw)); }
  catch {
    storage.setItem(`${key}.recovery.${crypto.randomUUID()}`, raw);
    warnings.push(`Invalid saved data in ${key} was preserved in a recovery copy.`);
    return fallback;
  }
}
export function loadTodoData(storage: Storage) {
  const warnings: string[] = [];
  let data: TodoData;
  if (storage.getItem(DATA_KEY) !== null) {
    data = read(storage, DATA_KEY, dataSchema, { todos: [], customCategories: [] }, warnings);
  } else {
    data = {
      todos: read(storage, "todo-list", todosSchema, [], warnings),
      customCategories: read(storage, "todo-categories", categoriesSchema, [], warnings),
    };
  }
  // Preserve task categories even if the legacy category list is missing.
  data.customCategories = [...new Set([...data.customCategories, ...data.todos.flatMap(todo =>
    todo.category && !predefinedCategories.includes(todo.category) ? [todo.category] : [])])];
  return { data, warnings };
}
export function saveTodoData(storage: Storage, data: TodoData) {
  storage.setItem(DATA_KEY, JSON.stringify(dataSchema.parse(data)));
}
export function editTodo(todos: Todo[], id: string, text: string, category?: string, dueDate?: number): Todo[] {
  if (!text.trim()) throw new Error("Task text cannot be empty.");
  return todos.map(todo => todo.id === id ? { ...todo, text: text.trim(), category, dueDate, updatedAt: Date.now() } : todo);
}
export function deleteCategory(data: TodoData, category: string): TodoData {
  if (predefinedCategories.includes(category)) return data;
  return {
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
