import { createClient } from "@/lib/supabase/client";

export const PROFILE_CACHE_KEY = "proof_profile";

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

function rowToProfile(row: Record<string, unknown>): ReckoningProfile | null {
  if (
    typeof row.user_id !== "string" ||
    typeof row.display_name !== "string" ||
    typeof row.date_of_birth !== "string" ||
    typeof row.gender !== "string" ||
    typeof row.height_cm !== "number" ||
    typeof row.current_weight_kg !== "number" ||
    typeof row.target_weight_kg !== "number" ||
    typeof row.goal !== "string" ||
    typeof row.activity !== "string"
  ) {
    return null;
  }
  const focus = Array.isArray(row.focus_areas)
    ? row.focus_areas.filter((item): item is FocusArea => typeof item === "string" && isFocusArea(item))
    : [];
  return {
    user_id: row.user_id,
    display_name: row.display_name,
    date_of_birth: row.date_of_birth,
    gender: row.gender as Gender,
    height_cm: row.height_cm,
    current_weight_kg: row.current_weight_kg,
    target_weight_kg: row.target_weight_kg,
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

export function cacheProfile(profile: ReckoningProfile | null): void {
  if (typeof window === "undefined") return;
  if (!profile) {
    localStorage.removeItem(PROFILE_CACHE_KEY);
    return;
  }
  localStorage.setItem(PROFILE_CACHE_KEY, JSON.stringify(profile));
}

export function readCachedProfile(): ReckoningProfile | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(PROFILE_CACHE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    return rowToProfile(parsed as Record<string, unknown>);
  } catch {
    return null;
  }
}

export function isOnboardingComplete(profile: ReckoningProfile | null): boolean {
  return Boolean(profile?.onboarding_completed_at && profile.display_name);
}

export async function getProfile(): Promise<ReckoningProfile | null> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("reckoning_profiles")
    .select(
      "user_id, display_name, date_of_birth, gender, height_cm, current_weight_kg, target_weight_kg, goal, focus_areas, activity, onboarding_completed_at, updated_at",
    )
    .eq("user_id", user.id)
    .maybeSingle();

  if (error || !data) {
    cacheProfile(null);
    return null;
  }
  const profile = rowToProfile(data as Record<string, unknown>);
  cacheProfile(profile);
  return profile;
}

export async function saveProfile(input: ProfileInput): Promise<ReckoningProfile> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Sign in required");

  const now = new Date().toISOString();
  const row = {
    user_id: user.id,
    display_name: input.display_name.trim(),
    date_of_birth: input.date_of_birth,
    gender: input.gender,
    height_cm: input.height_cm,
    current_weight_kg: input.current_weight_kg,
    target_weight_kg: input.target_weight_kg,
    goal: input.goal,
    focus_areas: input.focus_areas.slice(0, 2),
    activity: input.activity,
    onboarding_completed_at: now,
    updated_at: now,
  };

  const { data, error } = await supabase
    .from("reckoning_profiles")
    .upsert(row, { onConflict: "user_id" })
    .select(
      "user_id, display_name, date_of_birth, gender, height_cm, current_weight_kg, target_weight_kg, goal, focus_areas, activity, onboarding_completed_at, updated_at",
    )
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Could not save your baseline");
  }
  const profile = rowToProfile(data as Record<string, unknown>);
  if (!profile) throw new Error("Could not save your baseline");
  cacheProfile(profile);
  return profile;
}

export function cmFromFeetInches(feet: number, inches: number): number {
  return (feet * 12 + inches) * 2.54;
}

export function feetInchesFromCm(cm: number): { feet: number; inches: number } {
  const totalInches = cm / 2.54;
  const feet = Math.floor(totalInches / 12);
  return { feet, inches: totalInches - feet * 12 };
}

export function kgFromLb(lb: number): number {
  return lb / 2.2046226218;
}

export function lbFromKg(kg: number): number {
  return kg * 2.2046226218;
}
