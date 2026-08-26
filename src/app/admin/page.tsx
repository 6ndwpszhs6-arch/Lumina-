"use client";

import { useEffect, useState } from "react";
import { mapRowToPost } from "@/lib/forum";
import { FORUM_CATEGORIES } from "@/lib/types";
import type { ForumCategory, ForumPost } from "@/lib/types";

const SECRET_STORAGE_KEY = "metabo_admin_secret";

interface DraftPost {
  title: string;
  summary: string;
  content: string;
  category: ForumCategory;
  sourceName: string;
  sourceUrl: string;
  imageUrl: string;
  published: boolean;
}

const emptyDraft: DraftPost = {
  title: "",
  summary: "",
  content: "",
  category: "general_news",
  sourceName: "",
  sourceUrl: "",
  imageUrl: "",
  published: false,
};

function readStoredSecret(): string {
  if (typeof window === "undefined") return "";
  return sessionStorage.getItem(SECRET_STORAGE_KEY) ?? "";
}

export default function AdminPage() {
  const [secret, setSecret] = useState(readStoredSecret);
  const [unlocked, setUnlocked] = useState(() => Boolean(readStoredSecret()));
  const [posts, setPosts] = useState<ForumPost[]>([]);
  const [draft, setDraft] = useState<DraftPost>(emptyDraft);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (unlocked) loadPosts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unlocked]);

  async function loadPosts() {
    setLoading(true);
    setStatus(null);
    const res = await fetch("/api/admin/posts", { headers: { "x-admin-secret": secret } });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setStatus(data.error ?? "Failed to load posts.");
      setUnlocked(false);
      sessionStorage.removeItem(SECRET_STORAGE_KEY);
      return;
    }
    setPosts(data.posts.map(mapRowToPost));
  }

  function unlock() {
    sessionStorage.setItem(SECRET_STORAGE_KEY, secret);
    setUnlocked(true);
  }

  function startEdit(post: ForumPost) {
    setEditingId(post.id);
    setDraft({
      title: post.title,
      summary: post.summary,
      content: post.content,
      category: post.category,
      sourceName: post.sourceName,
      sourceUrl: post.sourceUrl,
      imageUrl: post.imageUrl ?? "",
      published: post.published,
    });
  }

  function resetForm() {
    setEditingId(null);
    setDraft(emptyDraft);
  }

  async function submit() {
    setStatus(null);
    if (!draft.title || !draft.content || !draft.sourceName || !draft.sourceUrl) {
      setStatus("Title, content, source name and source URL are required.");
      return;
    }
    const url = editingId ? `/api/admin/posts/${editingId}` : "/api/admin/posts";
    const method = editingId ? "PATCH" : "POST";
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json", "x-admin-secret": secret },
      body: JSON.stringify(draft),
    });
    const data = await res.json();
    if (!res.ok) {
      setStatus(data.error ?? "Failed to save post.");
      return;
    }
    setStatus(editingId ? "Post updated." : "Post created.");
    resetForm();
    loadPosts();
  }

  async function remove(id: string) {
    if (!confirm("Delete this post permanently?")) return;
    const res = await fetch(`/api/admin/posts/${id}`, {
      method: "DELETE",
      headers: { "x-admin-secret": secret },
    });
    if (res.ok) loadPosts();
  }

  if (!unlocked) {
    return (
      <div className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-4 px-6">
        <h1 className="text-lg font-semibold">Metabo Admin</h1>
        <input
          type="password"
          value={secret}
          onChange={(e) => setSecret(e.target.value)}
          placeholder="Admin secret"
          className="rounded-xl border border-border bg-card px-3 py-2.5 outline-none focus:ring-2 focus:ring-ring"
        />
        <button onClick={unlock} className="rounded-xl bg-primary py-2.5 font-medium text-primary-foreground">
          Unlock
        </button>
        {status && <p className="text-sm text-danger">{status}</p>}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-8 px-6 py-8">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">Manage news &amp; research</h1>
        <button
          onClick={() => {
            sessionStorage.removeItem(SECRET_STORAGE_KEY);
            setUnlocked(false);
          }}
          className="text-sm text-muted-foreground"
        >
          Lock
        </button>
      </div>

      <div className="space-y-3 rounded-2xl border border-border bg-card p-4">
        <h2 className="font-medium">{editingId ? "Edit post" : "New post"}</h2>
        <input
          value={draft.title}
          onChange={(e) => setDraft({ ...draft, title: e.target.value })}
          placeholder="Title"
          className="w-full rounded-xl border border-border bg-background px-3 py-2 outline-none focus:ring-2 focus:ring-ring"
        />
        <input
          value={draft.summary}
          onChange={(e) => setDraft({ ...draft, summary: e.target.value })}
          placeholder="Short summary (shown in the list)"
          className="w-full rounded-xl border border-border bg-background px-3 py-2 outline-none focus:ring-2 focus:ring-ring"
        />
        <textarea
          value={draft.content}
          onChange={(e) => setDraft({ ...draft, content: e.target.value })}
          placeholder="Full content (Markdown supported)"
          rows={8}
          className="w-full rounded-xl border border-border bg-background px-3 py-2 outline-none focus:ring-2 focus:ring-ring"
        />
        <div className="grid grid-cols-2 gap-3">
          <select
            value={draft.category}
            onChange={(e) => setDraft({ ...draft, category: e.target.value as ForumCategory })}
            className="rounded-xl border border-border bg-background px-3 py-2 outline-none focus:ring-2 focus:ring-ring"
          >
            {FORUM_CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={draft.published}
              onChange={(e) => setDraft({ ...draft, published: e.target.checked })}
            />
            Published
          </label>
        </div>
        <input
          value={draft.sourceName}
          onChange={(e) => setDraft({ ...draft, sourceName: e.target.value })}
          placeholder="Source name (e.g. American Diabetes Association)"
          className="w-full rounded-xl border border-border bg-background px-3 py-2 outline-none focus:ring-2 focus:ring-ring"
        />
        <input
          value={draft.sourceUrl}
          onChange={(e) => setDraft({ ...draft, sourceUrl: e.target.value })}
          placeholder="Source URL (must be a medically approved source)"
          className="w-full rounded-xl border border-border bg-background px-3 py-2 outline-none focus:ring-2 focus:ring-ring"
        />
        <input
          value={draft.imageUrl}
          onChange={(e) => setDraft({ ...draft, imageUrl: e.target.value })}
          placeholder="Image URL (optional — e.g. the source article's header image)"
          className="w-full rounded-xl border border-border bg-background px-3 py-2 outline-none focus:ring-2 focus:ring-ring"
        />
        <div className="flex gap-2">
          <button onClick={submit} className="flex-1 rounded-xl bg-primary py-2.5 font-medium text-primary-foreground">
            {editingId ? "Save changes" : "Create post"}
          </button>
          {editingId && (
            <button onClick={resetForm} className="rounded-xl border border-border px-4 py-2.5">
              Cancel
            </button>
          )}
        </div>
        {status && <p className="text-sm text-muted-foreground">{status}</p>}
      </div>

      <div className="space-y-2">
        <h2 className="font-medium">All posts {loading && "(loading…)"}</h2>
        {posts.map((post) => (
          <div key={post.id} className="flex items-center justify-between rounded-xl border border-border bg-card p-3">
            <div className="min-w-0">
              <p className="truncate font-medium">{post.title}</p>
              <p className="text-xs text-muted-foreground">
                {post.published ? "Published" : "Draft"} · {FORUM_CATEGORIES.find((c) => c.value === post.category)?.label}
              </p>
            </div>
            <div className="flex shrink-0 gap-2">
              <button onClick={() => startEdit(post)} className="text-sm text-primary">
                Edit
              </button>
              <button onClick={() => remove(post.id)} className="text-sm text-danger">
                Delete
              </button>
            </div>
          </div>
        ))}
        {!loading && posts.length === 0 && <p className="text-sm text-muted-foreground">No posts yet.</p>}
      </div>
    </div>
  );
}
