import "server-only";
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";

const ACTIVE_STATUSES = new Set(["active", "trialing"]);

export async function GET(req: Request) {
  if (!supabaseAdmin) {
    return NextResponse.json({ error: "Subscriptions aren't configured yet." }, { status: 503 });
  }

  const email = new URL(req.url).searchParams.get("email")?.trim().toLowerCase();
  if (!email) {
    return NextResponse.json({ error: "Email is required." }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from("subscriptions")
    .select("status, current_period_end")
    .eq("email", email)
    .maybeSingle();

  if (error) {
    console.error("subscription status lookup error", error);
    return NextResponse.json({ error: "Couldn't check subscription status." }, { status: 500 });
  }

  return NextResponse.json({
    active: Boolean(data && ACTIVE_STATUSES.has(data.status)),
    currentPeriodEnd: data?.current_period_end ?? null,
  });
}
