import "server-only";
import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";

export const runtime = "nodejs";

// Resolves a Checkout Session id (from the success_url redirect) back to the
// email that paid, and whether the session actually completed. This lets the
// app confirm Premium immediately on return from Stripe, without waiting on
// the webhook to land in Supabase first.
export async function GET(req: Request) {
  if (!stripe) {
    return NextResponse.json({ error: "Subscriptions aren't configured yet." }, { status: 503 });
  }

  const id = new URL(req.url).searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "Missing session id." }, { status: 400 });
  }

  try {
    const session = await stripe.checkout.sessions.retrieve(id);
    const email = session.customer_details?.email ?? session.customer_email ?? null;
    return NextResponse.json({ email, active: session.status === "complete" });
  } catch (err) {
    console.error("checkout session retrieve error", err);
    return NextResponse.json({ error: "Couldn't verify checkout session." }, { status: 500 });
  }
}
