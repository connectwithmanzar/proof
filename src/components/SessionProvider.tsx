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
import {
  cacheProfile,
  getProfile,
  type ReckoningProfile,
} from "@/lib/profile";
import { clearWorkingCache, syncAfterLogin } from "@/lib/repo";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/env";

type SessionContextValue = {
  user: User | null;
  profile: ReckoningProfile | null;
  entries: ProgressEntry[];
  ready: boolean;
  configured: boolean;
  reload: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  signOut: () => Promise<void>;
};

const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const configured = isSupabaseConfigured();
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<ReckoningProfile | null>(null);
  const [entries, setEntries] = useState<ProgressEntry[]>([]);
  const [ready, setReady] = useState(!configured);

  const reload = useCallback(async () => {
    if (!user) return;
    const [next, nextProfile] = await Promise.all([
      syncAfterLogin(user.id),
      getProfile(),
    ]);
    setEntries(next);
    setProfile(nextProfile);
  }, [user]);

  const refreshProfile = useCallback(async () => {
    const nextProfile = await getProfile();
    setProfile(nextProfile);
  }, []);

  const signOut = useCallback(async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    clearWorkingCache();
    cacheProfile(null);
    setUser(null);
    setProfile(null);
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
        setProfile(null);
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
        const [next, nextProfile] = await Promise.all([
          syncAfterLogin(nextUser.id),
          getProfile(),
        ]);
        if (!cancelled) {
          setEntries(next);
          setProfile(nextProfile);
        }
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
    () => ({
      user,
      profile,
      entries,
      ready,
      configured,
      reload,
      refreshProfile,
      signOut,
    }),
    [user, profile, entries, ready, configured, reload, refreshProfile, signOut],
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
