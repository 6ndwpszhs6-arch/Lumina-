import { supabase } from "./supabase";
import type { User } from "@supabase/supabase-js";

export const isAuthConfigured = Boolean(supabase);

export async function getCurrentUser(): Promise<User | null> {
  if (!supabase) return null;
  const { data } = await supabase.auth.getUser();
  return data.user ?? null;
}

export async function signInWithMagicLink(email: string): Promise<{ error?: string }> {
  if (!supabase) return { error: "Accounts aren't configured yet." };
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: window.location.origin },
  });
  return error ? { error: error.message } : {};
}

export async function signInWithGoogle(): Promise<{ error?: string }> {
  if (!supabase) return { error: "Accounts aren't configured yet." };
  const { error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: window.location.origin },
  });
  return error ? { error: error.message } : {};
}

export async function signOut(): Promise<void> {
  await supabase?.auth.signOut();
}

// Fires immediately with the current session, then again on every sign-in/
// sign-out/token refresh. Returns an unsubscribe function.
export function onAuthChange(callback: (user: User | null) => void): () => void {
  if (!supabase) return () => {};
  const { data } = supabase.auth.onAuthStateChange((_event, session) => {
    callback(session?.user ?? null);
  });
  return () => data.subscription.unsubscribe();
}
