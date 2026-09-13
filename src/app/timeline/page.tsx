"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { PhotoThumb } from "@/components/PhotoThumb";
import {
  formatEntryDate,
  formatKg,
  getEntries,
  getSortedNewestFirst,
  type ProgressEntry,
} from "@/lib/entries";

export default function TimelinePage() {
  const [ready, setReady] = useState(false);
  const [entries, setEntries] = useState<ProgressEntry[]>([]);

  useEffect(() => {
    setEntries(getSortedNewestFirst(getEntries()));
    setReady(true);
  }, []);

  return (
    <main className="px-5 pt-6">
      <h1 className="text-4xl font-semibold tracking-tight">Timeline</h1>
      <p className="mt-2 text-zinc-400">Newest first. Tap a card to compare.</p>

      {!ready ? (
        <div className="mt-8 space-y-3">
          <div className="h-28 animate-pulse rounded-2xl bg-zinc-900" />
          <div className="h-28 animate-pulse rounded-2xl bg-zinc-900" />
        </div>
      ) : entries.length === 0 ? (
        <div className="mt-10">
          <p className="text-lg text-zinc-300">
            Sunday check-in starts your timeline
          </p>
          <Link href="/capture" className="reckoning-btn-primary mt-6">
            Check in today
          </Link>
        </div>
      ) : (
        <ul className="mt-8 space-y-3">
          {entries.map((entry) => (
            <li key={entry.id}>
              <Link
                href={`/compare?b=${entry.id}`}
                className="flex gap-4 rounded-2xl border border-zinc-800 p-3 active:bg-zinc-950"
              >
                <PhotoThumb
                  id={entry.id}
                  alt={`Front photo from ${formatEntryDate(entry.createdAt)}`}
                  className="h-24 w-20 shrink-0 rounded-xl object-cover"
                />
                <div className="min-w-0">
                  <p className="text-sm text-zinc-400">
                    {formatEntryDate(entry.createdAt)}
                  </p>
                  <p className="mt-1 text-2xl font-semibold">
                    {formatKg(entry.weightKg)}
                  </p>
                  {entry.note ? (
                    <p className="mt-1 truncate text-sm text-zinc-400">
                      {entry.note}
                    </p>
                  ) : null}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
