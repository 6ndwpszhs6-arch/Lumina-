"use client";

import { useState } from "react";
import { startCheckout, syncSubscription } from "@/lib/subscription";
import type { Subscription } from "@/lib/types";
import { Lock, Loader2, Sparkles } from "lucide-react";

interface Props {
  title: string;
  features: string[];
  onSubscriptionChange: (subscription: Subscription) => void;
}

export default function Paywall({ title, features, onSubscriptionChange }: Props) {
  const [email, setEmail] = useState("");
  const [mode, setMode] = useState<"subscribe" | "restore">("subscribe");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    const trimmed = email.trim();
    if (!trimmed) return;
    setError(null);
    setLoading(true);

    if (mode === "subscribe") {
      const { url, error: err } = await startCheckout(trimmed);
      if (err || !url) {
        setLoading(false);
        setError(err ?? "Couldn't start checkout.");
        return;
      }
      window.location.href = url;
      return;
    }

    const { subscription, error: err } = await syncSubscription(trimmed);
    setLoading(false);
    if (err || !subscription) {
      setError(err ?? "Couldn't find a subscription for that email.");
      return;
    }
    if (subscription.tier !== "premium") {
      setError("No active subscription found for that email.");
      return;
    }
    onSubscriptionChange(subscription);
  }

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

      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
        placeholder="you@example.com"
        className="mt-4 w-full rounded-xl border border-border bg-card px-3.5 py-2.5 text-center text-sm outline-none focus:ring-2 focus:ring-ring"
      />

      <button
        onClick={handleSubmit}
        disabled={loading || !email.trim()}
        className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 font-medium text-primary-foreground transition active:scale-[0.99] disabled:opacity-50"
      >
        {loading && <Loader2 className="h-4 w-4 animate-spin" />}
        {mode === "subscribe" ? "Subscribe — $4.99/mo" : "Restore access"}
      </button>

      {error && <p className="mt-2 text-xs text-danger">{error}</p>}

      <button
        onClick={() => {
          setError(null);
          setMode(mode === "subscribe" ? "restore" : "subscribe");
        }}
        className="mt-3 text-xs text-muted-foreground underline underline-offset-2"
      >
        {mode === "subscribe" ? "Already subscribed? Restore access" : "Need to subscribe instead?"}
      </button>
    </div>
  );
}
