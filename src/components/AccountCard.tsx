"use client";

import { useState } from "react";
import type { User } from "@supabase/supabase-js";
import { signInWithGoogle, signInWithMagicLink, signOut } from "@/lib/auth";
import { Loader2, LogOut, Mail } from "lucide-react";

interface Props {
  user: User | null;
}

export default function AccountCard({ user }: Props) {
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleMagicLink() {
    const trimmed = email.trim();
    if (!trimmed) return;
    setError(null);
    setSending(true);
    const { error: err } = await signInWithMagicLink(trimmed);
    setSending(false);
    if (err) {
      setError(err);
      return;
    }
    setSent(true);
  }

  async function handleGoogle() {
    setError(null);
    const { error: err } = await signInWithGoogle();
    if (err) setError(err);
  }

  if (user) {
    return (
      <div className="rounded-xl border border-border bg-card p-4">
        <p className="text-sm font-medium">Signed in</p>
        <p className="mt-1 truncate text-xs text-muted-foreground">{user.email}</p>
        <p className="mt-2 text-xs text-muted-foreground">
          Your profile, calorie history, and food log sync to this account across devices.
        </p>
        <button onClick={() => signOut()} className="mt-3 flex items-center gap-1.5 text-sm text-danger">
          <LogOut className="h-3.5 w-3.5" /> Sign out
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <p className="text-sm font-medium">Sync across devices</p>
      <p className="mt-1 text-xs text-muted-foreground">
        Sign in to back up your profile, calorie history, and food log, and pick up where you left off on any
        device. Optional — everything still works locally without an account.
      </p>

      <button onClick={handleGoogle} className="mt-3 w-full rounded-lg border border-border py-2 text-sm font-medium">
        Continue with Google
      </button>

      {sent ? (
        <p className="mt-3 text-xs text-muted-foreground">
          Check <span className="font-medium text-foreground">{email}</span> for a sign-in link.
        </p>
      ) : (
        <div className="mt-3 flex gap-2">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleMagicLink()}
            placeholder="you@example.com"
            className="flex-1 rounded-lg border border-border bg-secondary px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
          <button
            onClick={handleMagicLink}
            disabled={sending || !email.trim()}
            className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
          >
            {sending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Mail className="h-3.5 w-3.5" />}
            Send link
          </button>
        </div>
      )}

      {error && <p className="mt-2 text-xs text-danger">{error}</p>}
    </div>
  );
}
