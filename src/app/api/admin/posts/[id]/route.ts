import "server-only";
import { NextResponse } from "next/server";
import { supabaseAdmin, isAdminRequestAuthorized } from "@/lib/supabaseAdmin";
import type { ForumPost } from "@/lib/types";

export const runtime = "nodejs";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!isAdminRequestAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  if (!supabaseAdmin) {
    return NextResponse.json({ error: "Supabase isn't configured yet." }, { status: 503 });
  }

  const { id } = await params;
  let body: Partial<ForumPost>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const now = new Date().toISOString();
  const update: Record<string, unknown> = { updated_at: now };
  if (body.title !== undefined) update.title = body.title;
  if (body.summary !== undefined) update.summary = body.summary;
  if (body.content !== undefined) update.content = body.content;
  if (body.category !== undefined) update.category = body.category;
  if (body.sourceName !== undefined) update.source_name = body.sourceName;
  if (body.sourceUrl !== undefined) update.source_url = body.sourceUrl;
  if (body.imageUrl !== undefined) update.image_url = body.imageUrl || null;
  if (body.published !== undefined) {
    update.published = body.published;
    if (body.published && !body.publishedAt) update.published_at = now;
  }

  const { data, error } = await supabaseAdmin
    .from("forum_posts")
    .update(update)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ post: data });
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!isAdminRequestAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  if (!supabaseAdmin) {
    return NextResponse.json({ error: "Supabase isn't configured yet." }, { status: 503 });
  }

  const { id } = await params;
  const { error } = await supabaseAdmin.from("forum_posts").delete().eq("id", id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
