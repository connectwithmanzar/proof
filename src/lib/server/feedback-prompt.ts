import {
  ACTIVITY_OPTIONS,
  FOCUS_OPTIONS,
  GOAL_OPTIONS,
  type ReckoningProfile,
} from "@/lib/profile-model";

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

function weeksApart(thenIso: string, nowIso: string): number {
  const then = new Date(thenIso).getTime();
  const now = new Date(nowIso).getTime();
  if (!Number.isFinite(then) || !Number.isFinite(now) || now <= then) return 0;
  return Math.max(1, Math.round((now - then) / (7 * 24 * 60 * 60 * 1000)));
}

export function baselineFeedbackBody(
  profile: ReckoningProfile,
): string {
  const name = profile.display_name.trim() || "champ";
  const target = formatKg(profile.target_weight_kg);
  return `${name}, baseline locked. This is chapter one — I'll hunt real change from here. Target ${target}. Same pose next Sunday and we start the reckoning.`;
}

export function buildFeedbackSystemPrompt(profile: ReckoningProfile): string {
  const buildFirst = profile.goal === "build";
  return [
    "You write Reckoning check-in feedback. Voice: hype gym energy, personal, fired up, light humor. Gender-neutral hype. Never body-shame. Never clinical. Never say you are analyzing a physique.",
    "Structure every reply: 1) Hook with their first name + energy. 2) What changed in the photos — you found it. 3) Weight vs their target. 4) One next-Sunday push (same pose / show up).",
    "Length: 2–5 short sentences. No bullets, no markdown, no hashtags, no medical diagnosis, no drug or diet prescriptions.",
    buildFirst
      ? "Their main goal is Build muscle & shape. Target weight may be HIGHER than today. Celebrate fuller/stronger/athletic. Never treat gaining toward target as failure. Never lead with fat-scare or crash-cut advice. Softness on a build is not a dunk."
      : "Match their stated goal, but stay kind and honest. No shame.",
    "PRIMARY compare is first check-in (Then) vs this check-in (Now) — the journey. If a previous Sunday is provided and it is not the first check-in, add ONE short clause vs that last Sunday.",
    "If pose or lighting makes the photos unfair, admit it. Do not fake a win.",
    "Humor = gym banter, not body jokes.",
    "Style samples (adapt, do not copy blindly):",
    `"${profile.display_name}, THERE it is — {focus} looking fuller than week one. I'm not making that up. Still {kg_left}kg to {target}. Keep stacking."`,
    `"${profile.display_name}, scale went quiet but the photos didn't — {focus} looks stronger than before. Recomp vibes. Trust the Sundays."`,
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

  return [
    `Name: ${profile.display_name}`,
    `Goal: ${labelOf(GOAL_OPTIONS, profile.goal)} (${profile.goal})`,
    `Focus areas: ${focus}`,
    `Activity: ${labelOf(ACTIVITY_OPTIONS, profile.activity)}`,
    `Target weight: ${formatKg(profile.target_weight_kg)}`,
    `Then (first check-in) date: ${then.createdAt} weight: ${formatKg(then.weightKg)}`,
    `Now (this check-in) date: ${now.createdAt} weight: ${formatKg(now.weightKg)}`,
    `Weeks from first to now: ${weeksApart(then.createdAt, now.createdAt)}`,
    `Kg from now to target (positive means still below target): ${kgLeft.toFixed(1)}`,
    includePrev && prev
      ? `Previous Sunday date: ${prev.createdAt} weight: ${formatKg(prev.weightKg)} — add one clause vs that week.`
      : "No separate previous-Sunday line (first compare is also last Sunday).",
    hasSides
      ? "Images attached: Then front, Now front, Then side, Now side."
      : "Images attached: Then front, Now front.",
    "Write the reckoning now.",
  ].join("\n");
}
