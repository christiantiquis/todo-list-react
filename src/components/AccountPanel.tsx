"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { TodoStore } from "@/hooks/use-todos";

export function AccountPanel({ store }: { store: TodoStore }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  if (!store.loaded) return null;
  if (store.accountEmail) {
    return (
      <div className="px-3 pb-2">
        <p className="truncate px-1 text-xs text-muted-foreground">Signed in as {store.accountEmail}</p>
        <Button type="button" variant="ghost" className="mt-1 h-8 w-full justify-start px-2 text-xs" disabled={store.busy} onClick={() => { void store.logout(); }}>Log out</Button>
      </div>
    );
  }
  return (
    <form className="space-y-2 px-3 pb-2" onSubmit={async event => {
      event.preventDefault();
      const message = await store.login(email, password);
      if (message) setError(message);
      else { setPassword(""); setError(""); }
    }}>
      <Input type="email" autoComplete="username" aria-label="Email" placeholder="Email" value={email} onChange={event => { setEmail(event.target.value); setError(""); }} required />
      <Input type="password" autoComplete="current-password" aria-label="Password" placeholder="Password" value={password} onChange={event => { setPassword(event.target.value); setError(""); }} required />
      {error && <p role="alert" className="text-xs text-destructive">{error}</p>}
      <Button type="submit" size="sm" className="w-full" disabled={store.busy}>Log in</Button>
    </form>
  );
}
