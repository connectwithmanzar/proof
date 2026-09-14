export type RoughTakenWhen =
  | "today"
  | "week"
  | "twoWeeks"
  | "month"
  | "threeMonths"
  | "sixMonths"
  | "year"
  | "older";

export const ROUGH_TAKEN_OPTIONS: {
  value: RoughTakenWhen;
  label: string;
}[] = [
  { value: "today", label: "Today" },
  { value: "week", label: "This week" },
  { value: "twoWeeks", label: "About 2 weeks ago" },
  { value: "month", label: "About a month ago" },
  { value: "threeMonths", label: "About 3 months ago" },
  { value: "sixMonths", label: "About 6 months ago" },
  { value: "year", label: "About a year ago" },
  { value: "older", label: "Older" },
];

/**
 * Coarse offsets from local now.
 * "This week" = 3 days ago (mid-week feel), not Sunday 00:00.
 */
const OFFSET_DAYS: Record<RoughTakenWhen, number> = {
  today: 0,
  week: 3,
  twoWeeks: 14,
  month: 30,
  threeMonths: 90,
  sixMonths: 180,
  year: 365,
  older: 730,
};

export function createdAtFromRoughDate(
  when: RoughTakenWhen,
  now = new Date(),
): string {
  const date = new Date(now.getTime());
  date.setDate(date.getDate() - OFFSET_DAYS[when]);
  return date.toISOString();
}
