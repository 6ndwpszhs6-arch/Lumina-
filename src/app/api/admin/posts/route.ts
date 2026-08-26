import "server-only";
import { NextResponse } from "next/server";
import { supabaseAdmin, isAdminRequestAuthorized } from "@/lib/supabaseAdmin";
import { generateId } from "@/lib/db";
import type { ForumPost } from "@/lib/types";

export const runtime = "nodejs";

// Admin-only: list ALL posts (including unpublished drafts).
export async function GET(req: Request) {
  if (!isAdminRequestAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  if (!supabaseAdmin) {
    return NextResponse.json({ error: "Supabase isn't configured yet." }, { status: 503 });
  }

  const { data, error } = await supabaseAdmin
    .from("forum_posts")
    .select("*")
    .order("published_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ posts: data });
}

// Admin-only: create a new post.
export async function POST(req: Request) {
  if (!isAdminRequestAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  if (!supabaseAdmin) {
    return NextResponse.json({ error: "Supabase isn't configured yet." }, { status: 503 });
  }

  let body: Partial<ForumPost>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  if (!body.title || !body.content || !body.category || !body.sourceName || !body.sourceUrl) {
    return NextResponse.json(
      { error: "title, content, category, sourceName and sourceUrl are required." },
      { status: 400 }
    );
  }

  const now = new Date().toISOString();
  const row = {
    id: generateId(),
    title: body.title,
    summary: body.summary ?? "",
    content: body.content,
    category: body.category,
    source_name: body.sourceName,
    source_url: body.sourceUrl,
    image_url: body.imageUrl || null,
    published: body.published ?? false,
    published_at: body.published ? now : null,
    created_at: now,
    updated_at: now,
  };

  const { data, error } = await supabaseAdmin.from("forum_posts").insert(row).select().single();
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ post: data }, { status: 201 });
}
