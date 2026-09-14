"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useSession } from "@/components/SessionProvider";
import { formatComparePeriod } from "@/lib/compare-period";
import { getSortedNewestFirst } from "@/lib/entries";
import { FEEDBACK_FALLBACK, requestFeedback } from "@/lib/feedback";

export function FeedbackClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { entries, ready } = useSession();
  const nowParam = searchParams.get("now");
  const nowId = nowParam || getSortedNewestFirst(entries)[0]?.id || "";

  const [body, setBody] = useState<string | null>(null);
  const [thenId, setThenId] = useState<string | null>(null);
  const [period, setPeriod] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!ready || !nowId) return;
    const regenerate = searchParams.get("regenerate") === "1";
    let cancelled = false;
    void requestFeedback(nowId, { regenerate })
      .then((payload) => {
        if (cancelled) return;
        setBody(payload.body);
        setThenId(payload.thenEntryId);
        setPeriod(payload.period ?? null);
        setFailed(payload.body === FEEDBACK_FALLBACK);
      })
      .catch(() => {
        if (cancelled) return;
        setBody(FEEDBACK_FALLBACK);
        setFailed(true);
      });
    if (regenerate) {
      router.replace(`/feedback?now=${encodeURIComponent(nowId)}`);
    }
    return () => {
      cancelled = true;
    };
    // searchParams only used once for regenerate; strip happens via replace.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, nowId]);

  const thenEntry = thenId
    ? entries.find((entry) => entry.id === thenId)
    : null;
  const nowEntry = nowId ? entries.find((entry) => entry.id === nowId) : null;
  const periodLabel =
    period ||
    (thenEntry && nowEntry
      ? formatComparePeriod(thenEntry.createdAt, nowEntry.createdAt)
      : null);

  const compareHref =
    thenId && nowId
      ? `/compare?a=${encodeURIComponent(thenId)}&b=${encodeURIComponent(nowId)}`
      : nowId
        ? `/compare?b=${encodeURIComponent(nowId)}`
        : "/compare";

  return (
    <main className="px-5 pt-8">
      <p className="text-sm font-medium uppercase tracking-[0.18em] text-zinc-500">
        Reckoning
      </p>
      <h1 className="mt-2 text-4xl font-semibold tracking-tight">
        {body ? "Your reckoning" : "Reading your reckoning…"}
      </h1>
      {periodLabel ? (
        <p className="mt-3 inline-flex rounded-full border border-zinc-800 px-3 py-1 text-sm text-zinc-400">
          Day one → now · {periodLabel}
        </p>
      ) : null}

      {!ready ? (
        <p className="mt-8 text-lg leading-snug text-zinc-400">
          Loading your check-in…
        </p>
      ) : !nowId ? (
        <p className="mt-8 text-lg leading-snug text-zinc-300">
          No check-in to read yet. Capture this week first.
        </p>
      ) : body ? (
        <p className="mt-8 text-2xl font-medium leading-snug tracking-tight text-zinc-100">
          {body}
        </p>
      ) : (
        <p className="mt-8 text-lg leading-snug text-zinc-400">
          Reading your reckoning…
        </p>
      )}

      {failed ? (
        <p className="mt-4 text-sm text-zinc-500">
          The check-in is saved. Home and Timeline still work.
        </p>
      ) : null}

      <div className="mt-10 space-y-3">
        <Link href="/" className="reckoning-btn-primary">
          Home
        </Link>
        <Link href="/timeline" className="reckoning-btn-secondary">
          Timeline
        </Link>
        <Link href={compareHref} className="reckoning-btn-secondary">
          Compare
        </Link>
      </div>
    </main>
  );
}
