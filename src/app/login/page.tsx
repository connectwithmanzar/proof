"use client";

import { useLayoutEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { mapAuthError } from "@/lib/repo";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/env";

const BEGUN_KEY = "proof_welcome_begun";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [begun, setBegun] = useState(false);
  const configured = isSupabaseConfigured();

  useLayoutEffect(() => {
    setBegun(sessionStorage.getItem(BEGUN_KEY) === "1");
  }, []);

  function beginReckoning() {
    sessionStorage.setItem(BEGUN_KEY, "1");
    setBegun(true);
  }

  function backToHero() {
    sessionStorage.removeItem(BEGUN_KEY);
    setError(null);
    setInfo(null);
    setBegun(false);
  }

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
          sessionStorage.removeItem(BEGUN_KEY);
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
      sessionStorage.removeItem(BEGUN_KEY);
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

  if (!begun) {
    return (
      <main
        className="relative flex min-h-dvh flex-col overflow-hidden px-5"
        style={{
          paddingTop: "2.75rem",
          paddingBottom: "max(1.75rem, env(safe-area-inset-bottom))",
        }}
      >
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse 90% 55% at 50% -10%, rgba(255,255,255,0.08), transparent 58%)",
          }}
        />
        <div className="relative flex flex-1 flex-col justify-center pb-[14vh]">
          <p className="text-xs font-medium uppercase tracking-[0.32em] text-zinc-500">
            Reckoning
          </p>
          <h1 className="mt-5 text-5xl font-semibold tracking-tight sm:text-6xl">
            Face the change.
          </h1>
          <p className="mt-6 max-w-[22rem] text-xl leading-snug text-zinc-300">
            You vs you. No audience. Lock day one, hunt it every Sunday — whether
            the gap is 1 week or 1 year. I&apos;ll keep the hype honest. No fake
            gains.
          </p>
          <button
            type="button"
            onClick={beginReckoning}
            className="reckoning-btn-primary mt-12 min-h-14"
          >
            Begin the reckoning
          </button>
          <p className="mt-5 text-sm text-zinc-500">
            Private account. Your photos. Your reckoning.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main
      className="flex min-h-dvh flex-col px-5"
      style={{
        paddingTop: "1.25rem",
        paddingBottom: "max(1.5rem, env(safe-area-inset-bottom))",
      }}
    >
      <button
        type="button"
        onClick={backToHero}
        className="min-h-11 self-start text-sm text-zinc-400 hover:text-white"
      >
        ← Back
      </button>

      <div className="flex flex-1 flex-col justify-center pb-6">
        <h1 className="text-4xl font-semibold tracking-tight">
          Face the change.
        </h1>
        <p className="mt-3 text-sm text-zinc-500">
          Private account. Your photos. Your reckoning.
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
          onClick={() => void onSubmit()}
          disabled={busy || !email.trim() || password.length < 6}
          className="reckoning-btn-primary mt-8 min-h-14 disabled:opacity-60"
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
        <p className="mt-8 text-xs leading-relaxed text-zinc-600">
          Photos may be processed with Gemini to score YOUR progress. Not a
          public feed. Not for ads.
        </p>
      </div>
    </main>
  );
}
