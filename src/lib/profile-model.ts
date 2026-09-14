export type Gender = "woman" | "man" | "non_binary" | "prefer_not";
export type Goal = "build" | "leaner" | "face" | "restart" | "track";
export type FocusArea =
  | "whole_body"
  | "chest_shoulders"
  | "arms"
  | "stomach"
  | "legs"
  | "hips_glutes"
  | "back_posture"
  | "face";
export type Activity = "sitting" | "light" | "train_few" | "train_hard";

export type ReckoningProfile = {
  user_id: string;
  display_name: string;
  date_of_birth: string;
  gender: Gender;
  height_cm: number;
  current_weight_kg: number;
  target_weight_kg: number;
  goal: Goal;
  focus_areas: FocusArea[];
  activity: Activity;
  onboarding_completed_at: string;
  updated_at: string;
};

export type ProfileInput = {
  display_name: string;
  date_of_birth: string;
  gender: Gender;
  height_cm: number;
  current_weight_kg: number;
  target_weight_kg: number;
  goal: Goal;
  focus_areas: FocusArea[];
  activity: Activity;
};

export const GENDER_OPTIONS: { value: Gender; label: string }[] = [
  { value: "woman", label: "Woman" },
  { value: "man", label: "Man" },
  { value: "non_binary", label: "Non-binary" },
  { value: "prefer_not", label: "Prefer not to say" },
];

export const GOAL_OPTIONS: { value: Goal; label: string }[] = [
  { value: "build", label: "Build muscle & shape" },
  { value: "leaner", label: "Get leaner" },
  { value: "face", label: "Face looks sharper" },
  { value: "restart", label: "Restart after a setback" },
  { value: "track", label: "Just track for now" },
];

export const FOCUS_OPTIONS: { value: FocusArea; label: string }[] = [
  { value: "whole_body", label: "Whole body" },
  { value: "chest_shoulders", label: "Chest & shoulders" },
  { value: "arms", label: "Arms" },
  { value: "stomach", label: "Stomach" },
  { value: "legs", label: "Legs" },
  { value: "hips_glutes", label: "Hips & glutes" },
  { value: "back_posture", label: "Back & posture" },
  { value: "face", label: "Face" },
];

export const ACTIVITY_OPTIONS: { value: Activity; label: string }[] = [
  { value: "sitting", label: "Mostly sitting" },
  { value: "light", label: "Light movement" },
  { value: "train_few", label: "Train a few times a week" },
  { value: "train_hard", label: "Train hard most days" },
];

function isFocusArea(value: string): value is FocusArea {
  return FOCUS_OPTIONS.some((option) => option.value === value);
}

function asNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() && Number.isFinite(Number(value))) {
    return Number(value);
  }
  return null;
}

export function rowToProfile(row: Record<string, unknown>): ReckoningProfile | null {
  const height_cm = asNumber(row.height_cm);
  const current_weight_kg = asNumber(row.current_weight_kg);
  const target_weight_kg = asNumber(row.target_weight_kg);
  if (
    typeof row.user_id !== "string" ||
    typeof row.display_name !== "string" ||
    typeof row.date_of_birth !== "string" ||
    typeof row.gender !== "string" ||
    height_cm === null ||
    current_weight_kg === null ||
    target_weight_kg === null ||
    typeof row.goal !== "string" ||
    typeof row.activity !== "string"
  ) {
    return null;
  }
  const focus = Array.isArray(row.focus_areas)
    ? row.focus_areas.filter(
        (item): item is FocusArea => typeof item === "string" && isFocusArea(item),
      )
    : [];
  return {
    user_id: row.user_id,
    display_name: row.display_name,
    date_of_birth: row.date_of_birth,
    gender: row.gender as Gender,
    height_cm,
    current_weight_kg,
    target_weight_kg,
    goal: row.goal as Goal,
    focus_areas: focus,
    activity: row.activity as Activity,
    onboarding_completed_at:
      typeof row.onboarding_completed_at === "string"
        ? row.onboarding_completed_at
        : new Date().toISOString(),
    updated_at:
      typeof row.updated_at === "string"
        ? row.updated_at
        : new Date().toISOString(),
  };
}

export function isOnboardingComplete(profile: ReckoningProfile | null): boolean {
  return Boolean(profile?.onboarding_completed_at && profile.display_name);
}
