"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { InstallTip } from "@/components/InstallTip";
import { PhotoThumb } from "@/components/PhotoThumb";
import { PrivacyBanner } from "@/components/PrivacyBanner";
import { useSession } from "@/components/SessionProvider";
import { WeightSparkline } from "@/components/WeightSparkline";
import {
  daysUntilNextSunday,
  formatEntryDate,
  formatKg,
  getSortedNewestFirst,
  getSortedOldestFirst,
  isCheckInDue,
} from "@/lib/entries";
import { readCachedFeedback } from "@/lib/feedback";
import {
  hasOptedIntoReminders,
  isSunday,
  maybeNotifySundayCheckIn,
  notificationPermission,
  requestSundayReminders,
} from "@/lib/reminders";

export default function HomePage() {
  const { user, profile, entries, ready, signOut } = useSession();
  const [remindState, setRemindState] = useState<
    "idle" | "on" | "denied" | "unsupported"
  >("idle");
  const [sundayBanner, setSundayBanner] = useState(false);
  const [latestFeedback, setLatestFeedback] = useState<string | null>(null);

  useEffect(() => {
    if (!ready) return;
    const permission = notificationPermission();
    if (permission === "unsupported") setRemindState("unsupported");
    else if (permission === "granted" || hasOptedIntoReminders()) {
      setRemindState("on");
    } else if (permission === "denied") setRemindState("denied");
    maybeNotifySundayCheckIn(entries);
    setSundayBanner(isSunday() && isCheckInDue(entries));
  }, [ready, entries]);

  const newest = getSortedNewestFirst(entries)[0];

  useEffect(() => {
    if (!ready || !newest) {
      setLatestFeedback(null);
      return;
    }
    let cancelled = false;
    void readCachedFeedback(newest.id).then((payload) => {
      if (!cancelled) setLatestFeedback(payload?.body ?? null);
    });
    return () => {
      cancelled = true;
    };
  }, [ready, newest]);

  async function enableReminders() {
    const permission = await requestSundayReminders();
    if (permission === "unsupported") setRemindState("unsupported");
    else if (permission === "granted") {
      setRemindState("on");
      maybeNotifySundayCheckIn(entries);
    } else {
      setRemindState("denied");
    }
  }

  const due = isCheckInDue(entries);
  const daysLeft = daysUntilNextSunday();
  const sparkValues = getSortedOldestFirst(entries)
    .slice(-8)
    .map((entry) => entry.weightKg);

  return (
    <main className="px-5 pt-6">
      <PrivacyBanner />
      <InstallTip />

      <p className="text-sm font-medium uppercase tracking-[0.18em] text-zinc-500">
        You vs you
      </p>
      <h1 className="mt-1 text-5xl font-semibold tracking-tight">Reckoning</h1>
      <p className="mt-3 text-base leading-snug text-zinc-400">
        {profile?.display_name
          ? `Let's go, ${profile.display_name}. Front photo + weight, once a Sunday.`
          : "Front photo + weight, once a Sunday. Face the change yourself."}
      </p>

      {sundayBanner ? (
        <p
          className="mt-5 rounded-2xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-sm text-zinc-200"
          role="status"
        >
          Sunday — time for your weekly check-in.
        </p>
      ) : null}

      <section className="mt-8">
        {!ready ? (
          <p className="text-sm text-zinc-500">Loading your check-ins…</p>
        ) : due ? (
          <Link href="/capture" className="reckoning-btn-capture">
            Take this week’s photo
          </Link>
        ) : (
          <div className="space-y-3">
            <div className="rounded-2xl border border-zinc-800 px-4 py-4">
              <p className="text-sm text-zinc-500">Next Sunday</p>
              <p className="mt-1 text-2xl font-semibold">
                {daysLeft === 1 ? "1 day left" : `${daysLeft} days left`}
              </p>
            </div>
            <Link href="/capture" className="reckoning-btn-secondary">
              Open Capture
            </Link>
          </div>
        )}
      </section>

      <section className="mt-8">
        <h2 className="text-sm font-medium uppercase tracking-[0.14em] text-zinc-500">
          Latest
        </h2>
        {newest ? (
          <Link
            href={`/compare?b=${newest.id}`}
            className="mt-3 flex items-center gap-4 rounded-2xl border border-zinc-800 p-3 active:bg-zinc-950"
          >
            <PhotoThumb
              id={newest.id}
              alt="Latest front photo"
              className="h-24 w-20 shrink-0 rounded-xl object-cover"
            />
            <div>
              <p className="text-3xl font-semibold tracking-tight">
                {formatKg(newest.weightKg)}
              </p>
              <p className="mt-1 text-sm text-zinc-400">
                {formatEntryDate(newest.createdAt)}
              </p>
            </div>
          </Link>
        ) : (
          <p className="mt-3 text-zinc-500">
            {ready
              ? "No check-in yet. Sunday starts the record."
              : "Loading…"}
          </p>
        )}
        {latestFeedback ? (
          <Link
            href={newest ? `/feedback?now=${newest.id}` : "/feedback"}
            className="mt-3 block rounded-2xl border border-zinc-800 px-4 py-4 active:bg-zinc-950"
          >
            <p className="text-sm text-zinc-500">Last reckoning</p>
            <p className="mt-2 text-base leading-snug text-zinc-200">
              {latestFeedback}
            </p>
          </Link>
        ) : null}
        <p className="mt-3 flex gap-4 text-sm text-zinc-500">
          <Link href="/timeline" className="min-h-11 py-2 hover:text-white">
            Timeline
          </Link>
          <Link href="/compare" className="min-h-11 py-2 hover:text-white">
            Compare
          </Link>
        </p>
      </section>

      <section className="mt-8">
        <h2 className="text-sm font-medium uppercase tracking-[0.14em] text-zinc-500">
          Weight
        </h2>
        <div className="mt-3 rounded-2xl border border-zinc-800 px-3 py-3">
          <WeightSparkline values={sparkValues} />
        </div>
      </section>

      <section className="mt-8">
        {remindState === "on" ? (
          <p className="text-sm text-zinc-500">
            Sunday reminders on. Open Reckoning on Sundays — no paid push.
          </p>
        ) : remindState === "denied" ? (
          <p className="text-sm text-zinc-500">
            Notifications blocked. Enable them in the browser if you want a
            Sunday ping.
          </p>
        ) : remindState === "unsupported" ? (
          <p className="text-sm text-zinc-500">
            This browser can’t show local notifications. Use the in-app Sunday
            banner instead.
          </p>
        ) : (
          <button
            type="button"
            onClick={enableReminders}
            className="reckoning-btn-secondary"
          >
            Remind me Sundays
          </button>
        )}
      </section>

      <section className="mt-10 border-t border-zinc-900 pt-6">
        <p className="text-sm text-zinc-500">
          Signed in as {user?.email ?? "your account"}
        </p>
        <p className="mt-2 text-xs leading-relaxed text-zinc-600">
          Photos sync to your private account and may be processed with Gemini
          to score YOUR progress. Not a public feed. Not for ads.
        </p>
        <button
          type="button"
          onClick={() => void signOut()}
          className="mt-4 min-h-11 text-sm text-zinc-400 hover:text-white"
        >
          Sign out
        </button>
      </section>
    </main>
  );
}
