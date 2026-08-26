"use client";

import { useEffect, useState } from "react";
import { db } from "@/lib/db";
import { computeLoggingStreak } from "@/lib/nutrition";
import { useCountUp } from "@/lib/useCountUp";
import type { ForumPost, Subscription, TdeeLogEntry, UserProfile } from "@/lib/types";
import { FORUM_CATEGORIES } from "@/lib/types";
import { Calculator, Crown, Flame, MessageCircle, Newspaper, ScanBarcode, X } from "lucide-react";

const STREAK_MODAL_KEY = "metabo-streak-modal-shown";

interface Props {
  profile: UserProfile | undefined;
  latest: TdeeLogEntry | undefined;
  recentPosts: ForumPost[];
  subscription: Subscription;
  onNavigate: (tab: "calculator" | "scan" | "chat" | "forum") => void;
}

export default function HomeScreen({ profile, latest, recentPosts, subscription, onNavigate }: Props) {
  const [consumedToday, setConsumedToday] = useState(0);
  const [streak, setStreak] = useState(0);
  const [showStreakModal, setShowStreakModal] = useState(false);

  useEffect(() => {
    db.foodLog.toArray().then((rows) => {
      const today = new Date().toISOString().slice(0, 10);
      const todayTotal = rows
        .filter((r) => r.date === today)
        .reduce((sum, r) => sum + (r.nutrients.calories ?? 0), 0);
      setConsumedToday(Math.round(todayTotal));

      const currentStreak = computeLoggingStreak(rows.map((r) => r.date));
      setStreak(currentStreak);

      if (currentStreak > 0 && window.localStorage.getItem(STREAK_MODAL_KEY) !== today) {
        window.localStorage.setItem(STREAK_MODAL_KEY, today);
        requestAnimationFrame(() => setShowStreakModal(true));
      }
    });
  }, []);

  const hasTarget = Boolean(latest);
  const remaining = latest ? Math.max(latest.targetCalories - consumedToday, 0) : 0;
  const isOver = latest ? consumedToday > latest.targetCalories : false;
  const percent = latest ? Math.min(consumedToday / latest.targetCalories, 1) * 100 : 0;
  const heroNumber = consumedToday > 0 ? remaining : (latest?.targetCalories ?? 0);
  const animatedHero = useCountUp(heroNumber);

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
        {hasTarget ? (
          <>
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              {consumedToday > 0 ? (isOver ? "Over today's target" : "Calories remaining") : "Today's target"}
            </p>
            <p className="mt-2 font-serif text-4xl font-semibold tracking-tight text-primary">{animatedHero}</p>
            {consumedToday > 0 ? (
              <>
                <div className="mx-auto mt-3 h-1.5 w-full max-w-[220px] overflow-hidden rounded-full bg-secondary">
                  <div
                    className="h-full rounded-full bg-primary transition-all"
                    style={{ width: `${percent}%` }}
                  />
                </div>
                <p className="mt-2 text-sm text-muted-foreground">
                  {consumedToday} of {latest!.targetCalories} kcal logged today
                </p>
              </>
            ) : (
              <p className="mt-1 text-sm text-muted-foreground">
                calories &middot; {latest!.proteinG}g protein &middot; {latest!.fatG}g fat &middot; {latest!.carbsG}g
                carbs
              </p>
            )}
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

      {streak > 0 && (
        <button
          onClick={() => setShowStreakModal(true)}
          className="mx-auto flex items-center justify-center gap-1.5 text-sm text-muted-foreground transition hover:text-foreground"
        >
          <Flame className="h-4 w-4 text-primary" />
          {streak}-day logging streak
        </button>
      )}

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

      {showStreakModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-6 backdrop-blur-sm"
          onClick={() => setShowStreakModal(false)}
        >
          <div
            className="relative w-full max-w-xs rounded-2xl border border-border bg-card p-6 text-center shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setShowStreakModal(false)}
              aria-label="Close"
              className="absolute right-3 top-3 text-muted-foreground transition hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/15">
              <Flame className="h-7 w-7 text-primary" />
            </div>
            <p className="mt-4 font-serif text-3xl font-semibold tracking-tight">{streak}-day streak</p>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              {streak === 1
                ? "You logged today — keep it going tomorrow."
                : "You've logged consistently — keep the momentum going."}
            </p>
            <button
              onClick={() => setShowStreakModal(false)}
              className="mt-5 w-full rounded-xl bg-primary py-2.5 text-sm font-medium text-primary-foreground"
            >
              Keep going
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
