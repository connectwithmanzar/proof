export type ProgressEntry = {
  id: string;
  createdAt: string;
  weightKg: number;
  note?: string;
  hasFront: true;
  hasSide: boolean;
};

export const ENTRIES_KEY = "proof_entries";

function canUseStorage(): boolean {
  return typeof window !== "undefined";
}

function isProgressEntry(value: unknown): value is ProgressEntry {
  if (!value || typeof value !== "object") return false;
  const entry = value as Record<string, unknown>;
  return (
    typeof entry.id === "string" &&
    typeof entry.createdAt === "string" &&
    typeof entry.weightKg === "number" &&
    Number.isFinite(entry.weightKg) &&
    entry.hasFront === true &&
    typeof entry.hasSide === "boolean" &&
    (entry.note === undefined || typeof entry.note === "string")
  );
}

export function getEntries(): ProgressEntry[] {
  if (!canUseStorage()) return [];
  try {
    const raw = localStorage.getItem(ENTRIES_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isProgressEntry);
  } catch {
    return [];
  }
}

export function saveEntries(entries: ProgressEntry[]): void {
  if (!canUseStorage()) return;
  localStorage.setItem(ENTRIES_KEY, JSON.stringify(entries));
}

export function addEntry(entry: ProgressEntry): ProgressEntry[] {
  const next = [...getEntries(), entry];
  saveEntries(next);
  return next;
}

export function getSortedNewestFirst(
  entries: ProgressEntry[] = getEntries(),
): ProgressEntry[] {
  return [...entries].sort(
    (a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
}

export function getSortedOldestFirst(
  entries: ProgressEntry[] = getEntries(),
): ProgressEntry[] {
  return [...entries].sort(
    (a, b) =>
      new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  );
}

/** Local Sunday 00:00 of the current Sun–Sat week. */
export function startOfCurrentWeekSunday(now = new Date()): Date {
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  start.setDate(start.getDate() - start.getDay());
  return start;
}

export function hasEntrySinceLastSunday(
  entries: ProgressEntry[],
  now = new Date(),
): boolean {
  const start = startOfCurrentWeekSunday(now).getTime();
  return entries.some((entry) => {
    const time = new Date(entry.createdAt).getTime();
    return Number.isFinite(time) && time >= start;
  });
}

export function isCheckInDue(
  entries: ProgressEntry[],
  now = new Date(),
): boolean {
  return !hasEntrySinceLastSunday(entries, now);
}

export function daysUntilNextSunday(now = new Date()): number {
  const day = now.getDay();
  return day === 0 ? 7 : 7 - day;
}

export function formatEntryDate(iso: string): string {
  const date = new Date(iso);
  if (!Number.isFinite(date.getTime())) return iso;
  return date.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function formatKg(weightKg: number): string {
  return `${new Intl.NumberFormat(undefined, {
    maximumFractionDigits: 1,
    minimumFractionDigits: Number.isInteger(weightKg) ? 0 : 1,
  }).format(weightKg)} kg`;
}

export function formatDeltaKg(delta: number): string {
  const formatted = new Intl.NumberFormat(undefined, {
    maximumFractionDigits: 1,
    minimumFractionDigits: 1,
    signDisplay: "exceptZero",
  }).format(delta);
  return `${formatted} kg`;
}
