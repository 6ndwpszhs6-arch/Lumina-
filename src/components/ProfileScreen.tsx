"use client";

import { useState } from "react";
import { db, saveProfile } from "@/lib/db";
import { METABOLIC_CONDITIONS } from "@/lib/types";
import type { MetabolicCondition, Subscription, UserProfile } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Crown, Trash2 } from "lucide-react";

interface Props {
  profile: UserProfile | undefined;
  onProfileSaved: (profile: UserProfile) => void;
  subscription: Subscription;
  onSetPremium: (enabled: boolean) => void;
}

export default function ProfileScreen({ profile, onProfileSaved, subscription, onSetPremium }: Props) {
  const [name, setName] = useState(profile?.name ?? "");
  const [conditions, setConditions] = useState<MetabolicCondition[]>(profile?.conditions ?? []);
  const [otherNote, setOtherNote] = useState(profile?.otherConditionNote ?? "");
  const [saved, setSaved] = useState(false);
  const [confirmingClear, setConfirmingClear] = useState(false);

  const toggleCondition = (c: MetabolicCondition) => {
    setConditions((prev) => (prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]));
  };

  const save = async () => {
    const next = await saveProfile({ name, conditions, otherConditionNote: otherNote });
    onProfileSaved(next);
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  };

  const clearAllData = async () => {
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
          Your details are stored only on this device — they power the calculator and personalize chat, and are
          never uploaded anywhere.
        </p>
      </div>

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
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-sm font-medium">
            <Crown className="h-4 w-4 text-primary" />
            {subscription.tier === "premium" ? "Premium" : "Free plan"}
          </div>
          <button
            onClick={() => onSetPremium(subscription.tier !== "premium")}
            className={cn(
              "rounded-lg px-3 py-1.5 text-sm font-medium",
              subscription.tier === "premium"
                ? "border border-border text-muted-foreground"
                : "bg-primary text-primary-foreground"
            )}
          >
            {subscription.tier === "premium" ? "Cancel preview" : "Upgrade"}
          </button>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          Premium unlocks the food barcode scanner and full macro/micronutrient breakdowns. Real billing isn&apos;t
          connected yet — this switch just previews the gated features on this device.
        </p>
      </div>

      <div className="rounded-xl border border-danger/30 bg-danger/5 p-4">
        <p className="text-sm font-medium text-danger">Danger zone</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Permanently delete your profile, TDEE history, and chat history from this device.
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
