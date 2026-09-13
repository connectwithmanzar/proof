"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { User } from "@supabase/supabase-js";
import type { ProgressEntry } from "@/lib/entries";
import { clearWorkingCache, syncAfterLogin } from "@/lib/repo";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/env";

type SessionContextValue = {
  user: User | null;
  entries: ProgressEntry[];
  ready: boolean;
  configured: boolean;
  reload: () => Promise<void>;
  signOut: () => Promise<void>;
};

const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const configured = isSupabaseConfigured();
  const [user, setUser] = useState<User | null>(null);
  const [entries, setEntries] = useState<ProgressEntry[]>([]);
  const [ready, setReady] = useState(!configured);

  const reload = useCallback(async () => {
    if (!user) return;
    const next = await syncAfterLogin(user.id);
    setEntries(next);
  }, [user]);

  const signOut = useCallback(async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    clearWorkingCache();
    setUser(null);
    setEntries([]);
    window.location.assign("/login");
  }, []);

  useEffect(() => {
    if (!configured) return;

    const supabase = createClient();
    let cancelled = false;
    const syncedFor = { current: null as string | null };

    const applyUser = async (nextUser: User | null, sync: boolean) => {
      if (cancelled) return;
      setUser(nextUser);
      if (!nextUser) {
        syncedFor.current = null;
        setEntries([]);
        setReady(true);
        return;
      }
      if (!sync) {
        setReady(true);
        return;
      }
      if (syncedFor.current === nextUser.id) {
        setReady(true);
        return;
      }
      syncedFor.current = nextUser.id;
      try {
        const next = await syncAfterLogin(nextUser.id);
        if (!cancelled) setEntries(next);
      } catch {
        syncedFor.current = null;
        if (!cancelled) setEntries([]);
      } finally {
        if (!cancelled) setReady(true);
      }
    };

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      const nextUser = session?.user ?? null;
      const shouldSync =
        event === "SIGNED_IN" ||
        event === "INITIAL_SESSION" ||
        event === "USER_UPDATED";
      void applyUser(nextUser, Boolean(nextUser) && shouldSync);
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, [configured]);

  const value = useMemo(
    () => ({ user, entries, ready, configured, reload, signOut }),
    [user, entries, ready, configured, reload, signOut],
  );

  return (
    <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
  );
}

export function useSession(): SessionContextValue {
  const ctx = useContext(SessionContext);
  if (!ctx) {
    throw new Error("useSession must be used inside SessionProvider");
  }
  return ctx;
}
