export type FeedbackPayload = {
  body: string;
  cached: boolean;
  baseline: boolean;
  nowEntryId: string;
  thenEntryId: string | null;
  prevEntryId: string | null;
  period?: string | null;
};

export const FEEDBACK_FALLBACK =
  "Couldn't read this week — check-in still saved. Try Compare later.";

const inflight = new Map<string, Promise<FeedbackPayload>>();

function asPayload(value: unknown, nowEntryId: string): FeedbackPayload | null {
  if (!value || typeof value !== "object") return null;
  const row = value as Record<string, unknown>;
  if (typeof row.body !== "string" || !row.body.trim()) return null;
  return {
    body: row.body.trim(),
    cached: Boolean(row.cached),
    baseline: Boolean(row.baseline),
    nowEntryId:
      typeof row.nowEntryId === "string" ? row.nowEntryId : nowEntryId,
    thenEntryId: typeof row.thenEntryId === "string" ? row.thenEntryId : null,
    prevEntryId: typeof row.prevEntryId === "string" ? row.prevEntryId : null,
    period: typeof row.period === "string" ? row.period : null,
  };
}

async function postFeedback(
  nowEntryId: string,
  regenerate: boolean,
): Promise<FeedbackPayload> {
  const response = await fetch("/api/reckoning/feedback", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ nowEntryId, regenerate }),
  });
  const json: unknown = await response.json().catch(() => null);
  const payload = asPayload(json, nowEntryId);
  if (payload) return payload;
  return {
    body: FEEDBACK_FALLBACK,
    cached: false,
    baseline: false,
    nowEntryId,
    thenEntryId: null,
    prevEntryId: null,
    period: null,
  };
}

export function requestFeedback(
  nowEntryId: string,
  options?: { regenerate?: boolean },
): Promise<FeedbackPayload> {
  const regenerate = Boolean(options?.regenerate);
  if (regenerate) inflight.delete(nowEntryId);
  const existing = inflight.get(nowEntryId);
  if (existing) return existing;
  const promise = postFeedback(nowEntryId, regenerate).finally(() => {
    inflight.delete(nowEntryId);
  });
  inflight.set(nowEntryId, promise);
  return promise;
}

export async function readCachedFeedback(
  nowEntryId: string,
): Promise<FeedbackPayload | null> {
  const response = await fetch(
    `/api/reckoning/feedback?now=${encodeURIComponent(nowEntryId)}`,
  );
  if (!response.ok) return null;
  const json: unknown = await response.json().catch(() => null);
  return asPayload(json, nowEntryId);
}
