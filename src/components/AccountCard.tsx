"use client";

import type { User } from "@supabase/supabase-js";
import { signOut } from "@/lib/auth";
import { LogIn, LogOut } from "lucide-react";

interface Props {
  user: User | null;
  onOpenSignIn: () => void;
}

export default function AccountCard({ user, onOpenSignIn }: Props) {
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
      <button
        onClick={onOpenSignIn}
        className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-lg bg-primary py-2.5 text-sm font-medium text-primary-foreground transition active:scale-[0.99]"
      >
        <LogIn className="h-3.5 w-3.5" /> Sign in
      </button>
    </div>
  );
}
