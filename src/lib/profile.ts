import { createClient } from "@/lib/supabase/client";
import {
  rowToProfile,
  type ProfileInput,
  type ReckoningProfile,
} from "@/lib/profile-model";

export {
  ACTIVITY_OPTIONS,
  FOCUS_OPTIONS,
  GENDER_OPTIONS,
  GOAL_OPTIONS,
  isOnboardingComplete,
  rowToProfile,
  type Activity,
  type FocusArea,
  type Gender,
  type Goal,
  type ProfileInput,
  type ReckoningProfile,
} from "@/lib/profile-model";

export const PROFILE_CACHE_KEY = "proof_profile";

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
