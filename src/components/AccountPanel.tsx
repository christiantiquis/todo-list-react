"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { TodoStore } from "@/hooks/use-todos";

function identity(email: string) {
  const at = email.lastIndexOf("@");
  if (at <= 0) return { name: email, domain: "" };
  return { name: email.slice(0, at), domain: email.slice(at + 1) };
}

function initials(email: string) {
  const name = identity(email).name;
  const parts = name.split(/[._+-]+/).filter(Boolean);
  const letters = parts.length >= 2 ? `${parts[0][0]}${parts[1][0]}` : name.slice(0, 2);
  return letters.toUpperCase() || "?";
}

export function AccountPanel({ store }: { store: TodoStore }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  if (!store.loaded) return null;
  if (store.accountEmail) {
    const account = identity(store.accountEmail);
    return (
      <div className="p-3">
        <div className="flex items-start gap-2.5">
          <span aria-hidden className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/15 text-[11px] font-semibold text-primary">{initials(store.accountEmail)}</span>
          <div className="min-w-0 pt-0.5">
            <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Signed in</p>
            <p className="break-all text-sm font-medium leading-snug">{account.name}{account.domain && <span className="mt-0.5 block text-xs font-normal text-muted-foreground">@{account.domain}</span>}</p>
          </div>
        </div>
        <p className="mt-2.5 text-xs leading-relaxed text-muted-foreground">Your tasks are saved to your account. Tokens and backups are in Settings.</p>
        <Button type="button" variant="outline" size="sm" className="mt-3 w-full" disabled={store.busy} onClick={() => { void store.logout(); }}>Log out</Button>
      </div>
    );
  }
  return (
    <form className="space-y-2.5 p-3" onSubmit={async event => {
      event.preventDefault();
      const message = await store.login(email, password);
      if (message) setError(message);
      else { setPassword(""); setError(""); }
    }}>
      <div>
        <p className="text-sm font-medium">Sign in</p>
        <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">Tasks in this browser are added to your account.</p>
      </div>
      <div className="space-y-1">
        <label htmlFor="account-email" className="text-[11px] font-medium text-muted-foreground">Email</label>
        <Input id="account-email" type="email" autoComplete="username" value={email} onChange={event => { setEmail(event.target.value); setError(""); }} required className="h-8 bg-background text-sm" />
      </div>
      <div className="space-y-1">
        <label htmlFor="account-password" className="text-[11px] font-medium text-muted-foreground">Password</label>
        <Input id="account-password" type="password" autoComplete="current-password" value={password} onChange={event => { setPassword(event.target.value); setError(""); }} required className="h-8 bg-background text-sm" />
      </div>
      {error && <p role="alert" className="text-xs text-destructive">{error}</p>}
      <Button type="submit" size="sm" className="w-full" disabled={store.busy}>Log in</Button>
    </form>
  );
}
