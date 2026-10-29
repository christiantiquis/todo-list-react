"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type ListedToken = { id: string; label: string; createdAt: string };

export function ApiTokensPanel() {
  const [tokens, setTokens] = useState<ListedToken[]>([]);
  const [label, setLabel] = useState("");
  const [revealed, setRevealed] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [working, setWorking] = useState(false);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/tokens");
      const body = await response.json().catch(() => ({})) as { tokens?: ListedToken[]; error?: string };
      if (!response.ok) {
        setError(body.error ?? "API tokens could not be loaded.");
        return;
      }
      setTokens(body.tokens ?? []);
    } catch {
      setError("API tokens could not be loaded.");
    } finally {
      setLoading(false);
    }
  };

  const create = async () => {
    setWorking(true);
    setError("");
    setRevealed("");
    try {
      const response = await fetch("/api/tokens", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ label }),
      });
      const body = await response.json().catch(() => ({})) as ListedToken & { token?: string; error?: string };
      if (!response.ok || !body.token) {
        setError(body.error ?? "The token could not be created.");
        return;
      }
      setTokens(current => [{ id: body.id, label: body.label, createdAt: body.createdAt }, ...current.filter(item => item.id !== body.id)]);
      setRevealed(body.token);
      setLabel("");
    } catch {
      setError("The token could not be created.");
    } finally {
      setWorking(false);
    }
  };

  const revoke = async (id: string) => {
    setWorking(true);
    setError("");
    try {
      const response = await fetch(`/api/tokens/${id}`, { method: "DELETE" });
      const body = await response.json().catch(() => ({})) as { error?: string };
      if (!response.ok) {
        setError(body.error ?? "The token could not be revoked.");
        return;
      }
      setTokens(current => current.filter(item => item.id !== id));
    } catch {
      setError("The token could not be revoked.");
    } finally {
      setWorking(false);
    }
  };

  useEffect(() => { void load(); }, []);

  return (
    <div className="space-y-4">
      <p className="text-xs leading-relaxed text-muted-foreground">Create a token for an agent on this account. Copy it when it appears. TodoLizt keeps only a hash, so it cannot be shown again. Revoking a token stops it immediately.</p>
      <form className="flex gap-2" onSubmit={event => { event.preventDefault(); void create(); }}>
          <Input aria-label="New token label" placeholder="e.g. cursor" value={label} maxLength={64} onChange={event => { setLabel(event.target.value); setError(""); }} />
          <Button type="submit" disabled={working || loading}>Create</Button>
        </form>
        {revealed && (
          <div className="space-y-2">
            <label htmlFor="new-api-token" className="text-xs text-muted-foreground">New token</label>
            <Input id="new-api-token" readOnly value={revealed} aria-label="New API token" onFocus={event => event.currentTarget.select()} />
            <Button type="button" variant="secondary" size="sm" onClick={() => { void navigator.clipboard.writeText(revealed).catch(() => setError("Could not copy the token. Select it and copy it manually.")); }}>Copy token</Button>
          </div>
        )}
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        {loading ? <p role="status" className="text-sm text-muted-foreground">Loading tokens…</p> : tokens.length === 0 ? <p className="text-sm text-muted-foreground">No API tokens yet.</p> : (
          <ul className="max-h-64 space-y-1 overflow-y-auto">
            {tokens.map(token => (
              <li key={token.id} className="flex items-center justify-between gap-2 rounded-lg bg-muted/50 px-3 py-2">
                <span className="min-w-0">
                  <span className="block break-words text-sm">{token.label}</span>
                  <span className="block text-xs text-muted-foreground">Created {format(new Date(token.createdAt), "MMM d, yyyy")}</span>
                </span>
                <Button type="button" variant="ghost" size="icon" aria-label={`Revoke ${token.label}`} disabled={working} onClick={() => { void revoke(token.id); }}>
                  <Trash2 className="h-4 w-4 text-muted-foreground" />
                </Button>
              </li>
            ))}
          </ul>
        )}
    </div>
  );
}
