import { NextResponse } from "next/server";
import {
  formatComparePeriod,
  isTooSoonToCall,
  spanDays,
} from "@/lib/compare-period";
import { FEEDBACK_FALLBACK, type FeedbackPayload } from "@/lib/feedback";
import {
  baselineFeedbackBody,
  buildFeedbackSystemPrompt,
  buildFeedbackUserPrompt,
  honestNoChangeBody,
  honestTooSoonBody,
  shouldReplaceShortSpanOvercall,
} from "@/lib/server/feedback-prompt";
import {
  blobToInlineJpeg,
  generateGeminiText,
  getGeminiApiKey,
  getGeminiModel,
  jpegPartAndHash,
  type GeminiImagePart,
} from "@/lib/server/gemini";
import { rowToProfile, type ReckoningProfile } from "@/lib/profile-model";
import { createClient } from "@/lib/supabase/server";

function photoPath(userId: string, entryId: string, kind: "front" | "side") {
  return `${userId}/${entryId}/${kind}.jpg`;
}

export const runtime = "nodejs";
export const maxDuration = 30;

type EntryRow = {
  id: string;
  created_at: string;
  weight_kg: number;
  has_side: boolean;
};

type FeedbackRow = {
  body: string;
  then_entry_id: string | null;
  prev_entry_id: string | null;
};

function json(payload: FeedbackPayload, status = 200) {
  return NextResponse.json(payload, { status });
}

function periodFor(then: EntryRow | null, now: EntryRow): string | null {
  if (!then || then.id === now.id) return null;
  return formatComparePeriod(then.created_at, now.created_at);
}

function fallbackPayload(
  nowEntryId: string,
  extra?: Partial<FeedbackPayload>,
): FeedbackPayload {
  return {
    body: FEEDBACK_FALLBACK,
    cached: false,
    baseline: false,
    nowEntryId,
    thenEntryId: extra?.thenEntryId ?? null,
    prevEntryId: extra?.prevEntryId ?? null,
    period: extra?.period ?? null,
  };
}

async function requireUser() {
  const supabase = createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) return { supabase, user: null };
  return { supabase, user };
}

async function loadProfile(
  supabase: ReturnType<typeof createClient>,
  userId: string,
): Promise<ReckoningProfile | null> {
  const { data, error } = await supabase
    .from("reckoning_profiles")
    .select(
      "user_id, display_name, date_of_birth, gender, height_cm, current_weight_kg, target_weight_kg, goal, focus_areas, activity, onboarding_completed_at, updated_at",
    )
    .eq("user_id", userId)
    .maybeSingle();
  if (error || !data) return null;
  return rowToProfile(data as Record<string, unknown>);
}

async function loadEntries(
  supabase: ReturnType<typeof createClient>,
  userId: string,
): Promise<EntryRow[]> {
  const { data, error } = await supabase
    .from("reckoning_entries")
    .select("id, created_at, weight_kg, has_side")
    .eq("user_id", userId)
    .order("created_at", { ascending: true });
  if (error || !data) return [];
  return data as EntryRow[];
}

async function loadCached(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  nowEntryId: string,
): Promise<FeedbackRow | null> {
  const { data, error } = await supabase
    .from("reckoning_feedback")
    .select("body, then_entry_id, prev_entry_id")
    .eq("user_id", userId)
    .eq("now_entry_id", nowEntryId)
    .maybeSingle();
  if (error || !data) return null;
  return data as FeedbackRow;
}

async function saveFeedback(
  supabase: ReturnType<typeof createClient>,
  row: {
    user_id: string;
    now_entry_id: string;
    then_entry_id: string | null;
    prev_entry_id: string | null;
    body: string;
    model: string | null;
  },
): Promise<void> {
  await supabase.from("reckoning_feedback").upsert(row, {
    onConflict: "user_id,now_entry_id",
  });
}

async function downloadPhotoBlob(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  entryId: string,
  kind: "front" | "side",
): Promise<Blob | null> {
  const path = photoPath(userId, entryId, kind);
  const { data, error } = await supabase.storage
    .from("reckoning-photos")
    .download(path);
  if (error || !data) return null;
  return data;
}

function resolveEntries(entries: EntryRow[], nowEntryId: string) {
  const nowIndex = entries.findIndex((entry) => entry.id === nowEntryId);
  if (nowIndex < 0) return null;
  const now = entries[nowIndex];
  const then = entries[0];
  const prev = nowIndex > 0 ? entries[nowIndex - 1] : null;
  return { now, then, prev };
}

export async function GET(request: Request) {
  const { supabase, user } = await requireUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  }
  const nowEntryId = new URL(request.url).searchParams.get("now")?.trim() ?? "";
  if (!nowEntryId) {
    return NextResponse.json({ error: "now is required" }, { status: 400 });
  }

  const cached = await loadCached(supabase, user.id, nowEntryId);
  if (!cached) {
    return new NextResponse(null, { status: 204 });
  }
  const entries = await loadEntries(supabase, user.id);
  const resolved = resolveEntries(entries, nowEntryId);
  return json({
    body: cached.body,
    cached: true,
    baseline: false,
    nowEntryId,
    thenEntryId: cached.then_entry_id,
    prevEntryId: cached.prev_entry_id,
    period: resolved ? periodFor(resolved.then, resolved.now) : null,
  });
}

export async function POST(request: Request) {
  const { supabase, user } = await requireUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  }

  let nowEntryId = "";
  let regenerate = false;
  try {
    const body = (await request.json()) as {
      nowEntryId?: unknown;
      regenerate?: unknown;
    };
    nowEntryId = typeof body.nowEntryId === "string" ? body.nowEntryId.trim() : "";
    regenerate = body.regenerate === true;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (!nowEntryId) {
    return NextResponse.json({ error: "nowEntryId is required" }, { status: 400 });
  }

  const profile = await loadProfile(supabase, user.id);
  if (!profile) {
    return NextResponse.json(
      { error: "Finish onboarding first" },
      { status: 403 },
    );
  }

  const entries = await loadEntries(supabase, user.id);
  const resolved = resolveEntries(entries, nowEntryId);
  if (!resolved) {
    return NextResponse.json({ error: "Check-in not found" }, { status: 404 });
  }
  const { now, then, prev } = resolved;
  const period = periodFor(then, now);

  if (regenerate) {
    await supabase
      .from("reckoning_feedback")
      .delete()
      .eq("user_id", user.id)
      .eq("now_entry_id", nowEntryId);
  }

  const cached = await loadCached(supabase, user.id, nowEntryId);
  if (cached) {
    return json({
      body: cached.body,
      cached: true,
      baseline: then.id === now.id,
      nowEntryId,
      thenEntryId: cached.then_entry_id,
      prevEntryId: cached.prev_entry_id,
      period,
    });
  }

  if (then.id === now.id || entries.length < 2) {
    const body = baselineFeedbackBody(profile);
    await saveFeedback(supabase, {
      user_id: user.id,
      now_entry_id: now.id,
      then_entry_id: null,
      prev_entry_id: null,
      body,
      model: "baseline",
    });
    return json({
      body,
      cached: false,
      baseline: true,
      nowEntryId: now.id,
      thenEntryId: null,
      prevEntryId: null,
      period: null,
    });
  }

  const ids = {
    thenEntryId: then.id,
    prevEntryId: prev && prev.id !== then.id ? prev.id : null,
    period,
  };

  if (isTooSoonToCall(then.created_at, now.created_at)) {
    const body = honestTooSoonBody(profile, period ?? "same day");
    await saveFeedback(supabase, {
      user_id: user.id,
      now_entry_id: now.id,
      then_entry_id: then.id,
      prev_entry_id: ids.prevEntryId,
      body,
      model: "honest-too-soon",
    });
    return json({
      body,
      cached: false,
      baseline: false,
      nowEntryId: now.id,
      thenEntryId: then.id,
      prevEntryId: ids.prevEntryId,
      period,
    });
  }

  if (!getGeminiApiKey()) {
    return json(fallbackPayload(now.id, ids));
  }

  try {
    const stillCached = await loadCached(supabase, user.id, nowEntryId);
    if (stillCached) {
      return json({
        body: stillCached.body,
        cached: true,
        baseline: false,
        nowEntryId,
        thenEntryId: stillCached.then_entry_id,
        prevEntryId: stillCached.prev_entry_id,
        period,
      });
    }

    const [thenBlob, nowBlob] = await Promise.all([
      downloadPhotoBlob(supabase, user.id, then.id, "front"),
      downloadPhotoBlob(supabase, user.id, now.id, "front"),
    ]);
    if (!thenBlob || !nowBlob) {
      return json(fallbackPayload(now.id, ids));
    }

    const [thenPacked, nowPacked] = await Promise.all([
      jpegPartAndHash(thenBlob),
      jpegPartAndHash(nowBlob),
    ]);
    if (!thenPacked || !nowPacked) {
      return json(fallbackPayload(now.id, ids));
    }
    const thenFront = thenPacked.part;
    const nowFront = nowPacked.part;

    if (thenPacked.hash === nowPacked.hash) {
      const body = honestNoChangeBody(
        profile,
        period ?? formatComparePeriod(then.created_at, now.created_at),
        now.weight_kg,
      );
      await saveFeedback(supabase, {
        user_id: user.id,
        now_entry_id: now.id,
        then_entry_id: then.id,
        prev_entry_id: ids.prevEntryId,
        body,
        model: "honest-no-change",
      });
      return json({
        body,
        cached: false,
        baseline: false,
        nowEntryId: now.id,
        thenEntryId: then.id,
        prevEntryId: ids.prevEntryId,
        period,
      });
    }

    const images: GeminiImagePart[] = [thenFront, nowFront];
    const bothSides = then.has_side && now.has_side;
    if (bothSides) {
      const [thenSide, nowSide] = await Promise.all([
        downloadPhotoBlob(supabase, user.id, then.id, "side").then((blob) =>
          blob ? blobToInlineJpeg(blob) : null,
        ),
        downloadPhotoBlob(supabase, user.id, now.id, "side").then((blob) =>
          blob ? blobToInlineJpeg(blob) : null,
        ),
      ]);
      if (thenSide && nowSide) images.push(thenSide, nowSide);
    }

    let text = await generateGeminiText({
      system: buildFeedbackSystemPrompt(profile),
      userText: buildFeedbackUserPrompt({
        profile,
        now: {
          id: now.id,
          createdAt: now.created_at,
          weightKg: now.weight_kg,
        },
        then: {
          id: then.id,
          createdAt: then.created_at,
          weightKg: then.weight_kg,
        },
        prev:
          ids.prevEntryId && prev
            ? {
                id: prev.id,
                createdAt: prev.created_at,
                weightKg: prev.weight_kg,
              }
            : null,
        hasSides: images.length > 2,
      }),
      images,
    });

    const days = spanDays(then.created_at, now.created_at);
    if (shouldReplaceShortSpanOvercall(text, days)) {
      text = honestTooSoonBody(profile, period ?? `${days} days`);
    }

    await saveFeedback(supabase, {
      user_id: user.id,
      now_entry_id: now.id,
      then_entry_id: then.id,
      prev_entry_id: ids.prevEntryId,
      body: text,
      model: getGeminiModel(),
    });

    return json({
      body: text,
      cached: false,
      baseline: false,
      nowEntryId: now.id,
      thenEntryId: then.id,
      prevEntryId: ids.prevEntryId,
      period,
    });
  } catch {
    return json(fallbackPayload(now.id, ids));
  }
}
