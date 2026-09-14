export function spanMs(thenIso: string, nowIso: string): number {
  const then = new Date(thenIso).getTime();
  const now = new Date(nowIso).getTime();
  if (!Number.isFinite(then) || !Number.isFinite(now) || now < then) return 0;
  return now - then;
}

export function spanDays(thenIso: string, nowIso: string): number {
  return Math.floor(spanMs(thenIso, nowIso) / (24 * 60 * 60 * 1000));
}

/** Human label for the journey gap — never round a same-day gap up to "1 week". */
export function formatComparePeriod(thenIso: string, nowIso: string): string {
  const ms = spanMs(thenIso, nowIso);
  const hours = Math.floor(ms / (60 * 60 * 1000));
  const days = Math.floor(ms / (24 * 60 * 60 * 1000));
  if (ms < 60 * 60 * 1000) return "same day (under an hour)";
  if (hours < 36) return "same day";
  if (days < 7) return days === 1 ? "1 day" : `${days} days`;
  if (days < 14) return "1 week";
  if (days < 60) {
    const weeks = Math.round(days / 7);
    return weeks === 1 ? "1 week" : `${weeks} weeks`;
  }
  if (days < 365) {
    const months = Math.max(1, Math.round(days / 30.44));
    return months === 1 ? "about 1 month" : `about ${months} months`;
  }
  const years = Math.max(1, Math.round(days / 365.25));
  const remMonths = Math.round((days - years * 365.25) / 30.44);
  if (years === 1 && remMonths >= 2) return `about 1 year ${remMonths} months`;
  return years === 1 ? "about 1 year" : `about ${years} years`;
}

export function sameCalendarDay(thenIso: string, nowIso: string): boolean {
  const then = new Date(thenIso);
  const now = new Date(nowIso);
  if (!Number.isFinite(then.getTime()) || !Number.isFinite(now.getTime())) {
    return false;
  }
  const utcSame =
    then.getUTCFullYear() === now.getUTCFullYear() &&
    then.getUTCMonth() === now.getUTCMonth() &&
    then.getUTCDate() === now.getUTCDate();
  const localSame =
    then.getFullYear() === now.getFullYear() &&
    then.getMonth() === now.getMonth() &&
    then.getDate() === now.getDate();
  return utcSame || localSame;
}

export function isTooSoonToCall(thenIso: string, nowIso: string): boolean {
  return (
    spanMs(thenIso, nowIso) < 36 * 60 * 60 * 1000 ||
    sameCalendarDay(thenIso, nowIso)
  );
}
