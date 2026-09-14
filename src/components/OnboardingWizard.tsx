"use client";

import { useEffect, useId, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/components/SessionProvider";
import {
  ACTIVITY_OPTIONS,
  cmFromFeetInches,
  feetInchesFromCm,
  FOCUS_OPTIONS,
  GENDER_OPTIONS,
  GOAL_OPTIONS,
  kgFromLb,
  lbFromKg,
  saveProfile,
  type Activity,
  type FocusArea,
  type Gender,
  type Goal,
} from "@/lib/profile";

const DRAFT_KEY = "reckoning_onboarding_draft";

type Draft = {
  step: number;
  displayName: string;
  dob: string;
  gender: Gender | null;
  heightUnit: "cm" | "ft";
  heightCm: string;
  heightFt: string;
  heightIn: string;
  weightUnit: "kg" | "lb";
  currentWeight: string;
  targetWeight: string;
  goal: Goal | null;
  focus: FocusArea[];
  activity: Activity | null;
};

const EMPTY_DRAFT: Draft = {
  step: 0,
  displayName: "",
  dob: "",
  gender: null,
  heightUnit: "cm",
  heightCm: "",
  heightFt: "",
  heightIn: "",
  weightUnit: "kg",
  currentWeight: "",
  targetWeight: "",
  goal: null,
  focus: [],
  activity: null,
};

function readDraft(): Draft {
  if (typeof window === "undefined") return EMPTY_DRAFT;
  try {
    const raw = sessionStorage.getItem(DRAFT_KEY);
    if (!raw) return EMPTY_DRAFT;
    const parsed = JSON.parse(raw) as Partial<Draft>;
    return { ...EMPTY_DRAFT, ...parsed };
  } catch {
    return EMPTY_DRAFT;
  }
}

function ChoiceButton({
  selected,
  label,
  onClick,
}: {
  selected: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex min-h-14 w-full items-center justify-center rounded-2xl px-5 text-base font-semibold ${
        selected
          ? "bg-white text-black"
          : "border border-zinc-700 bg-zinc-950 text-white"
      }`}
    >
      {label}
    </button>
  );
}

function roundOne(value: number): string {
  return String(Math.round(value * 10) / 10);
}

export function OnboardingWizard() {
  const router = useRouter();
  const { refreshProfile } = useSession();
  const nameId = useId();
  const dobId = useId();
  const heightId = useId();
  const currentId = useId();
  const targetId = useId();
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);
  const [hydrated, setHydrated] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setDraft(readDraft());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    sessionStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
  }, [draft, hydrated]);

  function patch(partial: Partial<Draft>) {
    setDraft((current) => ({ ...current, ...partial }));
  }

  function heightCm(): number {
    if (draft.heightUnit === "cm") return Number(draft.heightCm);
    return cmFromFeetInches(Number(draft.heightFt) || 0, Number(draft.heightIn) || 0);
  }

  function weightKg(raw: string): number {
    const value = Number(raw);
    if (draft.weightUnit === "lb") return kgFromLb(value);
    return value;
  }

  function switchWeightUnit(next: "kg" | "lb") {
    if (next === draft.weightUnit) return;
    const convert = (raw: string) => {
      const value = Number(raw);
      if (!Number.isFinite(value) || value <= 0) return raw;
      return next === "lb" ? roundOne(lbFromKg(value)) : roundOne(kgFromLb(value));
    };
    patch({
      weightUnit: next,
      currentWeight: convert(draft.currentWeight),
      targetWeight: convert(draft.targetWeight),
    });
  }

  function canContinue(): boolean {
    switch (draft.step) {
      case 0:
        return true;
      case 1:
        return draft.displayName.trim().length > 0;
      case 2:
        return Boolean(draft.dob);
      case 3:
        return Boolean(draft.gender);
      case 4:
        return Number.isFinite(heightCm()) && heightCm() > 0;
      case 5:
        return Number.isFinite(weightKg(draft.currentWeight)) && weightKg(draft.currentWeight) > 0;
      case 6:
        return Number.isFinite(weightKg(draft.targetWeight)) && weightKg(draft.targetWeight) > 0;
      case 7:
        return Boolean(draft.goal);
      case 8:
        return draft.focus.length <= 2;
      case 9:
        return Boolean(draft.activity);
      default:
        return false;
    }
  }

  const currentKg = weightKg(draft.currentWeight);
  const targetKg = weightKg(draft.targetWeight);
  const sameWeight =
    draft.step === 6 &&
    Number.isFinite(currentKg) &&
    Number.isFinite(targetKg) &&
    currentKg > 0 &&
    targetKg > 0 &&
    Math.abs(currentKg - targetKg) < 0.05;

  async function onPrimary() {
    setError(null);
    if (draft.step < 9) {
      patch({ step: draft.step + 1 });
      return;
    }
    if (
      !draft.gender ||
      !draft.goal ||
      !draft.activity ||
      !draft.displayName.trim() ||
      !draft.dob
    ) {
      setError("Finish the last answers, then continue.");
      return;
    }
    setSaving(true);
    try {
      await saveProfile({
        display_name: draft.displayName.trim(),
        date_of_birth: draft.dob,
        gender: draft.gender,
        height_cm: heightCm(),
        current_weight_kg: currentKg,
        target_weight_kg: targetKg,
        goal: draft.goal,
        focus_areas: draft.focus,
        activity: draft.activity,
      });
      await refreshProfile();
      sessionStorage.removeItem(DRAFT_KEY);
      patch({ step: 10 });
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Could not lock your baseline. Try again.",
      );
    } finally {
      setSaving(false);
    }
  }

  if (!hydrated) {
    return (
      <main className="px-5 pt-10">
        <p className="text-zinc-500">Loading…</p>
      </main>
    );
  }

  return (
    <main className="flex min-h-dvh flex-col px-5 pb-8 pt-8">
      {draft.step > 0 && draft.step < 10 ? (
        <button
          type="button"
          onClick={() => {
            setError(null);
            patch({ step: draft.step - 1 });
          }}
          className="mb-4 min-h-11 self-start text-sm text-zinc-400 hover:text-white"
        >
          Back
        </button>
      ) : (
        <div className="mb-4 min-h-11" />
      )}

      {draft.step === 0 ? (
        <>
          <h1 className="text-5xl font-semibold tracking-tight">
            Day one starts now.
          </h1>
          <p className="mt-4 text-lg leading-snug text-zinc-300">
            Quick setup. Then Sundays stay simple — photo, weight, date.
            I&apos;ll hunt the change.
          </p>
        </>
      ) : null}

      {draft.step === 1 ? (
        <>
          <h1 className="text-4xl font-semibold tracking-tight">
            What should I call you?
          </h1>
          <p className="mt-3 text-zinc-400">
            First name is enough — I&apos;ll use it when I talk progress.
          </p>
          <label htmlFor={nameId} className="sr-only">
            First name
          </label>
          <input
            id={nameId}
            type="text"
            autoComplete="given-name"
            value={draft.displayName}
            onChange={(event) => patch({ displayName: event.target.value })}
            placeholder="e.g. Alex"
            className="reckoning-field mt-6"
          />
        </>
      ) : null}

      {draft.step === 2 ? (
        <>
          <h1 className="text-4xl font-semibold tracking-tight">
            When were you born?
          </h1>
          <p className="mt-3 text-zinc-400">
            Exact date — so your journey stays yours.
          </p>
          <label htmlFor={dobId} className="sr-only">
            Date of birth
          </label>
          <input
            id={dobId}
            type="date"
            value={draft.dob}
            onChange={(event) => patch({ dob: event.target.value })}
            className="reckoning-field mt-6"
          />
        </>
      ) : null}

      {draft.step === 3 ? (
        <>
          <h1 className="text-4xl font-semibold tracking-tight">What fits you?</h1>
          <div className="mt-6 space-y-2">
            {GENDER_OPTIONS.map((option) => (
              <ChoiceButton
                key={option.value}
                label={option.label}
                selected={draft.gender === option.value}
                onClick={() => patch({ gender: option.value })}
              />
            ))}
          </div>
        </>
      ) : null}

      {draft.step === 4 ? (
        <>
          <h1 className="text-4xl font-semibold tracking-tight">
            How tall are you?
          </h1>
          <p className="mt-3 text-zinc-400">Used to read your progress fairly.</p>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <ChoiceButton
              label="cm"
              selected={draft.heightUnit === "cm"}
              onClick={() => {
                if (draft.heightUnit === "cm") return;
                const cm = cmFromFeetInches(
                  Number(draft.heightFt) || 0,
                  Number(draft.heightIn) || 0,
                );
                patch({
                  heightUnit: "cm",
                  heightCm: cm > 0 ? roundOne(cm) : draft.heightCm,
                });
              }}
            />
            <ChoiceButton
              label="ft/in"
              selected={draft.heightUnit === "ft"}
              onClick={() => {
                if (draft.heightUnit === "ft") return;
                const cm = Number(draft.heightCm);
                if (Number.isFinite(cm) && cm > 0) {
                  const parts = feetInchesFromCm(cm);
                  patch({
                    heightUnit: "ft",
                    heightFt: String(parts.feet),
                    heightIn: roundOne(parts.inches),
                  });
                  return;
                }
                patch({ heightUnit: "ft" });
              }}
            />
          </div>
          {draft.heightUnit === "cm" ? (
            <>
              <label htmlFor={heightId} className="mt-5 block text-sm text-zinc-400">
                Height (cm)
              </label>
              <input
                id={heightId}
                type="number"
                inputMode="decimal"
                min="1"
                step="0.1"
                value={draft.heightCm}
                onChange={(event) => patch({ heightCm: event.target.value })}
                className="reckoning-field mt-2"
              />
            </>
          ) : (
            <div className="mt-5 grid grid-cols-2 gap-3">
              <div>
                <p className="text-sm text-zinc-400">Feet</p>
                <input
                  type="number"
                  inputMode="numeric"
                  min="0"
                  value={draft.heightFt}
                  onChange={(event) => patch({ heightFt: event.target.value })}
                  className="reckoning-field mt-2"
                />
              </div>
              <div>
                <p className="text-sm text-zinc-400">Inches</p>
                <input
                  type="number"
                  inputMode="decimal"
                  min="0"
                  max="11.9"
                  step="0.1"
                  value={draft.heightIn}
                  onChange={(event) => patch({ heightIn: event.target.value })}
                  className="reckoning-field mt-2"
                />
              </div>
            </div>
          )}
        </>
      ) : null}

      {draft.step === 5 ? (
        <>
          <h1 className="text-4xl font-semibold tracking-tight">
            Today&apos;s starting weight
          </h1>
          <p className="mt-3 text-zinc-400">No judgment — just chapter one.</p>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <ChoiceButton
              label="kg"
              selected={draft.weightUnit === "kg"}
              onClick={() => switchWeightUnit("kg")}
            />
            <ChoiceButton
              label="lb"
              selected={draft.weightUnit === "lb"}
              onClick={() => switchWeightUnit("lb")}
            />
          </div>
          <label htmlFor={currentId} className="mt-5 block text-sm text-zinc-400">
            Weight ({draft.weightUnit})
          </label>
          <input
            id={currentId}
            type="number"
            inputMode="decimal"
            min="0.1"
            step="0.1"
            value={draft.currentWeight}
            onChange={(event) => patch({ currentWeight: event.target.value })}
            className="reckoning-field mt-2"
          />
        </>
      ) : null}

      {draft.step === 6 ? (
        <>
          <h1 className="text-4xl font-semibold tracking-tight">
            Where are we headed?
          </h1>
          <p className="mt-3 text-zinc-400">
            Building? Target can be higher than today. Cutting? Lower. Your
            call.
          </p>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <ChoiceButton
              label="kg"
              selected={draft.weightUnit === "kg"}
              onClick={() => switchWeightUnit("kg")}
            />
            <ChoiceButton
              label="lb"
              selected={draft.weightUnit === "lb"}
              onClick={() => switchWeightUnit("lb")}
            />
          </div>
          <label htmlFor={targetId} className="mt-5 block text-sm text-zinc-400">
            Target ({draft.weightUnit})
          </label>
          <input
            id={targetId}
            type="number"
            inputMode="decimal"
            min="0.1"
            step="0.1"
            value={draft.targetWeight}
            onChange={(event) => patch({ targetWeight: event.target.value })}
            className="reckoning-field mt-2"
          />
          {sameWeight ? (
            <p className="mt-3 text-sm text-zinc-400">
              Same as now is fine — we&apos;ll track shape.
            </p>
          ) : null}
        </>
      ) : null}

      {draft.step === 7 ? (
        <>
          <h1 className="text-4xl font-semibold tracking-tight">
            What&apos;s the main mission?
          </h1>
          <div className="mt-6 space-y-2">
            {GOAL_OPTIONS.map((option) => (
              <ChoiceButton
                key={option.value}
                label={option.label}
                selected={draft.goal === option.value}
                onClick={() => patch({ goal: option.value })}
              />
            ))}
          </div>
        </>
      ) : null}

      {draft.step === 8 ? (
        <>
          <h1 className="text-4xl font-semibold tracking-tight">
            Where should I look hardest?
          </h1>
          <p className="mt-3 text-zinc-400">
            Pick up to 2 — I&apos;ll hunt change there first.
          </p>
          <div className="mt-6 space-y-2">
            {FOCUS_OPTIONS.map((option) => {
              const selected = draft.focus.includes(option.value);
              return (
                <ChoiceButton
                  key={option.value}
                  label={option.label}
                  selected={selected}
                  onClick={() => {
                    if (selected) {
                      patch({
                        focus: draft.focus.filter((item) => item !== option.value),
                      });
                      return;
                    }
                    if (draft.focus.length >= 2) return;
                    patch({ focus: [...draft.focus, option.value] });
                  }}
                />
              );
            })}
          </div>
        </>
      ) : null}

      {draft.step === 9 ? (
        <>
          <h1 className="text-4xl font-semibold tracking-tight">
            How hard are you training most weeks?
          </h1>
          <div className="mt-6 space-y-2">
            {ACTIVITY_OPTIONS.map((option) => (
              <ChoiceButton
                key={option.value}
                label={option.label}
                selected={draft.activity === option.value}
                onClick={() => patch({ activity: option.value })}
              />
            ))}
          </div>
        </>
      ) : null}

      {draft.step === 10 ? (
        <>
          <h1 className="text-4xl font-semibold tracking-tight">
            Baseline locked.
          </h1>
          <p className="mt-4 text-base leading-snug text-zinc-300">
            From here it&apos;s Sundays — photo, weight, date. I&apos;ll call you
            by name, find what&apos;s changing, and keep the hype honest.
          </p>
          <button
            type="button"
            onClick={() => router.replace("/capture")}
            className="reckoning-btn-primary mt-8"
          >
            Take first check-in
          </button>
          <button
            type="button"
            onClick={() => router.replace("/")}
            className="reckoning-btn-secondary mt-3"
          >
            Go to Home
          </button>
        </>
      ) : null}

      {error ? (
        <p className="mt-4 text-sm text-red-400" role="alert">
          {error}
        </p>
      ) : null}

      {draft.step < 10 ? (
        <button
          type="button"
          disabled={!canContinue() || saving}
          onClick={() => void onPrimary()}
          className="reckoning-btn-primary mt-8 disabled:opacity-60"
        >
          {saving
            ? "Locking…"
            : draft.step === 0
              ? "Let's go"
              : "Continue"}
        </button>
      ) : null}
    </main>
  );
}
