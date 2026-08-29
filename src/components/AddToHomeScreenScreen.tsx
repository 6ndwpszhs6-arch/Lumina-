"use client";

import { useEffect, useState } from "react";
import Logo from "./Logo";
import { MoreVertical, Share, SquarePlus, X } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

interface Props {
  onContinue: () => void;
}

type Platform = "ios" | "installable" | "other";

export default function AddToHomeScreenScreen({ onContinue }: Props) {
  const [platform, setPlatform] = useState<Platform>(() => {
    if (typeof window === "undefined") return "other";
    const isIOS = /iPad|iPhone|iPod/.test(window.navigator.userAgent) && !("MSStream" in window);
    return isIOS ? "ios" : "other";
  });
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    function onBeforeInstall(e: Event) {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setPlatform("installable");
    }
    function onInstalled() {
      onContinue();
    }
    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onInstalled);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleInstallClick() {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    if (choice.outcome === "accepted") onContinue();
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col overflow-y-auto bg-background safe-top safe-bottom">
      <div className="flex justify-end px-4 pt-4">
        <button
          onClick={onContinue}
          aria-label="Continue in browser"
          className="flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground transition hover:bg-secondary hover:text-foreground"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center px-6 pb-10">
        <div className="text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/15">
            <Logo className="h-8 w-8 text-primary" />
          </div>
          <h1 className="mt-5 font-serif text-2xl font-semibold tracking-tight">Add Metabo to your Home Screen</h1>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Launch it like a real app — full screen, no browser bars, one tap away.
          </p>
        </div>

        <div className="mt-8 space-y-3">
          {platform === "installable" && (
            <button
              onClick={handleInstallClick}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-medium text-primary-foreground transition active:scale-[0.99]"
            >
              <SquarePlus className="h-4 w-4" />
              Install Metabo
            </button>
          )}

          {platform === "ios" && (
            <>
              <Step number={1}>
                Tap the <strong className="font-medium text-foreground">Share</strong> icon
                <Share className="mx-1 inline h-3.5 w-3.5 -translate-y-px text-foreground" /> in Safari&apos;s toolbar
              </Step>
              <Step number={2}>
                Scroll down and tap <strong className="font-medium text-foreground">Add to Home Screen</strong>
              </Step>
            </>
          )}

          {platform === "other" && (
            <>
              <Step number={1}>
                Open your browser&apos;s menu <MoreVertical className="mx-1 inline h-3.5 w-3.5 -translate-y-px text-foreground" />
              </Step>
              <Step number={2}>
                Look for <strong className="font-medium text-foreground">Add to Home Screen</strong> or{" "}
                <strong className="font-medium text-foreground">Install app</strong>
              </Step>
            </>
          )}
        </div>

        <button onClick={onContinue} className="mt-8 text-center text-sm text-muted-foreground">
          Continue in browser
        </button>
      </div>
    </div>
  );
}

function Step({ number, children }: { number: number; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-border bg-card px-3.5 py-3">
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/15 text-sm font-semibold text-primary">
        {number}
      </span>
      <p className="text-sm text-muted-foreground">{children}</p>
    </div>
  );
}
