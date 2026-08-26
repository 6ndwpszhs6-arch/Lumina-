import "server-only";
import { NextResponse } from "next/server";
import { supabaseAdmin, isAdminRequestAuthorized } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Admin-only: list every subscription row, most recently updated first.
export async function GET(req: Request) {
  if (!isAdminRequestAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  if (!supabaseAdmin) {
    return NextResponse.json({ error: "Supabase isn't configured yet." }, { status: 503 });
  }

  const { data, error } = await supabaseAdmin
    .from("subscriptions")
    .select("*")
    .order("updated_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ subscriptions: data });
}

// Admin-only: manually grant or revoke Premium for an email, independent of
// Stripe. Preserves any existing Stripe customer/subscription IDs on the row
// (a manual grant is layered on top, not a replacement for real billing).
export async function POST(req: Request) {
  if (!isAdminRequestAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  if (!supabaseAdmin) {
    return NextResponse.json({ error: "Supabase isn't configured yet." }, { status: 503 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const { email, action } = (body ?? {}) as { email?: unknown; action?: unknown };
  if (typeof email !== "string" || !EMAIL_PATTERN.test(email)) {
    return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  }
  if (action !== "grant" && action !== "revoke") {
    return NextResponse.json({ error: "action must be 'grant' or 'revoke'." }, { status: 400 });
  }

  const row: Record<string, unknown> = {
    email: email.toLowerCase(),
    status: action === "grant" ? "active" : "canceled",
    updated_at: new Date().toISOString(),
  };
  // Only stamp source on a grant — a revoke shouldn't relabel a real Stripe
  // customer's row as "manual" just because an admin turned their access off.
  if (action === "grant") row.source = "manual";

  const { data, error } = await supabaseAdmin
    .from("subscriptions")
    .upsert(row, { onConflict: "email" })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ subscription: data });
}
