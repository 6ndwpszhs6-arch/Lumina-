import { db } from "./db";
import type { Subscription } from "./types";

// NOTE: There is no real payment processor wired up yet. Selling a
// subscription that unlocks features inside a native iOS app must go
// through Apple's In-App Purchase (StoreKit) — third-party processors
// like Stripe aren't allowed for this. The recommended path is RevenueCat
// on top of StoreKit, which also makes the entitlement available cross-
// platform without needing our own account system. Until that's wired up,
// `setPremium` below just flips a local, on-device flag so the gated UI
// can be built and tested — see README for the RevenueCat integration
// point.

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

export async function setPremium(enabled: boolean): Promise<Subscription> {
  const next: Subscription = {
    id: "subscription",
    tier: enabled ? "premium" : "free",
    source: "preview",
    updatedAt: new Date().toISOString(),
  };
  await db.subscription.put(next);
  return next;
}
