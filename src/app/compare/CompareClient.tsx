"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  CompareStage,
  type CompareMode,
} from "@/components/CompareStage";
import { useSession } from "@/components/SessionProvider";
import {
  formatDeltaKg,
  formatEntryDate,
  formatKg,
  getSortedOldestFirst,
  type ProgressEntry,
} from "@/lib/entries";
import { formatComparePeriod } from "@/lib/compare-period";
import { requestFeedback } from "@/lib/feedback";
import type { PhotoKind } from "@/lib/photo-db";

function pickDefaultIds(
  oldestFirst: ProgressEntry[],
  aParam: string | null,
  bParam: string | null,
): { a: string; b: string } {
  const ids = new Set(oldestFirst.map((entry) => entry.id));
  const oldest = oldestFirst[0]?.id ?? "";
  const newest = oldestFirst[oldestFirst.length - 1]?.id ?? "";
  const a = aParam && ids.has(aParam) ? aParam : oldest;
  const b = bParam && ids.has(bParam) ? bParam : newest;
  return { a, b };
}

function EntryPicker({
  label,
  value,
  entries,
  onChange,
}: {
  label: string;
  value: string;
  entries: ProgressEntry[];
  onChange: (id: string) => void;
}) {
  const index = entries.findIndex((entry) => entry.id === value);

  return (
    <div>
      <p className="text-sm font-medium text-zinc-400">{label}</p>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="reckoning-field mt-2 py-3"
      >
        {entries.map((entry) => (
          <option key={entry.id} value={entry.id}>
            {formatEntryDate(entry.createdAt)} · {formatKg(entry.weightKg)}
          </option>
        ))}
      </select>
      <div className="mt-2 grid grid-cols-2 gap-2">
        <button
          type="button"
          className="reckoning-btn-secondary min-h-12 text-sm disabled:opacity-40"
          disabled={index <= 0}
          onClick={() => onChange(entries[index - 1].id)}
        >
          Prev
        </button>
        <button
          type="button"
          className="reckoning-btn-secondary min-h-12 text-sm disabled:opacity-40"
          disabled={index < 0 || index >= entries.length - 1}
          onClick={() => onChange(entries[index + 1].id)}
        >
          Next
        </button>
      </div>
    </div>
  );
}

export function CompareClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { entries: sessionEntries, ready } = useSession();
  const entries = getSortedOldestFirst(sessionEntries);
  const [aId, setAId] = useState("");
  const [bId, setBId] = useState("");
  const [mode, setMode] = useState<CompareMode>("slider");
  const [kind, setKind] = useState<PhotoKind>("front");
  const [feedback, setFeedback] = useState<string | null>(null);

  useEffect(() => {
    if (!ready || entries.length < 2) return;
    const picked = pickDefaultIds(
      entries,
      searchParams.get("a"),
      searchParams.get("b"),
    );
    setAId((current) => current || picked.a);
    setBId((current) => current || picked.b);
    // Intentionally read search params once when session data arrives.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, sessionEntries]);

  function selectA(id: string) {
    setAId(id);
    const params = new URLSearchParams();
    params.set("a", id);
    params.set("b", bId || id);
    router.replace(`/compare?${params.toString()}`, { scroll: false });
  }

  function selectB(id: string) {
    setBId(id);
    const params = new URLSearchParams();
    params.set("a", aId || id);
    params.set("b", id);
    router.replace(`/compare?${params.toString()}`, { scroll: false });
  }

  const a = useMemo(
    () => entries.find((entry) => entry.id === aId),
    [entries, aId],
  );
  const b = useMemo(
    () => entries.find((entry) => entry.id === bId),
    [entries, bId],
  );
  const delta = a && b ? formatDeltaKg(b.weightKg - a.weightKg) : null;
  const newerId =
    a && b
      ? new Date(a.createdAt).getTime() >= new Date(b.createdAt).getTime()
        ? a.id
        : b.id
      : "";

  useEffect(() => {
    if (!ready || !newerId || entries.length < 2) {
      setFeedback(null);
      return;
    }
    let cancelled = false;
    void requestFeedback(newerId).then((payload) => {
      if (!cancelled) setFeedback(payload.body);
    });
    return () => {
      cancelled = true;
    };
  }, [ready, newerId, entries.length]);

  return (
    <main className="px-5 pt-6">
      <h1 className="text-4xl font-semibold tracking-tight">Compare</h1>
      <p className="mt-2 text-zinc-400">You vs you.</p>

      {!ready ? (
        <p className="mt-4 text-zinc-500">Loading your check-ins…</p>
      ) : entries.length < 2 ? (
        <div className="mt-8">
          <p className="text-lg leading-snug text-zinc-300">
            Two Sunday check-ins unlock Compare. Capture this week, then come
            back after the next one.
          </p>
          <Link href="/capture" className="reckoning-btn-primary mt-6">
            Add a check-in
          </Link>
        </div>
      ) : a && b ? (
        <>
          <CompareStage
            a={a}
            b={b}
            kind={kind}
            mode={mode}
            onKindChange={setKind}
            onModeChange={setMode}
          />

          <div className="mt-6 rounded-2xl border border-zinc-800 px-4 py-4 text-center">
            <p className="text-sm text-zinc-500">Change (B − A)</p>
            <p className="mt-1 text-3xl font-semibold tracking-tight">
              {delta}
            </p>
          </div>

          {feedback ? (
            <div className="mt-4 rounded-2xl border border-zinc-800 px-4 py-4">
              <p className="text-sm text-zinc-500">Reckoning</p>
              <p className="mt-1 text-xs uppercase tracking-[0.12em] text-zinc-500">
                {formatComparePeriod(
                  new Date(a.createdAt) <= new Date(b.createdAt)
                    ? a.createdAt
                    : b.createdAt,
                  new Date(a.createdAt) <= new Date(b.createdAt)
                    ? b.createdAt
                    : a.createdAt,
                )}
              </p>
              <p className="mt-2 text-base leading-snug text-zinc-200">
                {feedback}
              </p>
            </div>
          ) : null}

          <div className="mt-6 space-y-4">
            <EntryPicker
              label="A · Then"
              value={aId}
              entries={entries}
              onChange={selectA}
            />
            <EntryPicker
              label="B · Now"
              value={bId}
              entries={entries}
              onChange={selectB}
            />
          </div>
        </>
      ) : null}
    </main>
  );
}
