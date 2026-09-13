"use client";

import { useRouter } from "next/navigation";
import { useEffect, useId, useState } from "react";
import { useSession } from "@/components/SessionProvider";
import { saveCheckIn } from "@/lib/repo";

function newId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function Preview({ src, label }: { src: string | null; label: string }) {
  if (!src) {
    return (
      <div className="flex aspect-[3/4] items-center justify-center rounded-2xl border border-dashed border-zinc-800 text-sm text-zinc-600">
        {label}
      </div>
    );
  }
  return (
    // Local object URL from the file picker.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={`${label} preview`}
      className="aspect-[3/4] w-full rounded-2xl object-cover"
    />
  );
}

export default function CapturePage() {
  const router = useRouter();
  const { reload } = useSession();
  const frontId = useId();
  const sideId = useId();
  const weightId = useId();
  const noteId = useId();

  const [frontFile, setFrontFile] = useState<File | null>(null);
  const [sideFile, setSideFile] = useState<File | null>(null);
  const [frontUrl, setFrontUrl] = useState<string | null>(null);
  const [sideUrl, setSideUrl] = useState<string | null>(null);
  const [weight, setWeight] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [draftId, setDraftId] = useState<string | null>(null);

  useEffect(() => {
    if (!frontFile) {
      setFrontUrl(null);
      return;
    }
    const url = URL.createObjectURL(frontFile);
    setFrontUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [frontFile]);

  useEffect(() => {
    if (!sideFile) {
      setSideUrl(null);
      return;
    }
    const url = URL.createObjectURL(sideFile);
    setSideUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [sideFile]);

  async function onSave() {
    const weightKg = Number(weight);
    if (!frontFile) {
      setError("Front photo is required.");
      return;
    }
    if (!Number.isFinite(weightKg) || weightKg <= 0) {
      setError("Enter a weight greater than 0 kg.");
      return;
    }

    setSaving(true);
    setError(null);
    const id = draftId ?? newId();
    setDraftId(id);
    const trimmed = note.trim();

    try {
      await saveCheckIn({
        id,
        createdAt: new Date().toISOString(),
        weightKg,
        note: trimmed ? trimmed : undefined,
        front: frontFile,
        side: sideFile,
      });
      await reload();
      router.push("/timeline");
    } catch {
      setError("Couldn’t sync — try again");
      setSaving(false);
    }
  }

  return (
    <main className="px-5 pt-6">
      <h1 className="text-4xl font-semibold tracking-tight">Capture</h1>
      <p className="mt-2 text-zinc-400">
        Front is required. Side is optional. Weight in kg.
      </p>

      <div className="mt-6 space-y-6">
        <div>
          <Preview src={frontUrl} label="Front" />
          <label
            htmlFor={frontId}
            className="reckoning-btn-secondary mt-3 min-h-14 cursor-pointer text-base"
          >
            {frontFile ? "Retake front" : "Front photo"}
          </label>
          <input
            id={frontId}
            type="file"
            accept="image/*"
            capture="environment"
            className="sr-only"
            onChange={(event) => {
              setFrontFile(event.target.files?.[0] ?? null);
            }}
          />
        </div>
        <div>
          <Preview src={sideUrl} label="Side (optional)" />
          <label
            htmlFor={sideId}
            className="reckoning-btn-secondary mt-3 min-h-14 cursor-pointer text-base"
          >
            {sideFile ? "Retake side" : "Side photo"}
          </label>
          <input
            id={sideId}
            type="file"
            accept="image/*"
            capture="environment"
            className="sr-only"
            onChange={(event) => {
              setSideFile(event.target.files?.[0] ?? null);
            }}
          />
        </div>
      </div>

      <label htmlFor={weightId} className="mt-8 block text-sm text-zinc-400">
        Weight (kg)
      </label>
      <input
        id={weightId}
        type="number"
        inputMode="decimal"
        min="0.1"
        step="0.1"
        placeholder="e.g. 74.2"
        value={weight}
        onChange={(event) => setWeight(event.target.value)}
        className="reckoning-field mt-2"
      />

      <label htmlFor={noteId} className="mt-5 block text-sm text-zinc-400">
        Note (optional)
      </label>
      <textarea
        id={noteId}
        rows={3}
        maxLength={200}
        placeholder="Lighting, pump, whatever you want to remember"
        value={note}
        onChange={(event) => setNote(event.target.value)}
        className="reckoning-field mt-2 resize-none"
      />

      {error ? (
        <p className="mt-4 text-sm text-red-400" role="alert">
          {error}
        </p>
      ) : null}

      <button
        type="button"
        onClick={onSave}
        disabled={saving}
        className="reckoning-btn-primary mt-6 disabled:opacity-60"
      >
        {saving ? "Saving…" : "Save check-in"}
      </button>
    </main>
  );
}
