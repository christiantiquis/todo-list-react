"use client";

import { useRef, useState } from "react";
import { Archive, Download, Upload } from "lucide-react";
import { toast } from "sonner";
import type { TodoStore } from "@/hooks/use-todos";
import { MAX_BACKUP_BYTES, mergeBackup, parseBackup, type TodoData } from "@/lib/todo-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

export function BackupDialog({ store }: { store: TodoStore }) {
  const [incoming, setIncoming] = useState<TodoData | null>(null);
  const [filename, setFilename] = useState("");
  const [error, setError] = useState("");
  const [reading, setReading] = useState(false);
  const [working, setWorking] = useState(false);
  const request = useRef(0);
  const merged = incoming ? mergeBackup(store, incoming) : null;
  const addedTasks = merged ? merged.todos.length - store.todos.length : 0;
  const addedTrash = merged ? merged.trash.length - store.trash.length : 0;
  const download = () => {
    try {
      const url = URL.createObjectURL(new Blob([store.exportBackup()], { type: "application/json" }));
      const link = document.createElement("a");
      link.href = url;
      link.download = `todolizt-backup-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(link); link.click(); link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 10000);
    } catch { setError("The backup could not be created. Please retry."); }
  };
  const chooseFile = async (file?: File) => {
    const currentRequest = ++request.current;
    setIncoming(null); setFilename(""); setError(""); setReading(false);
    if (!file) return;
    if (file.size > MAX_BACKUP_BYTES) { setError("Choose a backup smaller than 5 MB."); return; }
    setReading(true);
    try {
      const parsed = parseBackup(await file.text());
      if (request.current !== currentRequest) return;
      setIncoming(parsed); setFilename(file.name);
    } catch (problem) {
      if (request.current === currentRequest) setError(problem instanceof Error ? problem.message : "The file could not be read.");
    } finally { if (request.current === currentRequest) setReading(false); }
  };
  const importFile = async () => {
    if (!incoming || working) return;
    setWorking(true);
    try {
      if (await store.importBackup(incoming)) {
        toast.success("Backup merged. Existing tasks were kept.");
        setIncoming(null); setFilename(""); setError("");
      } else setError("Nothing was imported. Resolve the saving warning and retry.");
    } finally { setWorking(false); }
  };
  return <Dialog onOpenChange={() => {
    request.current++; setIncoming(null); setFilename(""); setError(""); setReading(false);
  }}>
    <DialogTrigger asChild><Button disabled={!store.loaded} variant="ghost" className="h-10 w-full justify-start gap-2.5 rounded-none px-3 text-sm text-muted-foreground"><Archive className="h-4 w-4" />Data & backup</Button></DialogTrigger>
    <DialogContent className="max-h-[85dvh] max-w-[calc(100%-2rem)] overflow-y-auto sm:max-w-lg">
      <DialogHeader><DialogTitle>Data & backup</DialogTitle><DialogDescription>Download a copy of your tasks, lists, and Trash. Keep it somewhere safe so you can restore it later.</DialogDescription></DialogHeader>
      <section className="space-y-3 rounded-xl border p-4" aria-label="Export backup">
        <h3 className="text-sm font-medium">Take your tasks with you</h3>
        <p className="text-xs leading-relaxed text-muted-foreground">Backups are readable JSON files. They stay on your device and include tasks in Trash that have not expired.</p>
        <Button variant="outline" onClick={download}><Download className="mr-2 h-4 w-4" />Export backup</Button>
      </section>
      <section className="space-y-3 rounded-xl border p-4" aria-label="Import backup">
        <label htmlFor="backup-file" className="block text-sm font-medium">Restore from a TodoLizt backup</label>
        <p className="text-xs leading-relaxed text-muted-foreground">Import adds missing tasks and lists. Tasks with IDs already in your app, including Trash, stay unchanged. Expired Trash is skipped.</p>
        <Input id="backup-file" type="file" accept=".json,application/json" disabled={working || !store.writable} onChange={event => { void chooseFile(event.target.files?.[0]); event.target.value = ""; }} />
        {reading && <p role="status" className="text-xs text-muted-foreground">Checking backup…</p>}
        {incoming && <div className="space-y-3" role="status"><p className="break-words text-xs text-muted-foreground">{filename}: {addedTasks} new tasks and {addedTrash} Trash items. {incoming.todos.length + incoming.trash.length - addedTasks - addedTrash} existing tasks will be skipped. Missing lists will be added.</p><Button onClick={() => { void importFile(); }} disabled={working || store.busy || !store.writable}><Upload className="mr-2 h-4 w-4" />{working ? "Importing…" : "Merge backup"}</Button></div>}
      </section>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      <p className="text-xs leading-relaxed text-muted-foreground">Storage is still local to this browser. Clearing site data also removes Trash and recovery copies; downloaded backups are separate.</p>
    </DialogContent>
  </Dialog>;
}
