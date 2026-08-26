import "server-only";
import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";

export async function POST(req: Request) {
  if (!stripe || !supabaseAdmin) {
    return NextResponse.json({ error: "Subscriptions aren't configured yet." }, { status: 503 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const { email } = (body ?? {}) as { email?: unknown };
  if (typeof email !== "string" || !email.trim()) {
    return NextResponse.json({ error: "Email is required." }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from("subscriptions")
    .select("stripe_customer_id")
    .eq("email", email.trim().toLowerCase())
    .maybeSingle();

  if (error || !data?.stripe_customer_id) {
    return NextResponse.json({ error: "No subscription found for that email." }, { status: 404 });
  }

  const origin = req.headers.get("origin") ?? new URL(req.url).origin;

  try {
    const session = await stripe.billingPortal.sessions.create({
      customer: data.stripe_customer_id,
      return_url: `${origin}/`,
    });
    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error("billing portal session error", err);
    return NextResponse.json({ error: "Couldn't open billing management. Please try again." }, { status: 500 });
  }
}
