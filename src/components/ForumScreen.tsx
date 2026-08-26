"use client";

import { useEffect, useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { fetchForumPosts } from "@/lib/forum";
import { FORUM_CATEGORIES } from "@/lib/types";
import type { ForumCategory, ForumPost } from "@/lib/types";
import { cn } from "@/lib/utils";
import { ExternalLink, Newspaper, WifiOff } from "lucide-react";

export default function ForumScreen() {
  const [posts, setPosts] = useState<ForumPost[]>([]);
  const [source, setSource] = useState<"live" | "cache" | "unconfigured" | null>(null);
  const [category, setCategory] = useState<ForumCategory | "all">("all");
  const [selected, setSelected] = useState<ForumPost | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchForumPosts()
      .then((res) => {
        setPosts(res.posts);
        setSource(res.source);
      })
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(
    () => (category === "all" ? posts : posts.filter((p) => p.category === category)),
    [posts, category]
  );

  if (selected) {
    return (
      <div className="space-y-4">
        <button onClick={() => setSelected(null)} className="text-sm text-primary">
          ← Back to news
        </button>
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            {FORUM_CATEGORIES.find((c) => c.value === selected.category)?.label}
          </p>
          <h2 className="mt-1 text-xl font-semibold leading-snug">{selected.title}</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            {new Date(selected.publishedAt).toLocaleDateString(undefined, { dateStyle: "medium" })} · Source:{" "}
            {selected.sourceName}
          </p>
        </div>
        <article className="markdown-body text-sm leading-relaxed">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{selected.content}</ReactMarkdown>
        </article>
        <a
          href={selected.sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-3.5 py-2 text-sm text-primary"
        >
          Read original source <ExternalLink className="h-3.5 w-3.5" />
        </a>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold">News &amp; Research</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Curated from medically approved sources — reviewed and published by the Lumina team.
        </p>
      </div>

      {source === "cache" && (
        <div className="flex items-center gap-2 rounded-xl border border-warning/40 bg-warning/10 px-3 py-2 text-xs text-warning">
          <WifiOff className="h-3.5 w-3.5" /> Showing saved articles — you may be offline.
        </div>
      )}
      {source === "unconfigured" && !loading && posts.length === 0 && (
        <div className="rounded-xl border border-dashed border-border py-10 text-center text-sm text-muted-foreground">
          <Newspaper className="mx-auto mb-2 h-6 w-6" />
          The news feed hasn&apos;t been set up yet. Check back soon.
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <CategoryChip active={category === "all"} label="All" onClick={() => setCategory("all")} />
        {FORUM_CATEGORIES.map((c) => (
          <CategoryChip
            key={c.value}
            active={category === c.value}
            label={c.label}
            onClick={() => setCategory(c.value)}
          />
        ))}
      </div>

      {loading ? (
        <p className="py-8 text-center text-sm text-muted-foreground">Loading…</p>
      ) : (
        <div className="space-y-3">
          {filtered.map((post) => (
            <button
              key={post.id}
              onClick={() => setSelected(post)}
              className="block w-full rounded-2xl border border-border bg-card p-4 text-left transition active:scale-[0.99]"
            >
              <p className="text-xs uppercase tracking-wide text-primary">
                {FORUM_CATEGORIES.find((c) => c.value === post.category)?.label}
              </p>
              <p className="mt-1 font-medium leading-snug">{post.title}</p>
              <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{post.summary}</p>
              <p className="mt-2 text-xs text-muted-foreground">
                {new Date(post.publishedAt).toLocaleDateString(undefined, { dateStyle: "medium" })} ·{" "}
                {post.sourceName}
              </p>
            </button>
          ))}
          {!loading && filtered.length === 0 && posts.length > 0 && (
            <p className="py-8 text-center text-sm text-muted-foreground">No articles in this category yet.</p>
          )}
        </div>
      )}
    </div>
  );
}

function CategoryChip({ active, label, onClick }: { active: boolean; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "rounded-full border px-3 py-1.5 text-xs font-medium transition",
        active ? "border-primary bg-primary/15 text-primary" : "border-border bg-card text-muted-foreground"
      )}
    >
      {label}
    </button>
  );
}
