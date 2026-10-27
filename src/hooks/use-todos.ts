"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { deleteCategory, editTodo, loadTodoData, predefinedCategories, restoreTodos, saveTodoData, type TodoData } from "@/lib/todo-store";
import type { Todo } from "@/types/todo";

export function useTodos() {
  const [data, setData] = useState<TodoData>({ todos: [], customCategories: [] });
  const [loaded, setLoaded] = useState(false);
  const [canSave, setCanSave] = useState(false);
  const [storageMessage, setStorageMessage] = useState("");
  const [saveError, setSaveError] = useState("");
  useEffect(() => {
    try {
      const result = loadTodoData(localStorage);
      setData(result.data);
      setStorageMessage(result.warnings.join(" "));
      setCanSave(true);
    } catch {
      setStorageMessage("Saved data could not be read or backed up. Saving is paused to protect it. Reload to retry; changes made now are temporary.");
    }
    setLoaded(true);
  }, []);
  useEffect(() => {
    if (!loaded || !canSave) return;
    try { saveTodoData(localStorage, data); setSaveError(""); }
    catch { setSaveError("Changes could not be saved. Keep this page open and free browser storage, then make a change to retry."); }
  }, [data, loaded, canSave]);
  const categories = [...predefinedCategories, ...data.customCategories];
  const remove = (removed: Todo[]) => {
    if (!removed.length) return;
    setData(current => ({ ...current, todos: current.todos.filter(todo => !removed.some(item => item.id === todo.id)) }));
    toast.success(`${removed.length} task${removed.length === 1 ? "" : "s"} deleted.`, {
      duration: 10000,
      action: { label: "Undo", onClick: () => setData(current => ({ ...current,
        todos: restoreTodos(current.todos, removed, [...predefinedCategories, ...current.customCategories]),
      })) },
    });
  };
  return {
    ...data, loaded, storageMessage: [storageMessage, saveError].filter(Boolean).join(" "), categories,
    add(text: string, category?: string, dueDate?: number) {
      if (!text.trim()) return;
      const todo: Todo = { id: crypto.randomUUID(), text: text.trim(), category, dueDate, completed: false, createdAt: Date.now() };
      setData(current => ({ ...current, todos: [...current.todos, todo] }));
    },
    toggle(id: string) { setData(current => ({ ...current, todos: current.todos.map(todo => todo.id === id ? {
      ...todo, completed: !todo.completed, completedAt: !todo.completed ? Date.now() : undefined,
    } : todo) })); },
    edit(id: string, text: string, category?: string, dueDate?: number) {
      setData(current => ({ ...current, todos: editTodo(current.todos, id, text, category, dueDate) }));
    },
    remove(id: string) { remove(data.todos.filter(todo => todo.id === id)); },
    clearCompleted() { remove(data.todos.filter(todo => todo.completed)); },
    addCategory(name: string) {
      if (!name.trim()) return "Category name cannot be empty.";
      if (categories.some(category => category.toLowerCase() === name.trim().toLowerCase())) return "Category already exists.";
      setData(current => ({ ...current, customCategories: [...current.customCategories, name.trim()] }));
      return "";
    },
    deleteCategory(name: string) { setData(current => deleteCategory(current, name)); },
  };
}
