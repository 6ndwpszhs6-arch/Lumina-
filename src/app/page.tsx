"use client";

import { useEffect, useRef, useState } from "react";
import type { User as AuthUser } from "@supabase/supabase-js";
import { db, ensureSettings, getProfile, setOnboarded } from "@/lib/db";
import { onAuthChange } from "@/lib/auth";
import { setCurrentUserId, saveProfileSynced, syncAfterLogin } from "@/lib/sync";
import { fetchForumPosts } from "@/lib/forum";
import { confirmFromCheckoutSession, getSubscription, syncSubscription } from "@/lib/subscription";
import type { ForumPost, Subscription, TdeeLogEntry, UserProfile } from "@/lib/types";
import { cn } from "@/lib/utils";
import HomeScreen from "@/components/HomeScreen";
import TdeeCalculator from "@/components/TdeeCalculator";
import UnderConstruction from "@/components/UnderConstruction";
import ForumScreen from "@/components/ForumScreen";
import ScanScreen from "@/components/ScanScreen";
import ProfileScreen from "@/components/ProfileScreen";
import SignInScreen from "@/components/SignInScreen";
import AddToHomeScreenScreen from "@/components/AddToHomeScreenScreen";
import Logo from "@/components/Logo";
import { Calculator, Crown, Home, LogIn, MessageCircle, Newspaper, ScanBarcode, User } from "lucide-react";

type Tab = "home" | "calculator" | "scan" | "chat" | "forum" | "profile";

export default function HomePage() {
  const [ready, setReady] = useState(false);
  const [tab, setTab] = useState<Tab>("home");
  const [profile, setProfile] = useState<UserProfile | undefined>();
  const [history, setHistory] = useState<TdeeLogEntry[]>([]);
  const [posts, setPosts] = useState<ForumPost[]>([]);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [onboarded, setOnboardedState] = useState(false);
  const [showSignIn, setShowSignIn] = useState(false);
  const [isStandalone] = useState(() => {
    if (typeof window === "undefined") return true;
    const nav = window.navigator as Navigator & { standalone?: boolean };
    return window.matchMedia("(display-mode: standalone)").matches || nav.standalone === true;
  });
  // Not persisted, so it prompts again on every visit until installed.
  const [dismissedA2hs, setDismissedA2hs] = useState(false);
  const lastSyncedUserId = useRef<string | null>(null);

  // Registers the installability-only service worker (see public/sw.js) so
  // Chrome/Android/desktop offer the native install prompt used by
  // AddToHomeScreenScreen — it does no caching, so it can't serve stale
  // content after a deploy.
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
  }, []);

  useEffect(() => {
    async function init() {
      const settings = await ensureSettings();
      const [p, h, sub] = await Promise.all([getProfile(), db.tdeeHistory.toArray(), getSubscription()]);
      setProfile(p);
      setHistory(h);
      setSubscription(sub);
      setOnboardedState(settings.onboarded);
      setReady(true);
      fetchForumPosts().then((res) => setPosts(res.posts));
    }
    init();
  }, []);

  function dismissSignIn() {
    setOnboarded();
    setOnboardedState(true);
    setShowSignIn(false);
  }

  const latest = history.slice().sort((a, b) => b.date.localeCompare(a.date))[0];

  // Handle the redirect back from Stripe Checkout (see api/subscription/checkout).
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const checkout = params.get("checkout");
    if (checkout !== "success" && checkout !== "cancel") return;

    const sessionId = params.get("session_id");
    (async () => {
      if (checkout === "success" && sessionId) {
        try {
          const res = await fetch(`/api/subscription/session?id=${encodeURIComponent(sessionId)}`);
          const data = await res.json();
          if (res.ok && data.email) {
            setSubscription(await confirmFromCheckoutSession(data.email, Boolean(data.active)));
          }
        } catch {
          // Falls back to whatever subscription state was already loaded.
        }
      }
      window.history.replaceState({}, "", window.location.pathname);
    })();
  }, []);

  // Sign-in/out and, on a genuine sign-in, merge on-device data with the
  // account (see src/lib/sync.ts) and try restoring Premium by the
  // account's email if it isn't active locally yet.
  useEffect(() => {
    const unsubscribe = onAuthChange(async (nextUser) => {
      setCurrentUserId(nextUser?.id ?? null);
      setUser(nextUser);
      if (nextUser) setShowSignIn(false);

      if (!nextUser) {
        lastSyncedUserId.current = null;
        return;
      }
      if (lastSyncedUserId.current === nextUser.id) return;
      lastSyncedUserId.current = nextUser.id;

      await syncAfterLogin(nextUser.id);
      setOnboarded();
      setOnboardedState(true);

      const [profileResult, h] = await Promise.all([getProfile(), db.tdeeHistory.toArray()]);
      let p = profileResult;
      const googleName = nextUser.user_metadata?.full_name || nextUser.user_metadata?.name;
      if (!p?.name && typeof googleName === "string" && googleName) {
        p = await saveProfileSynced({ name: googleName });
      }
      setProfile(p);
      setHistory(h);

      if (nextUser.email) {
        const current = await getSubscription();
        if (current.tier !== "premium") {
          const { subscription: restored } = await syncSubscription(nextUser.email);
          if (restored) setSubscription(restored);
        }
      }
    });
    return unsubscribe;
  }, []);

  if (!ready || !subscription) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <Logo className="h-9 w-9 text-primary" />
          <p className="text-sm text-muted-foreground">Loading Metabo…</p>
        </div>
      </div>
    );
  }

  if (!isStandalone && !dismissedA2hs) {
    return <AddToHomeScreenScreen onContinue={() => setDismissedA2hs(true)} />;
  }

  if (showSignIn || !onboarded) {
    return <SignInScreen onClose={dismissSignIn} />;
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-md safe-top">
        <div className="mx-auto flex h-14 max-w-lg items-center gap-2 px-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/20">
            <Logo className="h-4 w-4 text-primary" />
          </div>
          <h1 className="text-base font-semibold tracking-tight">Metabo</h1>
          <span className="text-xs text-muted-foreground">Diet &amp; Metabolism</span>
          <div className="ml-auto flex items-center gap-2">
            {subscription.tier === "premium" && (
              <span className="flex items-center gap-1 rounded-full bg-primary/15 px-2 py-0.5 text-xs font-medium text-primary">
                <Crown className="h-3 w-3" /> Premium
              </span>
            )}
            {!user && (
              <button
                onClick={() => setShowSignIn(true)}
                className="flex items-center gap-1.5 rounded-full bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition active:scale-[0.97]"
              >
                <LogIn className="h-3.5 w-3.5" /> Sign in
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-lg flex-1 overflow-y-auto px-4 pb-24 pt-4">
        <div key={tab} className="animate-tab-in">
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
          {tab === "scan" && <ScanScreen subscription={subscription} onSubscriptionChange={setSubscription} />}
          {tab === "chat" && (
            <UnderConstruction
              title="Chat assistant coming soon"
              description="We're rebuilding the diet & metabolism chat assistant. Check back soon — in the meantime, the calculator and food scanner are ready to use."
            />
          )}
          {tab === "forum" && <ForumScreen />}
          {tab === "profile" && (
            <ProfileScreen
              profile={profile}
              onProfileSaved={setProfile}
              subscription={subscription}
              onSubscriptionChange={setSubscription}
              user={user}
              onOpenSignIn={() => setShowSignIn(true)}
            />
          )}
        </div>
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
