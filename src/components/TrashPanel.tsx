"use client";

import type { ReactNode } from "react";
import { format } from "date-fns";
import { RotateCcw, Trash2 } from "lucide-react";
import type { TodoStore } from "@/hooks/use-todos";
import { matchesWorkspaceAgent, TRASH_RETENTION_MS } from "@/lib/todo-store";
import { Button } from "@/components/ui/button";

export function TrashPanel({ store, search, now, owner = "all", ownerLabel = "", filter }: { store: TodoStore; search: string; now: Date; owner?: string; ownerLabel?: string; filter?: ReactNode }) {
  const query = search.trim().toLowerCase();
  const items = store.trash.filter(entry => matchesWorkspaceAgent(entry.todo.agent, owner) && (entry.todo.text.toLowerCase().includes(query) || (entry.todo.note?.toLowerCase().includes(query) ?? false)))
    .sort((a, b) => b.deletedAt - a.deletedAt);
  return <section aria-label="Deleted tasks">
    <div className="mb-5 flex flex-wrap items-center justify-between gap-3"><p className="text-sm" aria-live="polite">{items.length} {items.length === 1 ? "task" : "tasks"} in Trash{ownerLabel && ` · ${ownerLabel}`}</p><div className="flex items-center gap-2">{filter}{items.length > 0 && <Button variant="outline" size="sm" disabled={store.busy || !store.writable} onClick={() => { void store.restore(items.map(entry => entry.todo.id)); }}>Restore {search.trim() || owner !== "all" ? "matching" : "all"}</Button>}</div></div>
    {items.length === 0 ? <div className="rounded-2xl border border-dashed px-6 py-14 text-center"><Trash2 className="mx-auto mb-4 h-7 w-7 text-muted-foreground" /><h2 className="font-medium">{search.trim() || owner !== "all" ? "No matching deleted tasks" : "Your Trash is empty"}</h2><p className="mt-2 text-sm text-muted-foreground">{ownerLabel ? `Nothing in Trash for ${ownerLabel}.` : "Deleted tasks can be restored here for 30 days."}</p></div> : <ul className="divide-y overflow-hidden rounded-xl border bg-card">{items.map(({ todo, deletedAt }) => {
      const days = Math.min(30, Math.max(1, Math.ceil((deletedAt + TRASH_RETENTION_MS - now.getTime()) / 86400000)));
      return <li key={todo.id} className="flex flex-wrap items-center gap-3 p-4"><div className="min-w-0 flex-1"><p className="break-words text-sm font-medium">{todo.text}</p>{todo.note && <p className="mt-1 line-clamp-2 whitespace-pre-wrap break-words text-xs text-muted-foreground">{todo.note}</p>}<p className="mt-1 break-words text-xs text-muted-foreground">Deleted {format(deletedAt, "MMM d, yyyy")} · {days} {days === 1 ? "day" : "days"} left{todo.category && ` · ${todo.category}`}</p></div><Button variant="ghost" size="sm" disabled={store.busy || !store.writable} aria-label={`Restore ${todo.text}`} onClick={() => { void store.restore([todo.id]); }}><RotateCcw className="mr-2 h-3.5 w-3.5" />Restore</Button></li>;
    })}</ul>}
    <p className="mt-4 text-xs leading-relaxed text-muted-foreground">Tasks expire 30 days after deletion. Expired tasks are removed when the app is open. Restored tasks return to their original list if it still exists.</p>
  </section>;
}
