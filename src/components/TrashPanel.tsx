"use client";

import { format } from "date-fns";
import { RotateCcw, Trash2 } from "lucide-react";
import type { TodoStore } from "@/hooks/use-todos";
import { TRASH_RETENTION_MS } from "@/lib/todo-store";
import { Button } from "@/components/ui/button";

export function TrashPanel({ store, search, now }: { store: TodoStore; search: string; now: Date }) {
  const items = store.trash.filter(entry => entry.todo.text.toLowerCase().includes(search.trim().toLowerCase()))
    .sort((a, b) => b.deletedAt - a.deletedAt);
  return <section aria-label="Deleted tasks">
    <div className="mb-5 flex flex-wrap items-center justify-between gap-3"><p className="text-sm" aria-live="polite">{items.length} {items.length === 1 ? "task" : "tasks"} in Trash</p>{items.length > 0 && <Button variant="outline" size="sm" disabled={store.busy || !store.writable} onClick={() => { void store.restore(items.map(entry => entry.todo.id)); }}>Restore {search.trim() ? "matching" : "all"}</Button>}</div>
    {items.length === 0 ? <div className="rounded-2xl border border-dashed px-6 py-14 text-center"><Trash2 className="mx-auto mb-4 h-7 w-7 text-muted-foreground" /><h2 className="font-medium">{search.trim() ? "No matching deleted tasks" : "Your Trash is empty"}</h2><p className="mt-2 text-sm text-muted-foreground">Deleted tasks can be restored here for 30 days.</p></div> : <ul className="divide-y overflow-hidden rounded-xl border bg-card">{items.map(({ todo, deletedAt }) => {
      const days = Math.min(30, Math.max(1, Math.ceil((deletedAt + TRASH_RETENTION_MS - now.getTime()) / 86400000)));
      return <li key={todo.id} className="flex flex-wrap items-center gap-3 p-4"><div className="min-w-0 flex-1"><p className="break-words text-sm font-medium">{todo.text}</p><p className="mt-1 break-words text-xs text-muted-foreground">Deleted {format(deletedAt, "MMM d, yyyy")} · {days} {days === 1 ? "day" : "days"} left{todo.category && ` · ${todo.category}`}</p></div><Button variant="ghost" size="sm" disabled={store.busy || !store.writable} aria-label={`Restore ${todo.text}`} onClick={() => { void store.restore([todo.id]); }}><RotateCcw className="mr-2 h-3.5 w-3.5" />Restore</Button></li>;
    })}</ul>}
    <p className="mt-4 text-xs leading-relaxed text-muted-foreground">Tasks expire 30 days after deletion. Expired tasks are removed when the app is open. Restored tasks return to their original list if it still exists.</p>
  </section>;
}
