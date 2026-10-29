"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function PasswordForm() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [working, setWorking] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaved(false);
    if (newPassword !== confirmPassword) {
      setError("New passwords do not match.");
      return;
    }
    setWorking(true);
    setError("");
    try {
      const response = await fetch("/api/password", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const body = await response.json().catch(() => ({})) as { error?: string };
      if (!response.ok) {
        setError(body.error ?? "The password could not be changed.");
        return;
      }
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setSaved(true);
    } catch {
      setError("The password could not be changed.");
    } finally {
      setWorking(false);
    }
  };

  return (
    <form className="mt-4 space-y-3" onSubmit={event => { void submit(event); }}>
      <div className="space-y-1">
        <label htmlFor="current-password" className="text-xs text-muted-foreground">Current password</label>
        <Input id="current-password" type="password" autoComplete="current-password" value={currentPassword} onChange={event => { setCurrentPassword(event.target.value); setError(""); setSaved(false); }} required />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <label htmlFor="new-password" className="text-xs text-muted-foreground">New password</label>
          <Input id="new-password" type="password" autoComplete="new-password" minLength={8} value={newPassword} onChange={event => { setNewPassword(event.target.value); setError(""); setSaved(false); }} required />
        </div>
        <div className="space-y-1">
          <label htmlFor="confirm-password" className="text-xs text-muted-foreground">Confirm new password</label>
          <Input id="confirm-password" type="password" autoComplete="new-password" minLength={8} value={confirmPassword} onChange={event => { setConfirmPassword(event.target.value); setError(""); setSaved(false); }} required />
        </div>
      </div>
      <p className="text-xs text-muted-foreground">Use at least 8 characters. You stay signed in on this browser.</p>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      {saved && <p role="status" className="text-sm text-muted-foreground">Password changed.</p>}
      <Button type="submit" size="sm" disabled={working}>Change password</Button>
    </form>
  );
}
