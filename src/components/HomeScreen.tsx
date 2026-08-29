"use client";

import { useEffect, useState } from "react";
import { db } from "@/lib/db";
import { computeLoggingStreak } from "@/lib/nutrition";
import { useCountUp } from "@/lib/useCountUp";
import type { ForumPost, Subscription, TdeeLogEntry, UserProfile } from "@/lib/types";
import { FORUM_CATEGORIES } from "@/lib/types";
import { Calculator, Crown, Flame, MessageCircle, Newspaper, ScanBarcode, X } from "lucide-react";

const STREAK_MODAL_KEY = "metabo-streak-modal-shown";
const RING_RADIUS = 80;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

interface Props {
  profile: UserProfile | undefined;
  latest: TdeeLogEntry | undefined;
  recentPosts: ForumPost[];
  subscription: Subscription;
  onNavigate: (tab: "calculator" | "scan" | "chat" | "forum") => void;
}

export default function HomeScreen({ profile, latest, recentPosts, subscription, onNavigate }: Props) {
  const [consumedToday, setConsumedToday] = useState(0);
  const [macrosToday, setMacrosToday] = useState({ proteinG: 0, fatG: 0, carbsG: 0 });
  const [streak, setStreak] = useState(0);
  const [showStreakModal, setShowStreakModal] = useState(false);

  useEffect(() => {
    db.foodLog.toArray().then((rows) => {
      const today = new Date().toISOString().slice(0, 10);
      const todayRows = rows.filter((r) => r.date === today);
      setConsumedToday(Math.round(todayRows.reduce((sum, r) => sum + (r.nutrients.calories ?? 0), 0)));
      setMacrosToday({
        proteinG: Math.round(todayRows.reduce((sum, r) => sum + (r.nutrients.proteinG ?? 0), 0)),
        fatG: Math.round(todayRows.reduce((sum, r) => sum + (r.nutrients.fatG ?? 0), 0)),
        carbsG: Math.round(todayRows.reduce((sum, r) => sum + (r.nutrients.carbsG ?? 0), 0)),
      });

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
  const animatedPercent = useCountUp(Math.round(percent), 900);
  const ringOffset = RING_CIRCUMFERENCE - (animatedPercent / 100) * RING_CIRCUMFERENCE;

  return (
    <div className="space-y-8">
      <section>
        <p className="text-sm text-muted-foreground">Welcome{profile?.name ? "," : ""}</p>
        <h2 className="font-serif text-3xl font-semibold tracking-tight">{profile?.name || "there"}</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}
        </p>
      </section>

      <section className="relative overflow-hidden rounded-2xl border border-border bg-card p-6 text-center">
        {hasTarget ? (
          <>
            <div
              aria-hidden
              className="pointer-events-none absolute left-1/2 top-[38%] h-64 w-64 -translate-x-1/2 -translate-y-1/2 rounded-full blur-sm"
              style={{
                background: `radial-gradient(circle, color-mix(in srgb, ${isOver ? "var(--danger)" : "var(--primary)"} 30%, transparent) 0%, transparent 72%)`,
              }}
            />
            <p className="relative text-xs font-medium uppercase tracking-wider text-muted-foreground">
              {consumedToday > 0 ? (isOver ? "Over today's target" : "Calories remaining") : "Today's target"}
            </p>
            <div className="relative mx-auto mt-3 grid h-52 w-52 place-items-center">
              <svg viewBox="0 0 180 180" className="absolute inset-0 h-full w-full -rotate-90">
                <circle cx="90" cy="90" r={RING_RADIUS} fill="none" stroke="var(--border)" strokeWidth="9" />
                {consumedToday > 0 && (
                  <circle
                    cx="90"
                    cy="90"
                    r={RING_RADIUS}
                    fill="none"
                    stroke={isOver ? "var(--danger)" : "var(--success)"}
                    strokeWidth="9"
                    strokeLinecap="round"
                    strokeDasharray={RING_CIRCUMFERENCE}
                    strokeDashoffset={ringOffset}
                  />
                )}
              </svg>
              <div>
                <p className="font-serif text-5xl font-semibold tracking-tight tabular-nums">{animatedHero}</p>
                {consumedToday > 0 ? (
                  <p className="mt-1 text-xs uppercase tracking-wide text-muted-foreground">
                    of {latest!.targetCalories} kcal
                  </p>
                ) : (
                  <p className="mt-1 text-xs uppercase tracking-wide text-muted-foreground">kcal target</p>
                )}
              </div>
            </div>
            {consumedToday > 0 ? (
              <div className="relative mx-auto mt-5 grid max-w-[260px] grid-cols-3 gap-2">
                <MacroPill label="Protein" value={`${macrosToday.proteinG}g`} />
                <MacroPill label="Fat" value={`${macrosToday.fatG}g`} />
                <MacroPill label="Carbs" value={`${macrosToday.carbsG}g`} />
              </div>
            ) : (
              <p className="relative mt-1 text-sm text-muted-foreground">
                calories &middot; {latest!.proteinG}g protein &middot; {latest!.fatG}g fat &middot; {latest!.carbsG}g
                carbs
              </p>
            )}
            <button
              onClick={() => onNavigate("calculator")}
              className="relative mt-4 text-sm font-medium text-primary transition active:scale-95"
            >
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
              className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition active:scale-95"
            >
              <Calculator className="h-4 w-4" /> Get started
            </button>
          </>
        )}
      </section>

      {streak > 0 && (
        <button
          onClick={() => setShowStreakModal(true)}
          className="mx-auto flex items-center justify-center gap-1.5 text-sm text-muted-foreground transition hover:text-foreground active:scale-95"
        >
          <Flame className="h-4 w-4 animate-pulse text-primary" />
          {streak}-day logging streak
        </button>
      )}

      <section className="flex items-stretch justify-center gap-3">
        <button
          onClick={() => onNavigate("chat")}
          className="flex flex-1 flex-col items-center gap-1.5 rounded-2xl border border-border bg-card px-3 py-3.5 text-xs font-medium transition active:scale-95"
        >
          <MessageCircle className="h-5 w-5 text-primary" /> Ask a question
        </button>
        <button
          onClick={() => onNavigate("scan")}
          className="relative flex flex-1 flex-col items-center gap-1.5 rounded-2xl border border-border bg-card px-3 py-3.5 text-xs font-medium transition active:scale-95"
        >
          {subscription.tier !== "premium" && <Crown className="absolute right-3 top-3 h-3 w-3 text-primary" />}
          <ScanBarcode className="h-5 w-5 text-primary" /> Scan a food
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
                className="flex w-full items-center gap-3 rounded-xl border border-border bg-card p-3 text-left transition active:scale-[0.99]"
              >
                {post.imageUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={post.imageUrl}
                    alt=""
                    loading="lazy"
                    className="h-10 w-10 shrink-0 rounded-lg object-cover"
                  />
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-xs uppercase tracking-wide text-primary">
                    {FORUM_CATEGORIES.find((c) => c.value === post.category)?.label}
                  </p>
                  <p className="mt-1 line-clamp-2 text-sm font-medium">{post.title}</p>
                </div>
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

function MacroPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-full bg-secondary px-2 py-2">
      <p className="text-sm font-semibold tabular-nums">{value}</p>
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
    </div>
  );
}
