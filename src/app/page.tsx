"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { PhotoThumb } from "@/components/PhotoThumb";
import { PrivacyBanner } from "@/components/PrivacyBanner";
import { WeightSparkline } from "@/components/WeightSparkline";
import {
  daysUntilNextSunday,
  formatEntryDate,
  formatKg,
  getEntries,
  getSortedNewestFirst,
  getSortedOldestFirst,
  isCheckInDue,
  type ProgressEntry,
} from "@/lib/entries";
import {
  hasOptedIntoReminders,
  isSunday,
  maybeNotifySundayCheckIn,
  notificationPermission,
  requestSundayReminders,
} from "@/lib/reminders";

export default function HomePage() {
  const [ready, setReady] = useState(false);
  const [entries, setEntries] = useState<ProgressEntry[]>([]);
  const [remindState, setRemindState] = useState<
    "idle" | "on" | "denied" | "unsupported"
  >("idle");

  useEffect(() => {
    const loaded = getEntries();
    setEntries(loaded);
    const permission = notificationPermission();
    if (permission === "unsupported") setRemindState("unsupported");
    else if (permission === "granted" || hasOptedIntoReminders()) {
      setRemindState("on");
    } else if (permission === "denied") setRemindState("denied");
    maybeNotifySundayCheckIn(loaded);
    setReady(true);
  }, []);

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

  const newest = getSortedNewestFirst(entries)[0];
  const due = isCheckInDue(entries);
  const daysLeft = daysUntilNextSunday();
  const sparkValues = getSortedOldestFirst(entries)
    .slice(-8)
    .map((entry) => entry.weightKg);
  const showSundayBanner = ready && isSunday() && due;

  return (
    <main className="px-5 pt-6">
      <PrivacyBanner />

      <p className="text-sm font-medium uppercase tracking-[0.18em] text-zinc-500">
        Weekly check-in
      </p>
      <h1 className="mt-1 text-5xl font-semibold tracking-tight">Reckoning</h1>
      <p className="mt-3 text-base leading-snug text-zinc-400">
        Front photo + weight, once a Sunday. Face the change yourself.
      </p>

      {showSundayBanner ? (
        <p
          className="mt-5 rounded-2xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-sm text-zinc-200"
          role="status"
        >
          Sunday — time for your weekly check-in.
        </p>
      ) : null}

      <section className="mt-8">
        {!ready ? (
          <div className="h-14 animate-pulse rounded-2xl bg-zinc-900" />
        ) : due ? (
          <Link href="/capture" className="reckoning-btn-primary text-lg">
            Check in today
          </Link>
        ) : (
          <div className="rounded-2xl border border-zinc-800 px-4 py-4">
            <p className="text-sm text-zinc-500">Next Sunday</p>
            <p className="mt-1 text-2xl font-semibold">
              {daysLeft === 1 ? "1 day left" : `${daysLeft} days left`}
            </p>
          </div>
        )}
      </section>

      <section className="mt-8">
        <h2 className="text-sm font-medium uppercase tracking-[0.14em] text-zinc-500">
          Latest
        </h2>
        {!ready ? (
          <div className="mt-3 h-28 animate-pulse rounded-2xl bg-zinc-900" />
        ) : newest ? (
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
            No check-in yet. Sunday starts the record.
          </p>
        )}
      </section>

      <section className="mt-8">
        <h2 className="text-sm font-medium uppercase tracking-[0.14em] text-zinc-500">
          Weight
        </h2>
        <div className="mt-3 rounded-2xl border border-zinc-800 px-3 py-3">
          <WeightSparkline values={ready ? sparkValues : []} />
        </div>
      </section>

      <div className="mt-8 grid grid-cols-2 gap-3">
        <Link href="/timeline" className="reckoning-btn-secondary">
          Timeline
        </Link>
        <Link href="/compare" className="reckoning-btn-secondary">
          Compare
        </Link>
      </div>

      <section className="mt-8">
        {remindState === "on" ? (
          <p className="text-sm text-zinc-500">
            Sunday reminders on. Open Reckoning on Sundays — no cloud push.
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
    </main>
  );
}
