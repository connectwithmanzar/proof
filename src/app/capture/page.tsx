"use client";

import { useRouter } from "next/navigation";
import { useEffect, useId, useState } from "react";
import { addEntry } from "@/lib/entries";
import { putPhoto } from "@/lib/photo-db";

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
    const id = newId();

    try {
      await putPhoto(id, "front", frontFile);
      if (sideFile) await putPhoto(id, "side", sideFile);
      const trimmed = note.trim();
      addEntry({
        id,
        createdAt: new Date().toISOString(),
        weightKg,
        note: trimmed ? trimmed : undefined,
        hasFront: true,
        hasSide: Boolean(sideFile),
      });
      router.push("/timeline");
    } catch {
      setError("Could not save on this phone. Try again.");
      setSaving(false);
    }
  }

  return (
    <main className="px-5 pt-6">
      <h1 className="text-4xl font-semibold tracking-tight">Capture</h1>
      <p className="mt-2 text-zinc-400">
        Front is required. Side is optional. Weight in kg.
      </p>

      <div className="mt-6 grid grid-cols-2 gap-3">
        <div>
          <Preview src={frontUrl} label="Front" />
          <label
            htmlFor={frontId}
            className="proof-btn-secondary mt-3 cursor-pointer text-sm"
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
            className="proof-btn-secondary mt-3 cursor-pointer text-sm"
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
        className="proof-field mt-2"
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
        className="proof-field mt-2 resize-none"
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
        className="proof-btn-primary mt-6 disabled:opacity-60"
      >
        {saving ? "Saving…" : "Save check-in"}
      </button>
    </main>
  );
}
