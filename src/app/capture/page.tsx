"use client";

import { useRouter } from "next/navigation";
import { useEffect, useId, useState, type ChangeEvent } from "react";
import { useSession } from "@/components/SessionProvider";
import {
  CompressImageError,
  compressImage,
} from "@/lib/compress-image";
import {
  createdAtFromRoughDate,
  ROUGH_TAKEN_OPTIONS,
  type RoughTakenWhen,
} from "@/lib/gallery-date";
import { saveCheckIn } from "@/lib/repo";

type Step = "front" | "side" | "details";
type PhotoSource = "camera" | "library";

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
    // Local object URL from the compressed pick.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={`${label} preview`}
      className="aspect-[3/4] w-full rounded-2xl object-cover"
    />
  );
}

function PhotoActions({
  takeId,
  libraryId,
  takeLabel,
  libraryLabel,
  disabled,
  onPick,
}: {
  takeId: string;
  libraryId: string;
  takeLabel: string;
  libraryLabel: string;
  disabled?: boolean;
  onPick: (file: File, source: PhotoSource) => void;
}) {
  function handleChange(
    source: PhotoSource,
    event: ChangeEvent<HTMLInputElement>,
  ) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (file) onPick(file, source);
  }

  return (
    <div className="mt-3 space-y-2">
      <label
        htmlFor={takeId}
        className={`reckoning-btn-secondary min-h-14 cursor-pointer text-base ${
          disabled ? "pointer-events-none opacity-60" : ""
        }`}
      >
        {takeLabel}
      </label>
      <input
        id={takeId}
        type="file"
        accept="image/*"
        capture="environment"
        className="sr-only"
        disabled={disabled}
        onChange={(event) => handleChange("camera", event)}
      />
      <label
        htmlFor={libraryId}
        className={`reckoning-btn-secondary min-h-14 cursor-pointer text-base ${
          disabled ? "pointer-events-none opacity-60" : ""
        }`}
      >
        {libraryLabel}
      </label>
      <input
        id={libraryId}
        type="file"
        accept="image/*"
        className="sr-only"
        disabled={disabled}
        onChange={(event) => handleChange("library", event)}
      />
    </div>
  );
}

function StepDots({ step }: { step: Step }) {
  const index = step === "front" ? 0 : step === "side" ? 1 : 2;
  return (
    <div className="mt-4 flex gap-2" aria-hidden>
      {[0, 1, 2].map((dot) => (
        <span
          key={dot}
          className={`h-1.5 flex-1 rounded-full ${
            dot <= index ? "bg-white" : "bg-zinc-800"
          }`}
        />
      ))}
    </div>
  );
}

export default function CapturePage() {
  const router = useRouter();
  const { reload } = useSession();
  const frontTakeId = useId();
  const frontLibraryId = useId();
  const sideTakeId = useId();
  const sideLibraryId = useId();
  const weightId = useId();
  const noteId = useId();
  const takenId = useId();

  const [step, setStep] = useState<Step>("front");
  const [frontFile, setFrontFile] = useState<Blob | null>(null);
  const [sideFile, setSideFile] = useState<Blob | null>(null);
  const [frontSource, setFrontSource] = useState<PhotoSource | null>(null);
  const [, setSideSource] = useState<PhotoSource | null>(null);
  const [frontUrl, setFrontUrl] = useState<string | null>(null);
  const [sideUrl, setSideUrl] = useState<string | null>(null);
  const [weight, setWeight] = useState("");
  const [note, setNote] = useState("");
  const [takenWhen, setTakenWhen] = useState<RoughTakenWhen>("today");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [optimizing, setOptimizing] = useState(false);
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

  async function pickPhoto(
    which: "front" | "side",
    file: File,
    source: PhotoSource,
  ) {
    setError(null);
    let showedOptimizing = false;
    const timer = window.setTimeout(() => {
      showedOptimizing = true;
      setOptimizing(true);
    }, 300);

    try {
      const compressed = await compressImage(file);
      if (which === "front") {
        setFrontFile(compressed);
        setFrontSource(source);
      } else {
        setSideFile(compressed);
        setSideSource(source);
      }
    } catch (caught) {
      const message =
        caught instanceof CompressImageError
          ? caught.message
          : "Use JPEG/PNG or Take photo";
      setError(message);
    } finally {
      window.clearTimeout(timer);
      if (showedOptimizing) setOptimizing(false);
      else setOptimizing(false);
    }
  }

  function entryCreatedAt(): string {
    // Front source decides the entry date. Side-from-library does not move it.
    if (frontSource === "library") {
      return createdAtFromRoughDate(takenWhen);
    }
    return new Date().toISOString();
  }

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
        createdAt: entryCreatedAt(),
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

  const showTakenWhen = frontSource === "library";
  const busy = optimizing || saving;

  return (
    <main className="px-5 pt-6">
      <p className="text-sm font-medium uppercase tracking-[0.14em] text-zinc-500">
        {step === "front"
          ? "1 of 3"
          : step === "side"
            ? "2 of 3"
            : "3 of 3"}
      </p>
      <h1 className="mt-1 text-4xl font-semibold tracking-tight">
        {step === "front"
          ? "Front photo"
          : step === "side"
            ? "Side photo"
            : "Details"}
      </h1>
      <StepDots step={step} />

      {step === "front" ? (
        <>
          <p className="mt-4 text-zinc-400">
            Take it in a mirror, or pick one from your library.
          </p>
          <p className="mt-2 text-sm text-zinc-500">
            On iPhone/Android, use Take photo. On computer, use Choose from
            library.
          </p>
          <div className="mt-6">
            <Preview src={frontUrl} label="Front" />
            <PhotoActions
              takeId={frontTakeId}
              libraryId={frontLibraryId}
              takeLabel={
                frontFile ? "Retake front photo" : "Take front photo"
              }
              libraryLabel={
                frontFile
                  ? "Replace front from library"
                  : "Choose front from library"
              }
              disabled={busy}
              onPick={(file, source) => void pickPhoto("front", file, source)}
            />
          </div>
        </>
      ) : null}

      {step === "side" ? (
        <>
          <p className="mt-4 text-zinc-400">Skip if you only want front.</p>
          <div className="mt-6">
            <Preview src={sideUrl} label="Side (optional)" />
            <PhotoActions
              takeId={sideTakeId}
              libraryId={sideLibraryId}
              takeLabel={sideFile ? "Retake side photo" : "Take side photo"}
              libraryLabel={
                sideFile
                  ? "Replace side from library"
                  : "Choose side from library"
              }
              disabled={busy}
              onPick={(file, source) => void pickPhoto("side", file, source)}
            />
          </div>
        </>
      ) : null}

      {step === "details" ? (
        <>
          <p className="mt-4 text-zinc-400">Weight in kg. Note is optional.</p>

          <label htmlFor={weightId} className="mt-6 block text-sm text-zinc-400">
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

          {showTakenWhen ? (
            <>
              <label
                htmlFor={takenId}
                className="mt-5 block text-sm text-zinc-400"
              >
                When was this taken?
              </label>
              <select
                id={takenId}
                value={takenWhen}
                onChange={(event) =>
                  setTakenWhen(event.target.value as RoughTakenWhen)
                }
                className="reckoning-field mt-2"
              >
                {ROUGH_TAKEN_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </>
          ) : null}
        </>
      ) : null}

      {optimizing ? (
        <p className="mt-4 text-sm text-zinc-400" role="status">
          Optimizing photo…
        </p>
      ) : null}

      {error ? (
        <p className="mt-4 text-sm text-red-400" role="alert">
          {error}
        </p>
      ) : null}

      <div className="mt-6 space-y-2">
        {step === "front" ? (
          <button
            type="button"
            disabled={!frontFile || busy}
            onClick={() => {
              setError(null);
              setStep("side");
            }}
            className="reckoning-btn-primary disabled:opacity-60"
          >
            Continue
          </button>
        ) : null}

        {step === "side" ? (
          <>
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                setError(null);
                setStep("details");
              }}
              className="reckoning-btn-primary disabled:opacity-60"
            >
              Continue
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                setSideFile(null);
                setSideSource(null);
                setError(null);
                setStep("details");
              }}
              className="reckoning-btn-secondary disabled:opacity-60"
            >
              Skip
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                setError(null);
                setStep("front");
              }}
              className="min-h-11 text-sm text-zinc-400 hover:text-white"
            >
              Back
            </button>
          </>
        ) : null}

        {step === "details" ? (
          <>
            <button
              type="button"
              onClick={onSave}
              disabled={busy}
              className="reckoning-btn-primary disabled:opacity-60"
            >
              {saving ? "Saving…" : "Save check-in"}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                setError(null);
                setStep("side");
              }}
              className="min-h-11 text-sm text-zinc-400 hover:text-white"
            >
              Back
            </button>
          </>
        ) : null}
      </div>
    </main>
  );
}
