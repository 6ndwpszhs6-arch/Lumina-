"use client";

import { useState } from "react";
import { signInWithGoogle, signInWithMagicLink } from "@/lib/auth";
import Logo from "./Logo";
import { Loader2, Mail, RefreshCw, ScanBarcode, X } from "lucide-react";

interface Props {
  onClose: () => void;
}

export default function SignInScreen({ onClose }: Props) {
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleMagicLink() {
    const trimmed = email.trim();
    if (!trimmed) return;
    setError(null);
    setSending(true);
    const { error: err } = await signInWithMagicLink(trimmed);
    setSending(false);
    if (err) {
      setError(err);
      return;
    }
    setSent(true);
  }

  async function handleGoogle() {
    setError(null);
    const { error: err } = await signInWithGoogle();
    if (err) setError(err);
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col overflow-y-auto bg-background safe-top safe-bottom">
      <div className="flex justify-end px-4 pt-4">
        <button
          onClick={onClose}
          aria-label="Close"
          className="flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground transition hover:bg-secondary hover:text-foreground"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center px-6 pb-10">
        <div className="text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/15">
            <Logo key={sent ? "sent" : "form"} className="h-7 w-7 text-primary" />
          </div>
          <h1 className="mt-5 font-serif text-2xl font-semibold tracking-tight">
            {sent ? "Check your email" : "Sign in to Metabo"}
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            {sent ? (
              <>
                We sent a sign-in link to <span className="font-medium text-foreground">{email}</span>. Open it on
                this device to finish signing in.
              </>
            ) : (
              "One account, no password — your progress follows you to any device."
            )}
          </p>
        </div>

        {!sent && (
          <>
            <div className="mt-8 space-y-3">
              <Feature icon={<RefreshCw className="h-4 w-4" />} text="Profile, calorie history, and food log sync automatically" />
              <Feature icon={<ScanBarcode className="h-4 w-4" />} text="Premium restores itself — no need to retype an email" />
            </div>

            <button
              onClick={handleGoogle}
              className="mt-8 flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-card py-3 text-sm font-medium transition active:scale-[0.99]"
            >
              <GoogleIcon className="h-4 w-4" />
              Continue with Google
            </button>

            <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground">
              <div className="h-px flex-1 bg-border" />
              or
              <div className="h-px flex-1 bg-border" />
            </div>

            <div className="space-y-2.5">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleMagicLink()}
                placeholder="you@example.com"
                autoFocus
                className="w-full rounded-xl border border-border bg-card px-3.5 py-3 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
              <button
                onClick={handleMagicLink}
                disabled={sending || !email.trim()}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-medium text-primary-foreground transition active:scale-[0.99] disabled:opacity-50"
              >
                {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
                Send magic link
              </button>
            </div>

            {error && <p className="mt-3 text-center text-xs text-danger">{error}</p>}
          </>
        )}

        {sent && (
          <button
            onClick={() => setSent(false)}
            className="mt-8 text-center text-sm text-primary underline underline-offset-2"
          >
            Use a different email
          </button>
        )}

        <button onClick={onClose} className="mt-8 text-center text-sm text-muted-foreground">
          Continue without an account
        </button>
      </div>
    </div>
  );
}

function Feature({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-border bg-card px-3.5 py-3">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary">
        {icon}
      </span>
      <p className="text-sm text-muted-foreground">{text}</p>
    </div>
  );
}

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path
        fill="#4285F4"
        d="M23.52 12.27c0-.85-.08-1.67-.22-2.45H12v4.64h6.47a5.54 5.54 0 0 1-2.4 3.63v3.02h3.88c2.27-2.09 3.57-5.17 3.57-8.84Z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.96-1.07 7.95-2.9l-3.88-3.02c-1.08.72-2.45 1.15-4.07 1.15-3.13 0-5.78-2.11-6.73-4.96H1.27v3.11A12 12 0 0 0 12 24Z"
      />
      <path
        fill="#FBBC05"
        d="M5.27 14.27a7.2 7.2 0 0 1 0-4.54V6.62H1.27a12 12 0 0 0 0 10.76l4-3.11Z"
      />
      <path
        fill="#EA4335"
        d="M12 4.77c1.76 0 3.34.6 4.58 1.79l3.44-3.44C17.95 1.19 15.24 0 12 0A12 12 0 0 0 1.27 6.62l4 3.11C6.22 6.88 8.87 4.77 12 4.77Z"
      />
    </svg>
  );
}
