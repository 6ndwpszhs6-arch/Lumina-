"use client";

import type { ForumPost, Subscription, TdeeLogEntry, UserProfile } from "@/lib/types";
import { FORUM_CATEGORIES } from "@/lib/types";
import { Calculator, Crown, MessageCircle, Newspaper, ScanBarcode } from "lucide-react";

interface Props {
  profile: UserProfile | undefined;
  latest: TdeeLogEntry | undefined;
  recentPosts: ForumPost[];
  subscription: Subscription;
  onNavigate: (tab: "calculator" | "scan" | "chat" | "forum") => void;
}

export default function HomeScreen({ profile, latest, recentPosts, subscription, onNavigate }: Props) {
  return (
    <div className="space-y-8">
      <section>
        <p className="text-sm text-muted-foreground">Welcome{profile?.name ? "," : ""}</p>
        <h2 className="font-serif text-3xl font-semibold tracking-tight">{profile?.name || "there"}</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}
        </p>
      </section>

      <section className="rounded-2xl border border-border bg-card p-6 text-center">
        {latest ? (
          <>
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Today&apos;s target</p>
            <p className="mt-2 font-serif text-4xl font-semibold tracking-tight text-primary">
              {latest.targetCalories}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              calories &middot; {latest.proteinG}g protein &middot; {latest.fatG}g fat &middot; {latest.carbsG}g carbs
            </p>
            <button onClick={() => onNavigate("calculator")} className="mt-4 text-sm font-medium text-primary">
              Recalculate →
            </button>
          </>
        ) : (
          <>
            <p className="font-serif text-xl font-semibold">Find your calorie target</p>
            <p className="mx-auto mt-2 max-w-xs text-sm leading-relaxed text-muted-foreground">
              A couple of quick details give you a daily calorie and macro target built around your goal.
            </p>
            <button
              onClick={() => onNavigate("calculator")}
              className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground"
            >
              <Calculator className="h-4 w-4" /> Get started
            </button>
          </>
        )}
      </section>

      <section className="flex items-center justify-center gap-6 text-sm text-muted-foreground">
        <button onClick={() => onNavigate("chat")} className="flex items-center gap-1.5 transition hover:text-foreground">
          <MessageCircle className="h-4 w-4" /> Ask a question
        </button>
        <span className="text-border">&middot;</span>
        <button onClick={() => onNavigate("scan")} className="flex items-center gap-1.5 transition hover:text-foreground">
          <ScanBarcode className="h-4 w-4" /> Scan a food
          {subscription.tier !== "premium" && <Crown className="h-3 w-3 text-primary" />}
        </button>
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-medium text-muted-foreground">Latest news</h3>
          <button onClick={() => onNavigate("forum")} className="text-xs text-primary">
            See all
          </button>
        </div>
        {recentPosts.length === 0 ? (
          <div className="flex items-center gap-2 rounded-xl border border-dashed border-border py-6 text-center text-sm text-muted-foreground">
            <Newspaper className="mx-auto h-5 w-5" />
          </div>
        ) : (
          <div className="space-y-2">
            {recentPosts.slice(0, 3).map((post) => (
              <button
                key={post.id}
                onClick={() => onNavigate("forum")}
                className="block w-full rounded-xl border border-border bg-card p-3 text-left"
              >
                <p className="text-xs uppercase tracking-wide text-primary">
                  {FORUM_CATEGORIES.find((c) => c.value === post.category)?.label}
                </p>
                <p className="mt-1 line-clamp-2 text-sm font-medium">{post.title}</p>
              </button>
            ))}
          </div>
        )}
      </section>

      <p className="pb-4 text-center text-xs text-muted-foreground">
        Educational content only — not a substitute for professional medical advice.
      </p>
    </div>
  );
}
