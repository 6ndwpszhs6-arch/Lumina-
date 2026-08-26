"use client";

import { useState } from "react";
import type { User as AuthUser } from "@supabase/supabase-js";
import { db } from "@/lib/db";
import { deleteAllSyncedData, saveProfileSynced } from "@/lib/sync";
import { signOut } from "@/lib/auth";
import { METABOLIC_CONDITIONS } from "@/lib/types";
import type { MetabolicCondition, Subscription, UserProfile } from "@/lib/types";
import { cn, formatDate } from "@/lib/utils";
import { openBillingPortal, startCheckout, syncSubscription } from "@/lib/subscription";
import AccountCard from "./AccountCard";
import { Crown, Loader2, Trash2 } from "lucide-react";

interface Props {
  profile: UserProfile | undefined;
  onProfileSaved: (profile: UserProfile) => void;
  subscription: Subscription;
  onSubscriptionChange: (subscription: Subscription) => void;
  user: AuthUser | null;
}

export default function ProfileScreen({ profile, onProfileSaved, subscription, onSubscriptionChange, user }: Props) {
  const [name, setName] = useState(profile?.name ?? "");
  const [conditions, setConditions] = useState<MetabolicCondition[]>(profile?.conditions ?? []);
  const [otherNote, setOtherNote] = useState(profile?.otherConditionNote ?? "");
  const [saved, setSaved] = useState(false);
  const [confirmingClear, setConfirmingClear] = useState(false);
  const [subEmail, setSubEmail] = useState(subscription.email ?? user?.email ?? "");
  const [subLoading, setSubLoading] = useState<"subscribe" | "restore" | "manage" | null>(null);
  const [subError, setSubError] = useState<string | null>(null);

  async function handleSubscribe() {
    const trimmed = subEmail.trim();
    if (!trimmed) return;
    setSubError(null);
    setSubLoading("subscribe");
    const { url, error } = await startCheckout(trimmed);
    if (error || !url) {
      setSubLoading(null);
      setSubError(error ?? "Couldn't start checkout.");
      return;
    }
    window.location.href = url;
  }

  async function handleRestore() {
    const trimmed = subEmail.trim();
    if (!trimmed) return;
    setSubError(null);
    setSubLoading("restore");
    const { subscription: next, error } = await syncSubscription(trimmed);
    setSubLoading(null);
    if (error || !next) {
      setSubError(error ?? "Couldn't check subscription status.");
      return;
    }
    if (next.tier !== "premium") {
      setSubError("No active subscription found for that email.");
      return;
    }
    onSubscriptionChange(next);
  }

  async function handleManage() {
    const trimmed = subscription.email;
    if (!trimmed) return;
    setSubError(null);
    setSubLoading("manage");
    const { url, error } = await openBillingPortal(trimmed);
    setSubLoading(null);
    if (error || !url) {
      setSubError(error ?? "Couldn't open billing management.");
      return;
    }
    window.location.href = url;
  }

  const toggleCondition = (c: MetabolicCondition) => {
    setConditions((prev) => (prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]));
  };

  const save = async () => {
    const next = await saveProfileSynced({ name, conditions, otherConditionNote: otherNote });
    onProfileSaved(next);
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  };

  const clearAllData = async () => {
    if (user) {
      await deleteAllSyncedData(user.id);
      await signOut();
    }
    await Promise.all([
      db.profile.clear(),
      db.tdeeHistory.clear(),
      db.chatMessages.clear(),
      db.forumCache.clear(),
      db.subscription.clear(),
      db.foodLog.clear(),
    ]);
    window.location.reload();
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Profile &amp; Settings</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Your details power the calculator and personalize chat. They stay on this device unless you sign in
          below to sync them.
        </p>
      </div>

      <AccountCard user={user} />

      <label className="block space-y-1.5">
        <span className="text-sm font-medium text-muted-foreground">Name (optional)</span>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full rounded-xl border border-border bg-card px-3 py-2.5 outline-none focus:ring-2 focus:ring-ring"
          placeholder="e.g. Jamie"
        />
      </label>

      <div className="space-y-1.5">
        <span className="text-sm font-medium text-muted-foreground">Metabolic conditions</span>
        <div className="flex flex-wrap gap-2">
          {METABOLIC_CONDITIONS.map((c) => (
            <button
              key={c.value}
              onClick={() => toggleCondition(c.value)}
              className={cn(
                "rounded-full border px-3 py-1.5 text-sm transition",
                conditions.includes(c.value)
                  ? "border-primary bg-primary/15 text-primary"
                  : "border-border bg-card text-muted-foreground"
              )}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>

      {conditions.includes("other") && (
        <label className="block space-y-1.5">
          <span className="text-sm font-medium text-muted-foreground">Tell us more (optional)</span>
          <textarea
            value={otherNote}
            onChange={(e) => setOtherNote(e.target.value)}
            rows={3}
            className="w-full rounded-xl border border-border bg-card px-3 py-2.5 outline-none focus:ring-2 focus:ring-ring"
          />
        </label>
      )}

      <button
        onClick={save}
        className="w-full rounded-xl bg-primary py-3 font-medium text-primary-foreground transition active:scale-[0.99]"
      >
        {saved ? "Saved ✓" : "Save"}
      </button>

      <div className="rounded-xl border border-border bg-card p-4">
        <div className="flex items-center gap-1.5 text-sm font-medium">
          <Crown className="h-4 w-4 text-primary" />
          {subscription.tier === "premium" ? "Premium" : "Free plan"}
        </div>

        {subscription.tier === "premium" ? (
          <>
            <p className="mt-2 text-xs text-muted-foreground">
              {subscription.currentPeriodEnd
                ? `Renews ${formatDate(subscription.currentPeriodEnd)} · ${subscription.email}`
                : subscription.email}
            </p>
            <button
              onClick={handleManage}
              disabled={subLoading === "manage"}
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg border border-border py-2 text-sm font-medium text-muted-foreground disabled:opacity-50"
            >
              {subLoading === "manage" && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Manage subscription
            </button>
            {subError && <p className="mt-2 text-xs text-danger">{subError}</p>}
          </>
        ) : (
          <>
            <p className="mt-2 text-xs text-muted-foreground">
              Premium unlocks the food barcode scanner and full macro/micronutrient breakdowns.
            </p>
            <input
              type="email"
              value={subEmail}
              onChange={(e) => setSubEmail(e.target.value)}
              placeholder="you@example.com"
              className="mt-3 w-full rounded-lg border border-border bg-secondary px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
            <div className="mt-2 flex gap-2">
              <button
                onClick={handleSubscribe}
                disabled={subLoading !== null || !subEmail.trim()}
                className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-primary py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
              >
                {subLoading === "subscribe" && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                Subscribe — $4.99/mo
              </button>
              <button
                onClick={handleRestore}
                disabled={subLoading !== null || !subEmail.trim()}
                className="flex items-center justify-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-medium text-muted-foreground disabled:opacity-50"
              >
                {subLoading === "restore" && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                Restore
              </button>
            </div>
            {subError && <p className="mt-2 text-xs text-danger">{subError}</p>}
          </>
        )}
      </div>

      <div className="rounded-xl border border-danger/30 bg-danger/5 p-4">
        <p className="text-sm font-medium text-danger">Danger zone</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Permanently delete your profile, TDEE history, and chat history from this device{user ? " and your account" : ""}.
        </p>
        {confirmingClear ? (
          <div className="mt-3 flex gap-2">
            <button
              onClick={clearAllData}
              className="flex-1 rounded-xl bg-danger py-2 text-sm font-medium text-white"
            >
              Yes, delete everything
            </button>
            <button
              onClick={() => setConfirmingClear(false)}
              className="flex-1 rounded-xl border border-border py-2 text-sm"
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            onClick={() => setConfirmingClear(true)}
            className="mt-3 flex items-center gap-1.5 text-sm text-danger"
          >
            <Trash2 className="h-3.5 w-3.5" /> Clear all local data
          </button>
        )}
      </div>

      <p className="pb-4 text-center text-xs text-muted-foreground">Metabo · Diet &amp; Metabolism</p>
    </div>
  );
}
