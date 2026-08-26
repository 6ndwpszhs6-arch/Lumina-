import { db } from "./db";
import type { Subscription } from "./types";

export async function getSubscription(): Promise<Subscription> {
  const existing = await db.subscription.get("subscription");
  if (existing) return existing;
  const defaults: Subscription = {
    id: "subscription",
    tier: "free",
    source: "preview",
    updatedAt: new Date().toISOString(),
  };
  await db.subscription.put(defaults);
  return defaults;
}

async function saveSubscription(next: Subscription): Promise<Subscription> {
  await db.subscription.put(next);
  return next;
}

// Kicks off a Stripe Checkout session for the given email and returns the
// hosted checkout URL to redirect to. Actual activation happens when the
// user returns from Stripe (see page.tsx's checkout=success handling).
export async function startCheckout(email: string): Promise<{ url?: string; error?: string }> {
  try {
    const res = await fetch("/api/subscription/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const data = await res.json();
    if (!res.ok) return { error: data.error ?? "Couldn't start checkout." };
    return { url: data.url };
  } catch {
    return { error: "Network error — check your connection and try again." };
  }
}

// Looks up subscription status by email (Supabase, kept in sync by the
// Stripe webhook) and saves the result locally. Used both for "Restore
// subscription" on a new device and for periodic re-checks.
export async function syncSubscription(email: string): Promise<{ subscription?: Subscription; error?: string }> {
  try {
    const res = await fetch(`/api/subscription/status?email=${encodeURIComponent(email)}`);
    const data = await res.json();
    if (!res.ok) return { error: data.error ?? "Couldn't check subscription status." };

    const next: Subscription = {
      id: "subscription",
      tier: data.active ? "premium" : "free",
      source: "stripe",
      email,
      currentPeriodEnd: data.currentPeriodEnd ?? undefined,
      updatedAt: new Date().toISOString(),
    };
    return { subscription: await saveSubscription(next) };
  } catch {
    return { error: "Network error — check your connection and try again." };
  }
}

// Saves a subscription confirmed directly from a Stripe Checkout session
// (the redirect-back path), without waiting on the webhook.
export async function confirmFromCheckoutSession(
  email: string,
  active: boolean
): Promise<Subscription> {
  return saveSubscription({
    id: "subscription",
    tier: active ? "premium" : "free",
    source: "stripe",
    email,
    updatedAt: new Date().toISOString(),
  });
}

export async function openBillingPortal(email: string): Promise<{ url?: string; error?: string }> {
  try {
    const res = await fetch("/api/subscription/portal", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const data = await res.json();
    if (!res.ok) return { error: data.error ?? "Couldn't open billing management." };
    return { url: data.url };
  } catch {
    return { error: "Network error — check your connection and try again." };
  }
}
