"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { ApiTokensPanel } from "@/components/ApiTokensDialog";
import { BackupDialog } from "@/components/BackupDialog";
import { PasswordForm } from "@/components/PasswordForm";
import { Button } from "@/components/ui/button";
import type { TodoStore } from "@/hooks/use-todos";

const themes = [
  { id: "light", label: "Light" },
  { id: "dark", label: "Dark" },
  { id: "system", label: "System" },
];

export function SettingsPanel({ store }: { store: TodoStore }) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const selected = mounted ? theme : undefined;

  return (
    <div className="space-y-6">
      <section className="rounded-xl border bg-card p-5" aria-labelledby="settings-appearance">
        <h2 id="settings-appearance" className="text-sm font-medium">Appearance</h2>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">Choose a theme for this browser. System follows your device.</p>
        <div className="mt-4 flex flex-wrap gap-2" role="radiogroup" aria-label="Color theme">
          {themes.map(option => (
            <Button key={option.id} type="button" size="sm" variant={selected === option.id ? "default" : "outline"} role="radio" aria-checked={selected === option.id} onClick={() => setTheme(option.id)}>
              {option.label}
            </Button>
          ))}
        </div>
      </section>
      <section className="rounded-xl border bg-card p-5" aria-labelledby="settings-account">
        <h2 id="settings-account" className="text-sm font-medium">Account</h2>
        {store.accountEmail ? (
          <>
            <p className="mt-1 break-all text-sm">{store.accountEmail}</p>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">Tasks are saved to this account.</p>
            <PasswordForm />
            <Button type="button" variant="outline" size="sm" className="mt-4" disabled={store.busy} onClick={() => { void store.logout(); }}>Log out</Button>
          </>
        ) : (
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">Sign in from the sidebar to save tasks to an account. Until then, tasks stay in this browser.</p>
        )}
      </section>
      {store.accountEmail && (
        <section className="rounded-xl border bg-card p-5" aria-labelledby="settings-tokens">
          <h2 id="settings-tokens" className="text-sm font-medium">API tokens</h2>
          <div className="mt-3"><ApiTokensPanel /></div>
        </section>
      )}
      <section className="rounded-xl border bg-card p-5" aria-labelledby="settings-backup">
        <h2 id="settings-backup" className="text-sm font-medium">Data & backup</h2>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">Download a copy of your tasks, lists, and Trash. Keep it somewhere safe so you can restore it later.</p>
        <div className="mt-4"><BackupDialog store={store} /></div>
      </section>
    </div>
  );
}
