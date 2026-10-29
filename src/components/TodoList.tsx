"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { format } from "date-fns";
import { ArrowDownWideNarrow, CalendarDays, CheckCheck, ChevronDown, CircleCheck, Folder, Inbox, ListTodo, Menu, Plus, Search, Settings, Sun, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { useTodos } from "@/hooks/use-todos";
import { categoryValue, deadline, decodeCategory, predefinedCategories, workspaceTodos } from "@/lib/todo-store";
import { assetPath } from "@/lib/asset-path";
import { cn } from "@/lib/utils";
import { TodoItem } from "@/components/TodoItem";
import { AccountPanel } from "@/components/AccountPanel";
import { SettingsPanel } from "@/components/SettingsPanel";
import { TrashPanel } from "@/components/TrashPanel";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const views = [
  { id: "day", title: "My Day", icon: Sun, description: "A little focus goes a long way. Here’s what needs your attention today." },
  { id: "all", title: "All Tasks", icon: Inbox, description: "Everything on your mind, all in one place." },
  { id: "upcoming", title: "Upcoming", icon: CalendarDays, description: "A clear view of what’s coming next." },
  { id: "trash", title: "Trash", icon: Trash2, description: "Deleted tasks stay here for 30 days, ready to restore." },
  { id: "completed", title: "Completed", icon: CircleCheck, description: "Take a moment to see how far you’ve come." },
  { id: "settings", title: "Settings", icon: Settings, description: "Appearance, your account, API tokens, and backups." },
];

export function TodoList() {
  const store = useTodos();
  const [view, setView] = useState("day");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("due-date");
  const [text, setText] = useState("");
  const [category, setCategory] = useState("none");
  const [dueDate, setDueDate] = useState(() => format(new Date(), "yyyy-MM-dd"));
  const [options, setOptions] = useState(false);
  const [mobileNav, setMobileNav] = useState(false);
  const [newList, setNewList] = useState("");
  const [listError, setListError] = useState("");
  const [manageOpen, setManageOpen] = useState(false);
  const [now, setNow] = useState(() => new Date());
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 30000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!store.loaded) return;
    const list = decodeCategory(view);
    if (list && !store.categories.includes(list)) { setView("all"); setSearch(""); }
    const selected = decodeCategory(category);
    if (selected && !store.categories.includes(selected)) setCategory("none");
  }, [store.loaded, store.categories, view, category]);

  const navigate = (next: string) => {
    setView(next); setSearch(""); setMobileNav(false);
    setCategory(next.startsWith("category:") ? next : "none");
    const defaultDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + (next === "upcoming" ? 1 : 0));
    setDueDate(next === "day" || next === "upcoming" ? format(defaultDate, "yyyy-MM-dd") : "");
  };
  const visible = view === "trash" || view === "settings" ? [] : workspaceTodos(store.todos, view, search, sort, now);
  const active = visible.filter(todo => !todo.completed);
  const completed = visible.filter(todo => todo.completed);
  const selectedList = decodeCategory(view);
  const current = views.find(item => item.id === view);
  const title = current?.title ?? selectedList ?? "Tasks";
  const Icon = current?.icon ?? Folder;
  const overdue = active.filter(todo => deadline(todo, now) === "overdue");
  const remaining = active.filter(todo => deadline(todo, now) !== "overdue");
  const completedToday = store.todos.filter(todo => todo.completed && todo.completedAt !== undefined && format(todo.completedAt, "yyyy-MM-dd") === format(now, "yyyy-MM-dd")).length;
  const addTask = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!text.trim()) { input.current?.focus(); return; }
    const contextualDate = view === "day" || view === "upcoming"
      ? new Date(now.getFullYear(), now.getMonth(), now.getDate() + (view === "upcoming" ? 1 : 0)).getTime() : undefined;
    const timestamp = dueDate ? new Date(`${dueDate}T00:00:00`).getTime() : options ? undefined : contextualDate;
    if (!(await store.add(text, decodeCategory(category), timestamp))) return;
    setText(""); input.current?.focus();
    if ((view === "day" && (timestamp === undefined || timestamp >= new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).getTime())) ||
        (view === "upcoming" && (timestamp === undefined || timestamp < new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).getTime()))) {
      toast.success("Task added. You can find it in All Tasks.");
    }
  };
  const addList = async (event: React.FormEvent) => {
    event.preventDefault();
    const error = await store.addCategory(newList);
    if (error) { setListError(error); return; }
    navigate(categoryValue(newList.trim())); setNewList(""); setListError(""); setManageOpen(false);
  };
  const renderTasks = (items: typeof store.todos, label: string) => items.length > 0 && (
    <section className="mb-7" aria-label={label}>
      <div className="mb-3 flex items-center gap-2 px-1">
        <h2 className={cn("text-xs font-semibold uppercase tracking-widest", label === "Overdue" ? "text-destructive" : "text-muted-foreground")}>{label}</h2>
        <span className="text-xs text-muted-foreground">{items.length}</span>
      </div>
      <div className="overflow-hidden rounded-xl border bg-card divide-y">
        {items.map(todo => <TodoItem key={todo.id} todo={todo} now={now} availableCategories={store.categories} onToggle={store.toggle} onDelete={store.remove} onEdit={(id, value, list, due, expected) => store.edit(id, value, decodeCategory(list), due, expected)} />)}
      </div>
    </section>
  );

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[260px_minmax(0,1fr)]">
      <aside className={cn("border-b bg-muted/40 lg:sticky lg:top-0 lg:h-screen lg:border-b-0 lg:border-r lg:flex lg:flex-col", mobileNav ? "block" : "hidden lg:flex")} aria-label="Task navigation">
        <div className="flex items-center justify-between p-6 pb-8">
          <div className="flex items-center gap-3"><Image src={assetPath("/todolizt-logo.png")} alt="" width={36} height={36} className="h-9 w-9 shrink-0 object-contain" /><span className="text-xl font-semibold tracking-tight">TodoLizt<span className="text-primary">.</span></span></div>
          <Button className="lg:hidden" variant="ghost" size="icon" aria-label="Close navigation" onClick={() => setMobileNav(false)}><X className="h-4 w-4" /></Button>
        </div>
        <nav className="space-y-1 px-3" aria-label="Views">
          {views.filter(item => item.id !== "settings").map(item => {
            const count = item.id === "trash" ? store.trash.length : workspaceTodos(store.todos, item.id, "", "default", now).filter(todo => item.id === "completed" || !todo.completed).length;
            return <button key={item.id} onClick={() => navigate(item.id)} aria-current={view === item.id ? "page" : undefined} className={cn("flex w-full items-center gap-3 rounded-lg px-3 py-3 text-sm transition-colors hover:bg-accent", view === item.id ? "bg-primary/10 font-semibold text-primary" : "text-muted-foreground")}><item.icon className="h-[18px] w-[18px]" /><span>{item.title}</span><span className="ml-auto text-xs tabular-nums">{store.loaded ? count : "—"}</span></button>;
          })}
          <button onClick={() => navigate("settings")} aria-current={view === "settings" ? "page" : undefined} className={cn("flex w-full items-center gap-3 rounded-lg px-3 py-3 text-sm transition-colors hover:bg-accent", view === "settings" ? "bg-primary/10 font-semibold text-primary" : "text-muted-foreground")}><Settings className="h-[18px] w-[18px]" /><span>Settings</span></button>
        </nav>
        <div className="mx-6 my-6 border-t" />
        <div className="mb-3 flex items-center justify-between px-6"><h2 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Your lists</h2>
          <Dialog open={manageOpen} onOpenChange={setManageOpen}>
            <DialogTrigger asChild><button aria-label="Manage lists" className="rounded p-1 hover:bg-accent"><Plus className="h-4 w-4 text-muted-foreground" /></button></DialogTrigger>
            <DialogContent className="max-w-[calc(100%-2rem)] sm:max-w-md">
              <DialogHeader><DialogTitle>Your lists</DialogTitle><DialogDescription>Create a space for a project or part of your life. Removing a list keeps its tasks in All Tasks.</DialogDescription></DialogHeader>
              <form onSubmit={addList} className="flex gap-2"><Input aria-label="New list name" placeholder="e.g. Weekend projects" value={newList} onChange={event => { setNewList(event.target.value); setListError(""); }} /><Button type="submit" disabled={store.busy || !store.writable}>Create</Button></form>
              {listError && <p role="alert" className="text-sm text-destructive">{listError}</p>}
              <ul className="max-h-64 space-y-1 overflow-y-auto">{store.categories.map(name => <li key={name} className="flex items-center justify-between gap-2 rounded-lg bg-muted/50 px-3 py-2"><span className="min-w-0 break-words text-sm">{name}</span>{!predefinedCategories.includes(name) && <Button variant="ghost" size="icon" aria-label={`Delete list ${name}`} onClick={async () => { if (!(await store.deleteCategory(name))) return; if (view === categoryValue(name)) navigate("all"); if (category === categoryValue(name)) setCategory("none"); }}><Trash2 className="h-4 w-4 text-muted-foreground" /></Button>}</li>)}</ul>
            </DialogContent>
          </Dialog>
        </div>
        <nav className="max-h-72 space-y-1 overflow-y-auto px-3 pb-4 lg:max-h-none lg:flex-1" aria-label="Lists">{store.categories.map((name, index) => <button key={name} aria-current={view === categoryValue(name) ? "page" : undefined} onClick={() => navigate(categoryValue(name))} className={cn("flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm hover:bg-accent", view === categoryValue(name) ? "bg-primary/10 font-semibold text-primary" : "text-muted-foreground")}><span className={cn("h-2 w-2 shrink-0 rounded-full", ["bg-sky-400", "bg-amber-400", "bg-violet-400", "bg-emerald-400"][index % 4])} /><span className="min-w-0 truncate">{name}</span><span className="ml-auto text-xs tabular-nums">{store.todos.filter(todo => todo.category === name && !todo.completed).length}</span></button>)}</nav>
        <div className="mt-auto px-3 pb-4 pt-2">
          <div className="overflow-hidden rounded-xl border bg-card/80">
            <AccountPanel store={store} />
          </div>
        </div>
      </aside>

      <main className="min-w-0">
        <header className="flex items-center gap-3 border-b px-4 py-4 sm:px-8">
          <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Open navigation" aria-expanded={mobileNav} onClick={() => setMobileNav(!mobileNav)}><Menu className="h-5 w-5" /></Button>
          {view !== "settings" && <div className="relative max-w-md flex-1"><Search className="pointer-events-none absolute left-0 top-2.5 h-4 w-4 text-muted-foreground" /><Input aria-label={`Search ${title}`} placeholder="Search in this view…" value={search} onChange={event => setSearch(event.target.value)} className="border-0 bg-transparent pl-7 shadow-none focus-visible:ring-1" /></div>}
          <div className="ml-auto flex items-center gap-3"><span className="hidden text-xs text-muted-foreground sm:inline">{store.loaded ? format(now, "EEE, MMM d") : "Your workspace"}</span><ThemeToggle /></div>
        </header>
        <div className="mx-auto max-w-4xl px-4 py-8 sm:px-10 sm:py-12">
          <div className="mb-8 flex items-start justify-between gap-4"><div><div className="mb-3 flex items-center gap-2 text-xs font-medium uppercase tracking-widest text-primary"><Icon className="h-4 w-4" /> Your workspace</div><h1 className="break-words text-3xl font-semibold tracking-tight sm:text-4xl">{title}</h1><p className="mt-3 max-w-lg text-sm leading-relaxed text-muted-foreground">{current?.description ?? "One list. A little less on your mind."}</p></div><div className="hidden h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary sm:flex"><Icon className="h-7 w-7" strokeWidth={1.5} /></div></div>
          {store.storageMessage && <p role="alert" className="mb-5 rounded-lg border border-destructive p-3 text-sm">{store.storageMessage}</p>}
          {!store.loaded ? <p role="status" className="py-12 text-muted-foreground">Opening your tasks…</p> : <>
            {view === "settings" ? <SettingsPanel store={store} /> : view === "trash" ? <TrashPanel store={store} search={search} now={now} /> : <>
            {view === "day" && <div className="mb-7 flex flex-wrap items-center gap-x-5 gap-y-2 rounded-xl border bg-card px-4 py-3 text-xs text-muted-foreground"><span><span className="font-semibold text-foreground">{active.length}</span> to focus on</span><span className="flex items-center gap-1.5"><CheckCheck className="h-3.5 w-3.5 text-primary" /><span className="font-semibold text-foreground">{completedToday}</span> completed today</span>{overdue.length > 0 && <span className="text-destructive">{overdue.length} overdue</span>}</div>}
            {view !== "completed" && <form onSubmit={addTask} className="mb-8 rounded-xl border bg-card p-2 shadow-sm focus-within:border-primary/50">
              <div className="flex items-center gap-2"><Plus className="ml-2 h-5 w-5 shrink-0 text-primary" /><Input ref={input} aria-label="New task" placeholder={selectedList ? `Add a task to ${selectedList}…` : view === "day" ? "What needs to get done today?" : "Add a task…"} value={text} onChange={event => setText(event.target.value)} className="min-w-0 border-0 bg-transparent shadow-none focus-visible:ring-0" /><Button type="submit" size="sm" disabled={!text.trim() || store.busy || !store.writable}>Add<span className="sr-only"> task</span></Button></div>
              <div className="mt-1 flex flex-wrap items-center gap-3 border-t px-2 pt-2"><button type="button" className="flex items-center gap-1 py-1 text-xs text-muted-foreground hover:text-foreground" aria-expanded={options} onClick={() => setOptions(!options)}><ChevronDown className={cn("h-3 w-3 transition-transform", options && "rotate-180")} />{options ? "Hide details" : "List & due date"}</button><span className="text-xs text-muted-foreground">{decodeCategory(category) ?? "No list"}{dueDate ? ` · ${format(new Date(`${dueDate}T00:00:00`), "MMM d")}` : !options && (view === "day" ? " · Today" : view === "upcoming" ? " · Tomorrow" : "")}</span></div>
              {options && <div className="grid gap-3 p-2 sm:grid-cols-2"><div><label className="mb-1 block text-xs text-muted-foreground" htmlFor="new-task-list">List</label><Select value={category} onValueChange={setCategory}><SelectTrigger id="new-task-list"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="none">No list</SelectItem>{store.categories.map(name => <SelectItem key={name} value={categoryValue(name)}>{name}</SelectItem>)}</SelectContent></Select></div><div><label htmlFor="new-task-due" className="mb-1 block text-xs text-muted-foreground">Due date</label><Input id="new-task-due" type="date" value={dueDate} onChange={event => setDueDate(event.target.value)} /></div></div>}
            </form>}
            <div className="mb-5 flex items-center justify-between gap-3"><p className="text-sm font-medium" aria-live="polite">{visible.length} {visible.length === 1 ? "task" : "tasks"}{search.trim() && " found"}</p><div className="flex items-center gap-2"><ArrowDownWideNarrow className="h-3.5 w-3.5 text-muted-foreground" /><Select value={sort} onValueChange={setSort}><SelectTrigger aria-label="Sort tasks" className="h-8 w-36 border-0 bg-transparent text-xs shadow-none"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="due-date">Due date</SelectItem><SelectItem value="default">Newest first</SelectItem><SelectItem value="alphabetical">Alphabetical</SelectItem></SelectContent></Select></div></div>
            {visible.length === 0 ? <div className="rounded-2xl border border-dashed px-6 py-14 text-center"><div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary"><ListTodo className="h-6 w-6" /></div><h2 className="font-medium">{search.trim() ? "No matching tasks" : view === "completed" ? "Your wins will live here" : view === "day" ? "A fresh start for your day" : "A little space for what’s next"}</h2><p className="mx-auto mt-2 max-w-xs text-sm leading-relaxed text-muted-foreground">{search.trim() ? "Try a different search or clear it to see this view." : view === "completed" ? "Check off a task to see it here." : view === "day" ? "Add a task above. Tasks due today and overdue tasks appear here." : "Add your first task above, or explore another list."}</p>{search.trim() && <Button variant="ghost" className="mt-3" onClick={() => setSearch("")}>Clear search</Button>}</div> : <>{renderTasks(overdue, "Overdue")}{renderTasks(remaining, view === "day" ? "Today" : "To do")}{completed.length > 0 && <details className="group" open={view === "completed"}><summary className="mb-3 cursor-pointer text-sm text-muted-foreground">Completed · {completed.length}</summary>{renderTasks(completed, "Completed tasks")}</details>}</>}
            {view === "completed" && store.todos.some(todo => todo.completed) && <Button variant="ghost" className="mt-5 text-xs text-muted-foreground" disabled={store.busy || !store.writable} onClick={store.clearCompleted}><Trash2 className="mr-2 h-3.5 w-3.5" />Clear all completed tasks</Button>}
            </>}
          </>}
          <p className="mt-10 text-center text-[11px] text-muted-foreground">One task at a time.<br /><a href="https://www.flaticon.com/free-icon/checklist_4704608" target="_blank" rel="noreferrer" className="mt-2 inline-block underline-offset-4 hover:underline" title="Checklist icon created by Freepik from Flaticon">Icon by Freepik · Flaticon</a></p>
        </div>
      </main>
    </div>
  );
}
