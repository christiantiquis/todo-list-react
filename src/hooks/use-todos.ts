"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  assertTaskUnchanged, commitTodoChange, createBackup, DATA_KEY, deleteCategory, renameCategory,
  editTodo, emptyTodoData, loadTodoData, mergeBackup, mergeGuestTasks, nextTodoData, parseTodoData, predefinedCategories, taskPriority,
  pruneTrash, restoreTrash, saveTodoData, trashTodos, TodoConflictError, type TodoData,
} from "@/lib/todo-store";
import type { Todo } from "@/types/todo";

class SessionExpired extends Error {}

async function saveAccountChange(current: TodoData, expectedRevision: number, change: (current: TodoData) => TodoData) {
  const data = nextTodoData(current, change);
  const response = await fetch("/api/data", {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ data, revision: expectedRevision }),
  });
  const body = await response.json().catch(() => ({})) as { data?: unknown; revision?: number; error?: string };
  if (response.status === 409) throw new TodoConflictError(body.error ?? "Another session changed your tasks. Please try again.");
  if (response.status === 401) throw new SessionExpired();
  if (!response.ok) throw new Error(body.error ?? "Your change could not be saved. Please retry.");
  const saved = parseTodoData(body.data);
  const nextRevision = Number(body.revision);
  try { saveTodoData(localStorage, saved, nextRevision); } catch { /* The server accepted the change. */ }
  return { data: saved, revision: nextRevision };
}

export function useTodos() {
  const [data, setData] = useState<TodoData>(emptyTodoData);
  const [loaded, setLoaded] = useState(false);
  const [writable, setWritable] = useState(false);
  const [pending, setPending] = useState(0);
  const busy = useRef(0);
  const [storageMessage, setStorageMessage] = useState("");
  const [saveError, setSaveError] = useState("");
  const [accountEmail, setAccountEmail] = useState("");
  const dataRef = useRef(data);
  const revision = useRef(-1);
  const canWrite = useRef(false);
  const hadDocument = useRef(false);
  const mounted = useRef(false);
  const account = useRef(false);

  const apply = (next: TodoData, nextRevision: number, force = false) => {
    if (!mounted.current || (!force && nextRevision <= revision.current)) return;
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
    startWork();
    try {
      const result = account.current
        ? await saveAccountChange(dataRef.current, revision.current, change)
        : await commitTodoChange(localStorage, navigator.locks, change, Date.now(), {
          minimumRevision: Math.max(0, revision.current), requireExisting: hadDocument.current,
        });
      hadDocument.current = true;
      apply(result.data, result.revision);
      setStorageMessage("warnings" in result ? result.warnings.join(" ") : "");
      setSaveError("");
      return "";
    } catch (error) {
      if (error instanceof SessionExpired) {
        leaveAccount();
        const message = "Your session expired. Log in again.";
        if (notify) toast.error(message);
        return message;
      }
      const message = error instanceof TodoConflictError ? error.message :
        error instanceof Error && error.name === "QuotaExceededError" ? "Browser storage is full. Export a backup or free space, then retry. Your change was not saved." :
        error instanceof Error ? error.message : "Your change could not be saved. Please retry.";
      if (!(error instanceof TodoConflictError)) setSaveError(message);
      if (notify) toast.error(message);
      return message;
    } finally {
      finishWork();
    }
  };

  const openGuest = (force = false) => {
    const result = loadTodoData(localStorage);
    hadDocument.current = result.raw !== null;
    apply(result.data, result.revision, force);
    setStorageMessage(result.warnings.join(" "));
    canWrite.current = !!navigator.locks;
    setWritable(canWrite.current);
    if (!canWrite.current) setStorageMessage("Safe saving requires HTTPS or localhost in a current browser. You can still view and export your tasks.");
  };
  const pullAccount = async (force = true) => {
    const response = await fetch("/api/data");
    if (response.status === 401) throw new SessionExpired();
    if (!response.ok) throw new Error("Your account tasks could not be loaded.");
    const body = await response.json() as { data: unknown; revision: number };
    const parsed = parseTodoData(body.data);
    try { saveTodoData(localStorage, parsed, body.revision); } catch { /* The account copy remains available from the server. */ }
    hadDocument.current = true;
    apply(parsed, body.revision, force);
  };
  const startWork = () => {
    busy.current += 1;
    setPending(count => count + 1);
  };
  const finishWork = () => {
    busy.current = Math.max(0, busy.current - 1);
    if (mounted.current) setPending(count => count - 1);
  };
  const leaveAccount = () => {
    account.current = false;
    setAccountEmail("");
    openGuest(true);
  };

  useEffect(() => {
    mounted.current = true;
    const pause = (message: string) => {
      canWrite.current = false; setWritable(false); setStorageMessage(message);
    };
    const refresh = () => {
      try {
        if (account.current) return;
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
    const start = async () => {
      let email = "";
      try {
        const response = await fetch("/api/session");
        if (response.ok) email = ((await response.json()) as { email?: string | null }).email ?? "";
      } catch { email = ""; }
      if (!mounted.current) return;
      if (email) {
        account.current = true;
        setAccountEmail(email);
        try {
          await pullAccount();
          canWrite.current = true;
          setWritable(true);
          setStorageMessage("");
        } catch (error) {
          if (error instanceof SessionExpired) leaveAccount();
          else pause("Your account tasks could not be loaded. Saving is paused. Reload to retry.");
        }
      } else {
        try { openGuest(); } catch {
          pause("Saved data could not be read or backed up. Saving is paused to protect it. Reload to retry.");
        }
      }
      if (mounted.current) setLoaded(true);
    };
    void start();
    const onStorage = (event: StorageEvent) => {
      if (event.storageArea !== localStorage || (event.key !== DATA_KEY && event.key !== null)) return;
      if (account.current) {
        try {
          const result = loadTodoData(localStorage);
          if (result.raw !== null) apply(result.data, result.revision);
        } catch { /* A focus reload reads the account copy from the server. */ }
        return;
      }
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
    const onFocus = () => {
      if (account.current) {
        void pullAccount().catch(error => {
          if (error instanceof SessionExpired) leaveAccount();
          else setStorageMessage("Your account tasks could not be reloaded.");
        });
        return;
      }
      refresh();
      cleanup();
    };
    const timer = window.setInterval(cleanup, 60000);
    const poll = window.setInterval(() => {
      if (!account.current || busy.current > 0 || document.visibilityState !== "visible") return;
      void pullAccount(false).catch(error => {
        if (error instanceof SessionExpired) leaveAccount();
      });
    }, 15000);
    window.addEventListener("storage", onStorage);
    window.addEventListener("focus", onFocus);
    return () => {
      mounted.current = false;
      window.clearInterval(timer);
      window.clearInterval(poll);
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
    ...data, trash: pruneTrash(data).trash, loaded, writable, busy: pending > 0, accountEmail,
    storageMessage: [storageMessage, saveError].filter(Boolean).join(" "), categories,
    async login(email: string, password: string) {
      let guest = emptyTodoData();
      try { guest = loadTodoData(localStorage).data; } catch { guest = emptyTodoData(); }
      startWork();
      try {
        const response = await fetch("/api/login", {
          method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email, password }),
        });
        const body = await response.json().catch(() => ({})) as { email?: string; error?: string };
        if (!response.ok) return body.error ?? "Could not log in.";
        account.current = true;
        await pullAccount();
        setAccountEmail(body.email ?? email.trim().toLowerCase());
        canWrite.current = true;
        setWritable(true);
        setStorageMessage("");
        setSaveError("");
        const preview = mergeGuestTasks(dataRef.current, guest);
        if (preview.tasks || preview.lists) {
          const error = await mutate(current => mergeGuestTasks(current, guest).data, false);
          if (error) {
            try { localStorage.setItem(`${DATA_KEY}.guest-recovery`, JSON.stringify(guest)); } catch { /* The account copy remains available. */ }
            toast.error("Signed in, but browser tasks could not be added. A recovery copy was kept in this browser.");
          } else toast.success(preview.tasks === 1 && !preview.lists ? "1 browser task was added to your account." : preview.tasks > 0 ? `${preview.tasks} browser tasks were added to your account.` : preview.lists === 1 ? "1 browser list was added to your account." : `${preview.lists} browser lists were added to your account.`);
        }
        return "";
      } catch {
        account.current = false;
        await fetch("/api/logout", { method: "POST" }).catch(() => undefined);
        try { openGuest(true); } catch { /* The visible list stays as it was. */ }
        return "Could not load your account tasks.";
      } finally {
        finishWork();
      }
    },
    async logout() {
      await fetch("/api/logout", { method: "POST" }).catch(() => undefined);
      account.current = false;
      setAccountEmail("");
      try { openGuest(); } catch {
        canWrite.current = false; setWritable(false);
        setStorageMessage("Saved data could not be read. Reload to retry.");
      }
    },
    async add(text: string, category?: string, dueDate?: number, priority?: string) {
      if (!text.trim()) return false;
      const id = crypto.randomUUID();
      const createdAt = Date.now();
      return !(await mutate(current => {
        validCategory(current, category);
        const rank = taskPriority(priority);
        const todo: Todo = { id, text: text.trim(), category, dueDate, completed: false, createdAt, ...(rank ? { priority: rank } : {}) };
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
    async edit(id: string, text: string, category: string | undefined, dueDate: number | undefined, priority: string, note: string, expected: Todo) {
      return !(await mutate(current => {
        assertTaskUnchanged(current, expected);
        validCategory(current, category);
        return { ...current, todos: editTodo(current.todos, id, text, category, dueDate, priority, note) };
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
    async renameCategory(from: string, to: string) { return mutate(current => renameCategory(current, from, to), false); },
    async deleteCategory(name: string) { return !(await mutate(current => deleteCategory(current, name))); },
    async importBackup(incoming: TodoData) { return !(await mutate(current => mergeBackup(current, incoming))); },
    exportBackup() { return createBackup(dataRef.current); },
  };
}

export type TodoStore = ReturnType<typeof useTodos>;
