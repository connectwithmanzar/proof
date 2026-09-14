import {
  formatComparePeriod,
  spanDays,
} from "@/lib/compare-period";
import {
  ACTIVITY_OPTIONS,
  FOCUS_OPTIONS,
  GOAL_OPTIONS,
  type ReckoningProfile,
} from "@/lib/profile-model";

export {
  formatComparePeriod,
  spanDays,
  spanMs,
} from "@/lib/compare-period";

type PromptEntry = {
  id: string;
  createdAt: string;
  weightKg: number;
};

function labelOf<T extends string>(
  options: { value: T; label: string }[],
  value: T,
): string {
  return options.find((option) => option.value === value)?.label ?? value;
}

function formatKg(weightKg: number): string {
  return `${Number(weightKg.toFixed(1))}kg`;
}

function displayName(profile: ReckoningProfile): string {
  return profile.display_name.trim() || "champ";
}

export function baselineFeedbackBody(profile: ReckoningProfile): string {
  const name = displayName(profile);
  const target = formatKg(profile.target_weight_kg);
  return `${name}, baseline locked. This is chapter one — I'll hunt real change from here. Target ${target}. Same pose next Sunday and we start the reckoning.`;
}

export function honestTooSoonBody(
  profile: ReckoningProfile,
  periodLabel: string,
): string {
  const name = displayName(profile);
  const target = formatKg(profile.target_weight_kg);
  if (periodLabel.startsWith("same day")) {
    return `${name}, same-day frame — I won't invent a win. Target ${target}. Real reckoning needs time + the same pose.`;
  }
  return `${name}, ${periodLabel} isn't enough runway — I won't invent a physique win. Target ${target}. Same pose next Sunday and we'll feast on real proof.`;
}

export function honestNoChangeBody(
  profile: ReckoningProfile,
  periodLabel: string,
  nowWeightKg: number,
): string {
  const name = displayName(profile);
  const target = formatKg(profile.target_weight_kg);
  const now = formatKg(nowWeightKg);
  return `${name}, over ${periodLabel} the photos look basically the same from here — no clear change I'm willing to call. Scale: ${now} vs target ${target}. Same light next Sunday.`;
}

export function buildFeedbackSystemPrompt(profile: ReckoningProfile): string {
  const buildFirst = profile.goal === "build";
  return [
    "You are a careful expert body coach reviewing progress photos for Reckoning. Prefer under-calling to over-calling. Hype gym energy is OK. Fake gains are not.",
    "Voice: personal, fired up, light humor. Gender-neutral hype. Never body-shame. Never clinical. Never say you are analyzing a physique.",
    "ONLY mention body changes you can clearly see in BOTH photos under fair pose and lighting. If unsure, say no clear change.",
    'NEVER invent thicker chest, shoulders, arms, legs, jaw, or "leaner" if the frames look the same or nearly the same.',
    "Lighting, pump, pose, camera distance, and clothes can fake change — call that out instead of a fake W.",
    'ALWAYS open or early-state the exact comparison period using the provided period label (e.g. "Over 6 days…" / "Over about 1 year…"). Never invent a week. Never round same-day up to a week.',
    "Structure: 1) Name + period. 2) What you can honestly see (or that you can't). 3) Weight vs target. 4) Next-Sunday push (same pose / show up).",
    "If the period is under about 1 week, default stance is too early for big physique claims unless change is blatant and lighting/pose match.",
    "Length: 2–5 short sentences. No bullets, no markdown, no hashtags, no medical diagnosis, no drug or diet prescriptions.",
    buildFirst
      ? "Their main goal is Build muscle & shape. Target weight may be HIGHER than today. Celebrate fuller/stronger/athletic ONLY when you can see it. Never treat gaining toward target as failure. Never lead with fat-scare or crash-cut advice. Softness on a build is not a dunk."
      : "Match their stated goal, but stay kind and honest. No shame.",
    "PRIMARY compare is first check-in (Then) vs this check-in (Now) — the journey. If a previous Sunday is provided and it is not the first check-in, add ONE short clause vs that last Sunday — still no invented gains.",
    "Humor = gym banter, not body jokes.",
    "Honest style samples (adapt, do not copy blindly):",
    `"${profile.display_name}, over {period} — I won't invent a win off these frames. Target {target}. Same pose next Sunday."`,
    `"${profile.display_name}, over {period} the photos look basically the same from here — no clear change I'm willing to call. Scale: {now} vs target {target}."`,
    `"${profile.display_name}, over {period} I can see {focus} looking fuller than day one. I'm not making that up. Still {kg_left}kg to {target}. Keep stacking."`,
    `"${profile.display_name}, I won't fake a W off this frame — pose or lighting fought you. Same spot next Sunday and we'll feast on real proof."`,
    `"${profile.display_name}, heavier and heading at {target} — that's fuel for the build, not a problem."`,
  ].join("\n");
}

export function buildFeedbackUserPrompt(input: {
  profile: ReckoningProfile;
  now: PromptEntry;
  then: PromptEntry;
  prev: PromptEntry | null;
  hasSides: boolean;
}): string {
  const { profile, now, then, prev, hasSides } = input;
  const focus =
    profile.focus_areas
      .map((area) => labelOf(FOCUS_OPTIONS, area))
      .join(", ") || "overall shape";
  const kgLeft = profile.target_weight_kg - now.weightKg;
  const includePrev = Boolean(prev && prev.id !== then.id);
  const period = formatComparePeriod(then.createdAt, now.createdAt);

  return [
    `Name: ${profile.display_name}`,
    `Goal: ${labelOf(GOAL_OPTIONS, profile.goal)} (${profile.goal})`,
    `Focus areas: ${focus}`,
    `Activity: ${labelOf(ACTIVITY_OPTIONS, profile.activity)}`,
    `Target weight: ${formatKg(profile.target_weight_kg)}`,
    `Then (first check-in) date: ${then.createdAt} weight: ${formatKg(then.weightKg)}`,
    `Now (this check-in) date: ${now.createdAt} weight: ${formatKg(now.weightKg)}`,
    `Comparison period (USE THIS EXACTLY): ${period}`,
    `Span days (integer, do not round up): ${spanDays(then.createdAt, now.createdAt)}`,
    `Kg from now to target (positive means still below target): ${kgLeft.toFixed(1)}`,
    includePrev && prev
      ? `Previous Sunday date: ${prev.createdAt} weight: ${formatKg(prev.weightKg)} — add one clause vs that week.`
      : "No separate previous-Sunday line (first compare is also last Sunday).",
    hasSides
      ? "Images attached: Then front, Now front, Then side, Now side."
      : "Images attached: Then front, Now front.",
    "If photos look the same, say so. Do not invent gains.",
    "Write the reckoning now. Open with the exact comparison period.",
  ].join("\n");
}

const FAKE_GAIN =
  /\b(thicker|fuller|leaner|shredded|gains?|shoulders|chest).{0,40}(than|from)\b/i;
const ADMITS_LIMIT =
  /\b(unfair|same|won't fake|will not fake|no clear|look the same|nearly the same|can't call|cannot call|won't invent|will not invent)\b/i;

export function shouldReplaceShortSpanOvercall(
  text: string,
  days: number,
): boolean {
  if (days >= 7) return false;
  if (!FAKE_GAIN.test(text)) return false;
  return !ADMITS_LIMIT.test(text);
}
