"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  assertTaskUnchanged, commitTodoChange, createBackup, DATA_KEY, deleteCategory,
  editTodo, emptyTodoData, loadTodoData, mergeBackup, predefinedCategories,
  pruneTrash, restoreTrash, trashTodos, TodoConflictError, type TodoData,
} from "@/lib/todo-store";
import type { Todo } from "@/types/todo";

export function useTodos() {
  const [data, setData] = useState<TodoData>(emptyTodoData);
  const [loaded, setLoaded] = useState(false);
  const [writable, setWritable] = useState(false);
  const [pending, setPending] = useState(0);
  const [storageMessage, setStorageMessage] = useState("");
  const [saveError, setSaveError] = useState("");
  const dataRef = useRef(data);
  const revision = useRef(-1);
  const canWrite = useRef(false);
  const hadDocument = useRef(false);
  const mounted = useRef(false);

  const apply = (next: TodoData, nextRevision: number) => {
    if (!mounted.current || nextRevision < revision.current) return;
    revision.current = nextRevision;
    dataRef.current = next;
    setData(next);
  };
  const mutate = async (change: (current: TodoData) => TodoData, notify = true): Promise<string> => {
    if (!canWrite.current) {
      const error = "Saving is paused. Export a backup of your tasks, then reload to retry.";
      if (notify) toast.error(error);
      return error;
    }
    setPending(count => count + 1);
    try {
      const result = await commitTodoChange(localStorage, navigator.locks, change, Date.now(), {
        minimumRevision: Math.max(0, revision.current), requireExisting: hadDocument.current,
      });
      hadDocument.current = true;
      apply(result.data, result.revision);
      setStorageMessage(result.warnings.join(" "));
      setSaveError("");
      return "";
    } catch (error) {
      const message = error instanceof TodoConflictError ? error.message :
        error instanceof Error && error.name === "QuotaExceededError" ? "Browser storage is full. Export a backup or free space, then retry. Your change was not saved." :
        error instanceof Error ? error.message : "Your change could not be saved. Please retry.";
      if (!(error instanceof TodoConflictError)) setSaveError(message);
      if (notify) toast.error(message);
      return message;
    } finally {
      if (mounted.current) setPending(count => count - 1);
    }
  };

  useEffect(() => {
    mounted.current = true;
    const pause = (message: string) => {
      canWrite.current = false; setWritable(false); setStorageMessage(message);
    };
    const refresh = () => {
      try {
        if (hadDocument.current && localStorage.getItem(DATA_KEY) === null) {
          pause("Saved data was cleared in another tab. Export your visible tasks and reload before making changes.");
          return;
        }
        const result = loadTodoData(localStorage);
        hadDocument.current = result.raw !== null;
        apply(result.data, result.revision);
        if (result.warnings.length) setStorageMessage(result.warnings.join(" "));
      } catch {
        pause("Saved data could not be read or backed up. Saving is paused to protect it. Export your currently visible tasks and reload to retry.");
      }
    };
    try {
      const result = loadTodoData(localStorage);
      hadDocument.current = result.raw !== null;
      apply(result.data, result.revision);
      setStorageMessage(result.warnings.join(" "));
      canWrite.current = !!navigator.locks;
      setWritable(canWrite.current);
      if (!canWrite.current) setStorageMessage("Safe saving requires HTTPS or localhost in a current browser. You can still view and export your tasks.");
    } catch {
      pause("Saved data could not be read or backed up. Saving is paused to protect it. Reload to retry.");
    }
    setLoaded(true);
    const onStorage = (event: StorageEvent) => {
      if (event.storageArea !== localStorage || (event.key !== DATA_KEY && event.key !== null)) return;
      if (localStorage.getItem(DATA_KEY) === null) {
        pause("Saved data was cleared in another tab. Your visible tasks are available for export. Reload before making new changes.");
        return;
      }
      refresh();
    };
    const cleanup = () => {
      if (canWrite.current && pruneTrash(dataRef.current).trash.length !== dataRef.current.trash.length) {
        void mutate(current => pruneTrash(current), false);
      }
    };
    const onFocus = () => { refresh(); cleanup(); };
    cleanup();
    const timer = window.setInterval(cleanup, 60000);
    window.addEventListener("storage", onStorage);
    window.addEventListener("focus", onFocus);
    return () => {
      mounted.current = false;
      window.clearInterval(timer);
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("focus", onFocus);
    };
    // Listeners read current state through refs; changing tasks must not reinitialize storage.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const categories = [...predefinedCategories, ...data.customCategories];
  const restore = async (ids: string[]) => !(await mutate(current => restoreTrash(current, ids)));
  const remove = async (ids: string[]) => {
    const expected = dataRef.current.todos.filter(todo => ids.includes(todo.id));
    if (!expected.length) return;
    const error = await mutate(current => {
      expected.forEach(todo => assertTaskUnchanged(current, todo));
      return trashTodos(current, ids);
    });
    if (!error) toast.success(`${expected.length} task${expected.length === 1 ? "" : "s"} moved to Trash.`, {
      duration: 10000,
      action: { label: "Undo", onClick: () => { void restore(ids); } },
    });
  };
  const validCategory = (current: TodoData, name?: string) => {
    if (name && ![...predefinedCategories, ...current.customCategories].includes(name)) {
      throw new TodoConflictError("That list was removed in another tab. Choose a different list and retry.");
    }
    return name;
  };
  return {
    ...data, trash: pruneTrash(data).trash, loaded, writable, busy: pending > 0,
    storageMessage: [storageMessage, saveError].filter(Boolean).join(" "), categories,
    async add(text: string, category?: string, dueDate?: number) {
      if (!text.trim()) return false;
      const todo: Todo = { id: crypto.randomUUID(), text: text.trim(), category, dueDate, completed: false, createdAt: Date.now() };
      return !(await mutate(current => {
        validCategory(current, category);
        return { ...current, todos: [...current.todos, todo] };
      }));
    },
    async toggle(id: string) {
      const expected = dataRef.current.todos.find(todo => todo.id === id);
      if (!expected) return;
      await mutate(current => {
        assertTaskUnchanged(current, expected);
        return { ...current, todos: current.todos.map(todo => todo.id === id ? {
          ...todo, completed: !todo.completed, updatedAt: Date.now(), completedAt: !todo.completed ? Date.now() : undefined,
        } : todo) };
      });
    },
    async edit(id: string, text: string, category: string | undefined, dueDate: number | undefined, expected: Todo) {
      return !(await mutate(current => {
        assertTaskUnchanged(current, expected);
        validCategory(current, category);
        return { ...current, todos: editTodo(current.todos, id, text, category, dueDate) };
      }));
    },
    remove(id: string) { return remove([id]); },
    clearCompleted() { return remove(dataRef.current.todos.filter(todo => todo.completed).map(todo => todo.id)); },
    restore,
    async addCategory(name: string) {
      return mutate(current => {
        if (!name.trim()) throw new Error("List name cannot be empty.");
        if ([...predefinedCategories, ...current.customCategories].some(category => category.toLowerCase() === name.trim().toLowerCase())) {
          throw new Error("List already exists.");
        }
        return { ...current, customCategories: [...current.customCategories, name.trim()] };
      }, false);
    },
    async deleteCategory(name: string) { return !(await mutate(current => deleteCategory(current, name))); },
    async importBackup(incoming: TodoData) { return !(await mutate(current => mergeBackup(current, incoming))); },
    exportBackup() { return createBackup(dataRef.current); },
  };
}

export type TodoStore = ReturnType<typeof useTodos>;
