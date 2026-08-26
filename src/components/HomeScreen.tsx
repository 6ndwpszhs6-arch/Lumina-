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
    <div className="space-y-6">
      <section>
        <p className="text-sm text-muted-foreground">Welcome{profile?.name ? "," : ""}</p>
        <h2 className="text-2xl font-semibold tracking-tight">{profile?.name || "there"}</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}
        </p>
      </section>

      <section className="rounded-2xl border border-border bg-card p-4">
        {latest ? (
          <>
            <p className="text-sm text-muted-foreground">Your latest daily target</p>
            <p className="mt-1 text-2xl font-semibold text-primary">{latest.targetCalories} kcal</p>
            <p className="mt-1 text-xs text-muted-foreground">
              TDEE {latest.tdee} kcal · P {latest.proteinG}g · F {latest.fatG}g · C {latest.carbsG}g
            </p>
            <button onClick={() => onNavigate("calculator")} className="mt-3 text-sm text-primary">
              Recalculate →
            </button>
          </>
        ) : (
          <>
            <p className="font-medium">Get your calorie target</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Use the TDEE calculator to find your maintenance calories and macro targets.
            </p>
            <button
              onClick={() => onNavigate("calculator")}
              className="mt-3 inline-flex items-center gap-1.5 text-sm text-primary"
            >
              <Calculator className="h-4 w-4" /> Open calculator
            </button>
          </>
        )}
      </section>

      <button
        onClick={() => onNavigate("chat")}
        className="flex w-full items-center gap-3 rounded-2xl border border-border bg-card p-4 text-left transition active:scale-[0.99]"
      >
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
          <MessageCircle className="h-5 w-5" />
        </div>
        <div>
          <p className="font-medium">Ask the assistant</p>
          <p className="text-sm text-muted-foreground">Diet, metabolism, diabetes &amp; PKU questions</p>
        </div>
      </button>

      <button
        onClick={() => onNavigate("scan")}
        className="flex w-full items-center gap-3 rounded-2xl border border-border bg-card p-4 text-left transition active:scale-[0.99]"
      >
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
          <ScanBarcode className="h-5 w-5" />
        </div>
        <div>
          <p className="flex items-center gap-1.5 font-medium">
            Scan a food
            {subscription.tier !== "premium" && <Crown className="h-3.5 w-3.5 text-primary" />}
          </p>
          <p className="text-sm text-muted-foreground">Barcode lookup with full macro &amp; micronutrient detail</p>
        </div>
      </button>

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
