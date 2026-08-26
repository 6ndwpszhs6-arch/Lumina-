"use client";

import { useEffect, useState } from "react";
import { db, ensureSettings, getProfile } from "@/lib/db";
import { fetchForumPosts } from "@/lib/forum";
import { getSubscription, setPremium } from "@/lib/subscription";
import type { ForumPost, Subscription, TdeeLogEntry, UserProfile } from "@/lib/types";
import { cn } from "@/lib/utils";
import HomeScreen from "@/components/HomeScreen";
import TdeeCalculator from "@/components/TdeeCalculator";
import ChatScreen from "@/components/ChatScreen";
import ForumScreen from "@/components/ForumScreen";
import ScanScreen from "@/components/ScanScreen";
import ProfileScreen from "@/components/ProfileScreen";
import { Calculator, Crown, Home, MessageCircle, Newspaper, ScanBarcode, Sparkles, User } from "lucide-react";

type Tab = "home" | "calculator" | "scan" | "chat" | "forum" | "profile";

export default function HomePage() {
  const [ready, setReady] = useState(false);
  const [tab, setTab] = useState<Tab>("home");
  const [profile, setProfile] = useState<UserProfile | undefined>();
  const [history, setHistory] = useState<TdeeLogEntry[]>([]);
  const [posts, setPosts] = useState<ForumPost[]>([]);
  const [subscription, setSubscription] = useState<Subscription | null>(null);

  useEffect(() => {
    async function init() {
      await ensureSettings();
      const [p, h, sub] = await Promise.all([getProfile(), db.tdeeHistory.toArray(), getSubscription()]);
      setProfile(p);
      setHistory(h);
      setSubscription(sub);
      setReady(true);
      fetchForumPosts().then((res) => setPosts(res.posts));
    }
    init();
  }, []);

  const latest = history.slice().sort((a, b) => b.date.localeCompare(a.date))[0];

  async function handleSetPremium(enabled: boolean) {
    const next = await setPremium(enabled);
    setSubscription(next);
  }

  if (!ready || !subscription) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground">Loading Metabo…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-md safe-top">
        <div className="mx-auto flex h-14 max-w-lg items-center gap-2 px-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/20">
            <Sparkles className="h-4 w-4 text-primary" />
          </div>
          <h1 className="text-base font-semibold tracking-tight">Metabo</h1>
          <span className="text-xs text-muted-foreground">Diet &amp; Metabolism</span>
          {subscription.tier === "premium" && (
            <span className="ml-auto flex items-center gap-1 rounded-full bg-primary/15 px-2 py-0.5 text-xs font-medium text-primary">
              <Crown className="h-3 w-3" /> Premium
            </span>
          )}
        </div>
      </header>

      <main className="mx-auto w-full max-w-lg flex-1 overflow-y-auto px-4 pb-24 pt-4">
        {tab === "home" && (
          <HomeScreen
            profile={profile}
            latest={latest}
            recentPosts={posts}
            subscription={subscription}
            onNavigate={setTab}
          />
        )}
        {tab === "calculator" && (
          <TdeeCalculator
            profile={profile}
            history={history}
            onProfileSaved={setProfile}
            onHistoryAdded={(entry) =>
              setHistory((prev) => [...prev.filter((h) => h.date !== entry.date), entry])
            }
          />
        )}
        {tab === "scan" && <ScanScreen subscription={subscription} onSetPremium={handleSetPremium} />}
        {tab === "chat" && <ChatScreen profile={profile} />}
        {tab === "forum" && <ForumScreen />}
        {tab === "profile" && (
          <ProfileScreen
            profile={profile}
            onProfileSaved={setProfile}
            subscription={subscription}
            onSetPremium={handleSetPremium}
          />
        )}
      </main>

      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-background/90 backdrop-blur-lg safe-bottom">
        <div className="mx-auto flex max-w-lg items-center justify-around px-1 py-2">
          <NavButton active={tab === "home"} onClick={() => setTab("home")} icon={<Home className="h-5 w-5" />} label="Home" />
          <NavButton
            active={tab === "calculator"}
            onClick={() => setTab("calculator")}
            icon={<Calculator className="h-5 w-5" />}
            label="Calc"
          />
          <NavButton
            active={tab === "scan"}
            onClick={() => setTab("scan")}
            icon={<ScanBarcode className="h-5 w-5" />}
            label="Scan"
          />
          <NavButton
            active={tab === "chat"}
            onClick={() => setTab("chat")}
            icon={<MessageCircle className="h-5 w-5" />}
            label="Chat"
          />
          <NavButton
            active={tab === "forum"}
            onClick={() => setTab("forum")}
            icon={<Newspaper className="h-5 w-5" />}
            label="News"
          />
          <NavButton active={tab === "profile"} onClick={() => setTab("profile")} icon={<User className="h-5 w-5" />} label="Profile" />
        </div>
      </nav>
    </div>
  );
}

function NavButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex flex-col items-center gap-0.5 rounded-lg px-2 py-1.5 text-[0.68rem] transition",
        active ? "text-primary" : "text-muted-foreground"
      )}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}
