import { isCheckInDue, type ProgressEntry } from "./entries";

const OPTED_KEY = "proof_reminders_opted";
const NOTIFIED_KEY = "proof_notified_date";

export function isSunday(now = new Date()): boolean {
  return now.getDay() === 0;
}

export function localDateKey(now = new Date()): string {
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function notificationPermission():
  | NotificationPermission
  | "unsupported" {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return "unsupported";
  }
  return Notification.permission;
}

export function hasOptedIntoReminders(): boolean {
  if (typeof window === "undefined") return false;
  return (
    localStorage.getItem(OPTED_KEY) === "1" ||
    notificationPermission() === "granted"
  );
}

export async function requestSundayReminders(): Promise<
  NotificationPermission | "unsupported"
> {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return "unsupported";
  }
  const permission = await Notification.requestPermission();
  if (permission === "granted") {
    localStorage.setItem(OPTED_KEY, "1");
  }
  return permission;
}

export function maybeNotifySundayCheckIn(
  entries: ProgressEntry[],
  now = new Date(),
): boolean {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return false;
  }
  if (Notification.permission !== "granted") return false;
  if (!isSunday(now)) return false;
  if (!isCheckInDue(entries, now)) return false;

  const today = localDateKey(now);
  if (localStorage.getItem(NOTIFIED_KEY) === today) return false;

  try {
    new Notification("Proof — time for your weekly check-in");
    localStorage.setItem(NOTIFIED_KEY, today);
    return true;
  } catch {
    return false;
  }
}
