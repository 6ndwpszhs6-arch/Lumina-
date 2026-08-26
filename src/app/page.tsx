"use client";

import { useEffect, useState } from "react";
import { db, ensureSettings, getProfile } from "@/lib/db";
import { fetchForumPosts } from "@/lib/forum";
import type { ForumPost, TdeeLogEntry, UserProfile } from "@/lib/types";
import { cn } from "@/lib/utils";
import HomeScreen from "@/components/HomeScreen";
import TdeeCalculator from "@/components/TdeeCalculator";
import ChatScreen from "@/components/ChatScreen";
import ForumScreen from "@/components/ForumScreen";
import ProfileScreen from "@/components/ProfileScreen";
import { Calculator, Home, MessageCircle, Newspaper, Sparkles, User } from "lucide-react";

type Tab = "home" | "calculator" | "chat" | "forum" | "profile";

export default function HomePage() {
  const [ready, setReady] = useState(false);
  const [tab, setTab] = useState<Tab>("home");
  const [profile, setProfile] = useState<UserProfile | undefined>();
  const [history, setHistory] = useState<TdeeLogEntry[]>([]);
  const [posts, setPosts] = useState<ForumPost[]>([]);

  useEffect(() => {
    async function init() {
      await ensureSettings();
      const [p, h] = await Promise.all([getProfile(), db.tdeeHistory.toArray()]);
      setProfile(p);
      setHistory(h);
      setReady(true);
      fetchForumPosts().then((res) => setPosts(res.posts));
    }
    init();
  }, []);

  const latest = history.slice().sort((a, b) => b.date.localeCompare(a.date))[0];

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground">Loading Lumina…</p>
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
          <h1 className="text-base font-semibold tracking-tight">Lumina</h1>
          <span className="text-xs text-muted-foreground">Diet &amp; Metabolism</span>
        </div>
      </header>

      <main className="mx-auto w-full max-w-lg flex-1 overflow-y-auto px-4 pb-24 pt-4">
        {tab === "home" && (
          <HomeScreen profile={profile} latest={latest} recentPosts={posts} onNavigate={setTab} />
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
        {tab === "chat" && <ChatScreen profile={profile} />}
        {tab === "forum" && <ForumScreen />}
        {tab === "profile" && <ProfileScreen profile={profile} onProfileSaved={setProfile} />}
      </main>

      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-background/90 backdrop-blur-lg safe-bottom">
        <div className="mx-auto flex max-w-lg items-center justify-around px-2 py-2">
          <NavButton active={tab === "home"} onClick={() => setTab("home")} icon={<Home className="h-5 w-5" />} label="Home" />
          <NavButton
            active={tab === "calculator"}
            onClick={() => setTab("calculator")}
            icon={<Calculator className="h-5 w-5" />}
            label="Calculator"
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
        "flex flex-col items-center gap-0.5 rounded-lg px-3 py-1.5 text-xs transition",
        active ? "text-primary" : "text-muted-foreground"
      )}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}
