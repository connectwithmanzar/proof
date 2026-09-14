"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { mapAuthError } from "@/lib/repo";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/env";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const configured = isSupabaseConfigured();

  async function onSubmit() {
    if (!configured) {
      setError("Supabase is not configured yet. See RECKONING_P1_SETUP.md.");
      return;
    }
    setBusy(true);
    setError(null);
    setInfo(null);
    const supabase = createClient();
    const trimmedEmail = email.trim();

    try {
      if (mode === "signup") {
        const origin = window.location.origin;
        const { data, error: signError } = await supabase.auth.signUp({
          email: trimmedEmail,
          password,
          options: {
            emailRedirectTo: `${origin}/auth/callback`,
          },
        });
        if (signError) {
          setError(mapAuthError(signError.message));
          return;
        }
        if (data.session) {
          router.replace("/onboarding");
          router.refresh();
          return;
        }
        setInfo("Check your email to confirm");
        return;
      }

      const { error: signError } = await supabase.auth.signInWithPassword({
        email: trimmedEmail,
        password,
      });
      if (signError) {
        setError(mapAuthError(signError.message));
        return;
      }
      router.replace("/onboarding");
      router.refresh();
    } catch (caught) {
      setError(
        caught instanceof Error ? mapAuthError(caught.message) : "Could not sign in",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="flex min-h-dvh flex-col justify-center px-5 py-10">
      <p className="text-sm font-medium uppercase tracking-[0.18em] text-zinc-500">
        You vs you
      </p>
      <h1 className="mt-1 text-5xl font-semibold tracking-tight">Reckoning</h1>
      <p className="mt-4 text-base leading-snug text-zinc-400">
        Photos sync encrypted to your private Reckoning account. Only you can
        see them. Not a public feed.
      </p>

      {!configured ? (
        <p className="mt-8 rounded-2xl border border-zinc-800 px-4 py-3 text-sm text-zinc-300">
          Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY, then
          restart the app. Steps are in RECKONING_P1_SETUP.md.
        </p>
      ) : null}

      <label className="mt-8 block text-sm text-zinc-400" htmlFor="email">
        Email
      </label>
      <input
        id="email"
        type="email"
        autoComplete="email"
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        className="reckoning-field mt-2"
        placeholder="you@email.com"
      />

      <label className="mt-5 block text-sm text-zinc-400" htmlFor="password">
        Password
      </label>
      <input
        id="password"
        type="password"
        autoComplete={mode === "signup" ? "new-password" : "current-password"}
        value={password}
        onChange={(event) => setPassword(event.target.value)}
        className="reckoning-field mt-2"
        placeholder="At least 6 characters"
      />

      {error ? (
        <p className="mt-4 text-sm text-red-400" role="alert">
          {error}
        </p>
      ) : null}
      {info ? (
        <p className="mt-4 text-sm text-zinc-300" role="status">
          {info}
        </p>
      ) : null}

      <button
        type="button"
        onClick={onSubmit}
        disabled={busy || !email.trim() || password.length < 6}
        className="reckoning-btn-primary mt-6 disabled:opacity-60"
      >
        {busy
          ? "Working…"
          : mode === "signup"
            ? "Create account"
            : "Sign in"}
      </button>

      <button
        type="button"
        onClick={() => {
          setMode(mode === "signin" ? "signup" : "signin");
          setError(null);
          setInfo(null);
        }}
        className="mt-4 min-h-11 text-sm text-zinc-400 hover:text-white"
      >
        {mode === "signin"
          ? "Need an account? Sign up"
          : "Already have an account? Sign in"}
      </button>
    </main>
  );
}
