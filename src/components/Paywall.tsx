"use client";

import { Lock, Sparkles } from "lucide-react";

interface Props {
  title: string;
  features: string[];
  onUnlock: () => void;
}

export default function Paywall({ title, features, onUnlock }: Props) {
  return (
    <div className="rounded-2xl border border-primary/30 bg-primary/5 p-5 text-center">
      <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-primary/15 text-primary">
        <Lock className="h-5 w-5" />
      </div>
      <h3 className="mt-3 text-lg font-semibold">{title}</h3>
      <ul className="mt-3 space-y-1.5 text-left text-sm text-muted-foreground">
        {features.map((f) => (
          <li key={f} className="flex items-start gap-2">
            <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
            <span>{f}</span>
          </li>
        ))}
      </ul>
      <button
        onClick={onUnlock}
        className="mt-4 w-full rounded-xl bg-primary py-3 font-medium text-primary-foreground transition active:scale-[0.99]"
      >
        Upgrade to Premium
      </button>
      <p className="mt-2 text-xs text-muted-foreground">
        Real billing isn&apos;t connected in this build yet — this unlocks a preview so the feature can be tried and
        tested.
      </p>
    </div>
  );
}
