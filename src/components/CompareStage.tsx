"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import type { ProgressEntry } from "@/lib/entries";
import { formatEntryDate, formatKg } from "@/lib/entries";
import type { PhotoKind } from "@/lib/photo-db";
import { useDisplayPhoto } from "@/lib/use-display-photo";

export type CompareMode = "side-by-side" | "slider";

type CompareStageProps = {
  a: ProgressEntry;
  b: ProgressEntry;
  kind: PhotoKind;
  mode: CompareMode;
  onKindChange: (kind: PhotoKind) => void;
  onModeChange: (mode: CompareMode) => void;
};

function resolveKind(entry: ProgressEntry, kind: PhotoKind): PhotoKind {
  if (kind === "side" && entry.hasSide) return "side";
  return "front";
}

function Segmented<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (value: T) => void;
  options: { value: T; label: string }[];
}) {
  return (
    <div
      className="grid rounded-2xl border border-zinc-800 p-1"
      style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}
    >
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={`min-h-12 rounded-xl px-3 text-sm font-semibold ${
              active ? "bg-white text-black" : "text-zinc-400"
            }`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

function StagePhoto({
  src,
  alt,
  className,
  style,
}: {
  src: string | null;
  alt: string;
  className?: string;
  style?: CSSProperties;
}) {
  if (!src) {
    return (
      <div
        className={`flex items-center justify-center bg-zinc-900 text-xs text-zinc-600 ${className ?? ""}`}
        style={style}
        aria-hidden
      >
        …
      </div>
    );
  }

  return (
    // Private object URL from useDisplayPhoto.
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} className={className} style={style} />
  );
}

function SliderReveal({
  aSrc,
  bSrc,
  aAlt,
  bAlt,
  aCaption,
  bCaption,
}: {
  aSrc: string | null;
  bSrc: string | null;
  aAlt: string;
  bAlt: string;
  aCaption: string;
  bCaption: string;
}) {
  const frameRef = useRef<HTMLDivElement>(null);
  const [split, setSplit] = useState(50);

  useEffect(() => {
    setSplit(50);
  }, [aSrc, bSrc]);

  function setFromClientX(clientX: number) {
    const frame = frameRef.current;
    if (!frame) return;
    const rect = frame.getBoundingClientRect();
    if (rect.width <= 0) return;
    const next = ((clientX - rect.left) / rect.width) * 100;
    setSplit(Math.min(100, Math.max(0, next)));
  }

  return (
    <div>
      <div
        ref={frameRef}
        className="relative aspect-[3/4] w-full touch-none overflow-hidden rounded-2xl bg-zinc-900"
        onPointerDown={(event) => {
          event.currentTarget.setPointerCapture(event.pointerId);
          setFromClientX(event.clientX);
        }}
        onPointerMove={(event) => {
          if (!event.currentTarget.hasPointerCapture(event.pointerId)) return;
          setFromClientX(event.clientX);
        }}
      >
        <StagePhoto
          src={bSrc}
          alt={bAlt}
          className="absolute inset-0 h-full w-full object-cover"
        />
        <StagePhoto
          src={aSrc}
          alt={aAlt}
          className="absolute inset-0 h-full w-full object-cover"
          style={{ clipPath: `inset(0 ${100 - split}% 0 0)` }}
        />
        <div
          className="pointer-events-none absolute inset-y-0 z-10 w-0.5 bg-white"
          style={{ left: `${split}%`, transform: "translateX(-50%)" }}
        >
          <div className="absolute left-1/2 top-1/2 flex h-11 w-11 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white text-black shadow-[0_4px_16px_rgba(0,0,0,0.45)]">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path
                d="M8 7 4 12l4 5M16 7l4 5-4 5"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        </div>
        <p className="pointer-events-none absolute left-3 top-3 rounded-lg bg-black/55 px-2 py-1 text-xs font-medium text-white">
          Then · {aCaption}
        </p>
        <p className="pointer-events-none absolute right-3 top-3 rounded-lg bg-black/55 px-2 py-1 text-xs font-medium text-white">
          Now · {bCaption}
        </p>
      </div>
      <label className="mt-3 block">
        <span className="sr-only">Reveal change</span>
        <input
          type="range"
          min={0}
          max={100}
          value={split}
          onChange={(event) => setSplit(Number(event.target.value))}
          aria-label="Reveal change"
          className="reckoning-range"
        />
      </label>
    </div>
  );
}

export function CompareStage({
  a,
  b,
  kind,
  mode,
  onKindChange,
  onModeChange,
}: CompareStageProps) {
  const showKindToggle = a.hasSide || b.hasSide;
  const aKind = resolveKind(a, kind);
  const bKind = resolveKind(b, kind);
  const fellBack = kind === "side" && (aKind === "front" || bKind === "front");
  const aSrc = useDisplayPhoto(a.id, aKind);
  const bSrc = useDisplayPhoto(b.id, bKind);
  const aCaption = `${formatEntryDate(a.createdAt)} · ${formatKg(a.weightKg)}`;
  const bCaption = `${formatEntryDate(b.createdAt)} · ${formatKg(b.weightKg)}`;

  return (
    <section className="mt-5">
      <Segmented
        value={mode}
        onChange={onModeChange}
        options={[
          { value: "slider", label: "Slider" },
          { value: "side-by-side", label: "Side by side" },
        ]}
      />

      {showKindToggle ? (
        <div className="mt-3">
          <Segmented
            value={kind}
            onChange={onKindChange}
            options={[
              { value: "front", label: "Front" },
              { value: "side", label: "Side" },
            ]}
          />
        </div>
      ) : null}

      {fellBack ? (
        <p className="mt-3 text-sm text-zinc-500">
          One of these check-ins has no side photo, so that side shows front.
        </p>
      ) : null}

      <div className="mt-4">
        {mode === "slider" ? (
          <SliderReveal
            aSrc={aSrc}
            bSrc={bSrc}
            aAlt={`Then, ${aCaption}`}
            bAlt={`Now, ${bCaption}`}
            aCaption={aCaption}
            bCaption={bCaption}
          />
        ) : (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <StagePhoto
                src={aSrc}
                alt={`Then, ${aCaption}`}
                className="aspect-[3/4] w-full rounded-2xl object-cover"
              />
              <p className="mt-2 text-xs font-medium uppercase tracking-[0.12em] text-zinc-500">
                Then
              </p>
              <p className="mt-1 text-lg font-semibold">{formatKg(a.weightKg)}</p>
              <p className="mt-0.5 text-xs text-zinc-500">
                {formatEntryDate(a.createdAt)}
              </p>
            </div>
            <div>
              <StagePhoto
                src={bSrc}
                alt={`Now, ${bCaption}`}
                className="aspect-[3/4] w-full rounded-2xl object-cover"
              />
              <p className="mt-2 text-xs font-medium uppercase tracking-[0.12em] text-zinc-500">
                Now
              </p>
              <p className="mt-1 text-lg font-semibold">{formatKg(b.weightKg)}</p>
              <p className="mt-0.5 text-xs text-zinc-500">
                {formatEntryDate(b.createdAt)}
              </p>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
