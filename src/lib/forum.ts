import { supabase } from "./supabase";
import { db } from "./db";
import type { ForumPost } from "./types";

interface ForumPostRow {
  id: string;
  title: string;
  summary: string;
  content: string;
  category: string;
  source_name: string;
  source_url: string;
  published: boolean;
  published_at: string | null;
  created_at: string;
  updated_at: string;
}

export function mapRowToPost(row: ForumPostRow): ForumPost {
  return {
    id: row.id,
    title: row.title,
    summary: row.summary,
    content: row.content,
    category: row.category as ForumPost["category"],
    sourceName: row.source_name,
    sourceUrl: row.source_url,
    published: row.published,
    publishedAt: row.published_at ?? row.created_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export interface FetchForumResult {
  posts: ForumPost[];
  source: "live" | "cache" | "unconfigured";
}

// Fetches published posts from Supabase and refreshes the local offline
// cache. Falls back to the last cached copy if the network/Supabase call
// fails, and reports when Supabase hasn't been configured at all.
export async function fetchForumPosts(): Promise<FetchForumResult> {
  if (!supabase) {
    const cached = await db.forumCache.orderBy("publishedAt").reverse().toArray();
    return { posts: cached, source: cached.length ? "cache" : "unconfigured" };
  }

  const { data, error } = await supabase
    .from("forum_posts")
    .select("*")
    .eq("published", true)
    .order("published_at", { ascending: false });

  if (error || !data) {
    const cached = await db.forumCache.orderBy("publishedAt").reverse().toArray();
    return { posts: cached, source: "cache" };
  }

  const posts = (data as ForumPostRow[]).map(mapRowToPost);
  await db.forumCache.clear();
  if (posts.length) await db.forumCache.bulkPut(posts);
  return { posts, source: "live" };
}
