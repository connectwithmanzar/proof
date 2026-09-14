import { compressImage } from "@/lib/compress-image";
import {
  addEntry,
  getEntries,
  saveEntries,
  type ProgressEntry,
} from "@/lib/entries";
import { getPhoto, putPhoto, type PhotoKind } from "@/lib/photo-db";
import { createClient } from "@/lib/supabase/client";

const BUCKET = "reckoning-photos";
const CACHE_USER_KEY = "proof_cache_user";

export type ReckoningEntryRow = {
  id: string;
  user_id: string;
  created_at: string;
  weight_kg: number;
  note: string | null;
  has_front: boolean;
  has_side: boolean;
  updated_at: string;
};

function migratedKey(userId: string): string {
  return `proof_migrated_to_cloud:${userId}`;
}

export function photoObjectPath(
  userId: string,
  entryId: string,
  kind: PhotoKind,
): string {
  return `${userId}/${entryId}/${kind}.jpg`;
}

export function rowToEntry(row: ReckoningEntryRow): ProgressEntry {
  return {
    id: row.id,
    createdAt: row.created_at,
    weightKg: row.weight_kg,
    note: row.note ?? undefined,
    hasFront: true,
    hasSide: row.has_side,
  };
}

function entryToRow(userId: string, entry: ProgressEntry): ReckoningEntryRow {
  return {
    id: entry.id,
    user_id: userId,
    created_at: entry.createdAt,
    weight_kg: entry.weightKg,
    note: entry.note ?? null,
    has_front: true,
    has_side: entry.hasSide,
    updated_at: new Date().toISOString(),
  };
}

export async function requireUser() {
  const supabase = createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) {
    throw new Error("Sign in required");
  }
  return { supabase, user };
}

export async function fetchCloudEntries(): Promise<ProgressEntry[]> {
  const { supabase } = await requireUser();
  const { data, error } = await supabase
    .from("reckoning_entries")
    .select(
      "id, user_id, created_at, weight_kg, note, has_front, has_side, updated_at",
    )
    .order("created_at", { ascending: true });

  if (error) throw new Error(error.message);
  return (data as ReckoningEntryRow[] | null)?.map(rowToEntry) ?? [];
}

async function upsertCloudEntry(
  userId: string,
  entry: ProgressEntry,
): Promise<void> {
  const { supabase } = await requireUser();
  const { error } = await supabase
    .from("reckoning_entries")
    .upsert(entryToRow(userId, entry), { onConflict: "id" });
  if (error) throw new Error(error.message);
}

async function uploadPhoto(
  userId: string,
  entryId: string,
  kind: PhotoKind,
  blob: Blob,
): Promise<void> {
  const { supabase } = await requireUser();
  const path = photoObjectPath(userId, entryId, kind);
  const { error } = await supabase.storage.from(BUCKET).upload(path, blob, {
    contentType: "image/jpeg",
    upsert: true,
  });
  if (error) throw new Error(error.message);
}

async function downloadPhoto(
  userId: string,
  entryId: string,
  kind: PhotoKind,
): Promise<Blob | undefined> {
  const { supabase } = await requireUser();
  const path = photoObjectPath(userId, entryId, kind);
  const { data, error } = await supabase.storage.from(BUCKET).download(path);
  if (error || !data) return undefined;
  return data;
}

export async function getDisplayPhoto(
  entryId: string,
  kind: PhotoKind = "front",
): Promise<Blob | undefined> {
  const cached = await getPhoto(entryId, kind);
  if (cached) return cached;

  try {
    const { user } = await requireUser();
    const blob = await downloadPhoto(user.id, entryId, kind);
    if (blob) await putPhoto(entryId, kind, blob);
    return blob;
  } catch {
    return undefined;
  }
}

export async function saveCheckIn(input: {
  id: string;
  createdAt: string;
  weightKg: number;
  note?: string;
  front: Blob;
  side?: Blob | null;
}): Promise<ProgressEntry> {
  const front = await compressImage(input.front);
  const side = input.side ? await compressImage(input.side) : null;

  const entry: ProgressEntry = {
    id: input.id,
    createdAt: input.createdAt,
    weightKg: input.weightKg,
    note: input.note,
    hasFront: true,
    hasSide: Boolean(side),
  };

  await putPhoto(entry.id, "front", front);
  if (side) await putPhoto(entry.id, "side", side);

  const existing = getEntries();
  if (!existing.some((row) => row.id === entry.id)) {
    addEntry(entry);
  } else {
    saveEntries(existing.map((row) => (row.id === entry.id ? entry : row)));
  }

  const { user } = await requireUser();
  const uploads = [uploadPhoto(user.id, entry.id, "front", front)];
  if (side) uploads.push(uploadPhoto(user.id, entry.id, "side", side));
  await Promise.all(uploads);
  await upsertCloudEntry(user.id, entry);
  localStorage.setItem(CACHE_USER_KEY, user.id);

  return entry;
}

async function cachePhotosFromCloud(
  userId: string,
  entries: ProgressEntry[],
): Promise<void> {
  await Promise.all(
    entries.map(async (entry) => {
      const kinds: PhotoKind[] = entry.hasSide ? ["front", "side"] : ["front"];
      await Promise.all(
        kinds.map(async (kind) => {
          const existing = await getPhoto(entry.id, kind);
          if (existing) return;
          const blob = await downloadPhoto(userId, entry.id, kind);
          if (blob) await putPhoto(entry.id, kind, blob);
        }),
      );
    }),
  );
}

export async function syncAfterLogin(userId: string): Promise<ProgressEntry[]> {
  const cloud = await fetchCloudEntries();
  const cacheUser = localStorage.getItem(CACHE_USER_KEY);
  const local = getEntries();
  const localBelongsHere = !cacheUser || cacheUser === userId;

  if (localBelongsHere && local.length > 0) {
    const cloudIds = new Set(cloud.map((entry) => entry.id));
    for (const entry of local) {
      if (cloudIds.has(entry.id)) continue;
      const front = await getPhoto(entry.id, "front");
      if (!front) continue;
      const side = entry.hasSide ? await getPhoto(entry.id, "side") : undefined;
      await uploadPhoto(userId, entry.id, "front", front);
      if (side) await uploadPhoto(userId, entry.id, "side", side);
      await upsertCloudEntry(userId, entry);
    }
  }
  localStorage.setItem(migratedKey(userId), "1");

  const merged = await fetchCloudEntries();
  saveEntries(merged);
  localStorage.setItem(CACHE_USER_KEY, userId);
  await cachePhotosFromCloud(userId, merged);
  return merged;
}

export function clearWorkingCache(): void {
  saveEntries([]);
  localStorage.removeItem(CACHE_USER_KEY);
}

export function mapAuthError(message: string): string {
  const lower = message.toLowerCase();
  if (lower.includes("invalid login") || lower.includes("invalid credentials")) {
    return "Wrong email or password";
  }
  if (lower.includes("email not confirmed")) {
    return "Check your email to confirm";
  }
  if (lower.includes("already registered") || lower.includes("already exists")) {
    return "That email already has an account — sign in";
  }
  if (lower.includes("password")) {
    return "Use a password at least 6 characters long";
  }
  return message;
}
