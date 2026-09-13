"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { PhotoThumb } from "@/components/PhotoThumb";
import { useSession } from "@/components/SessionProvider";
import {
  formatDeltaKg,
  formatEntryDate,
  formatKg,
  getSortedOldestFirst,
  type ProgressEntry,
} from "@/lib/entries";

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
        className="reckoning-field mt-2"
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
  const delta =
    a && b ? formatDeltaKg(b.weightKg - a.weightKg) : null;

  return (
    <main className="px-5 pt-6">
      <h1 className="text-4xl font-semibold tracking-tight">Compare</h1>

      {!ready ? (
        <p className="mt-4 text-zinc-500">Loading…</p>
      ) : entries.length < 2 ? (
        <div className="mt-8">
          <p className="text-lg leading-snug text-zinc-300">
            Need two check-ins to compare. Save this week, then come back after
            next Sunday.
          </p>
          <Link href="/capture" className="reckoning-btn-primary mt-6">
            Add a check-in
          </Link>
        </div>
      ) : a && b ? (
        <>
          <p className="mt-2 text-zinc-400">
            A is usually your oldest. B is usually your newest.
          </p>

          <div className="mt-6 grid grid-cols-2 gap-3">
            <div>
              <PhotoThumb
                id={a.id}
                alt={`Front from ${formatEntryDate(a.createdAt)}`}
                className="aspect-[3/4] w-full rounded-2xl object-cover"
              />
              <p className="mt-3 text-xl font-semibold">
                {formatKg(a.weightKg)}
              </p>
              <p className="mt-1 text-xs text-zinc-500">
                {formatEntryDate(a.createdAt)}
              </p>
            </div>
            <div>
              <PhotoThumb
                id={b.id}
                alt={`Front from ${formatEntryDate(b.createdAt)}`}
                className="aspect-[3/4] w-full rounded-2xl object-cover"
              />
              <p className="mt-3 text-xl font-semibold">
                {formatKg(b.weightKg)}
              </p>
              <p className="mt-1 text-xs text-zinc-500">
                {formatEntryDate(b.createdAt)}
              </p>
            </div>
          </div>

          <div className="mt-6 rounded-2xl border border-zinc-800 px-4 py-4 text-center">
            <p className="text-sm text-zinc-500">Change (B − A)</p>
            <p className="mt-1 text-3xl font-semibold tracking-tight">
              {delta}
            </p>
          </div>

          <div className="mt-8 space-y-6">
            <EntryPicker
              label="A"
              value={aId}
              entries={entries}
              onChange={selectA}
            />
            <EntryPicker
              label="B"
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
