import { supabase } from "./supabase";
import { db, saveProfile } from "./db";
import type {
  ActivityLevel,
  ChatMessage,
  FoodLogEntry,
  Goal,
  MetabolicCondition,
  NutrientProfile,
  Sex,
  TdeeLogEntry,
  UnitSystem,
  UserProfile,
} from "./types";

// Tracks the logged-in user (if any) so the write helpers below know
// whether to also push to Supabase. Set by page.tsx from onAuthChange.
let currentUserId: string | null = null;
export function setCurrentUserId(id: string | null): void {
  currentUserId = id;
}

// ---- Row <-> local type mapping ----

interface ProfileRow {
  user_id: string;
  name: string | null;
  sex: string | null;
  age: number | null;
  height_cm: number | null;
  weight_kg: number | null;
  activity_level: string | null;
  goal: string | null;
  units: string;
  conditions: string[];
  other_condition_note: string | null;
  created_at: string;
  updated_at: string;
}

function profileRowToLocal(row: ProfileRow): UserProfile {
  return {
    id: "profile",
    name: row.name ?? undefined,
    sex: (row.sex as Sex) ?? undefined,
    age: row.age ?? undefined,
    heightCm: row.height_cm ?? undefined,
    weightKg: row.weight_kg ?? undefined,
    activityLevel: (row.activity_level as ActivityLevel) ?? undefined,
    goal: (row.goal as Goal) ?? undefined,
    units: row.units as UnitSystem,
    conditions: (row.conditions ?? []) as MetabolicCondition[],
    otherConditionNote: row.other_condition_note ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function profileToRow(userId: string, p: UserProfile): Omit<ProfileRow, "created_at"> {
  return {
    user_id: userId,
    name: p.name ?? null,
    sex: p.sex ?? null,
    age: p.age ?? null,
    height_cm: p.heightCm ?? null,
    weight_kg: p.weightKg ?? null,
    activity_level: p.activityLevel ?? null,
    goal: p.goal ?? null,
    units: p.units,
    conditions: p.conditions,
    other_condition_note: p.otherConditionNote ?? null,
    updated_at: p.updatedAt,
  };
}

interface TdeeRow {
  id: string;
  date: string;
  weight_kg: number;
  goal: string;
  bmr: number;
  tdee: number;
  target_calories: number;
  protein_g: number;
  fat_g: number;
  carbs_g: number;
  created_at: string;
}

function tdeeRowToLocal(row: TdeeRow): TdeeLogEntry {
  return {
    id: row.id,
    date: row.date,
    weightKg: row.weight_kg,
    goal: row.goal as Goal,
    bmr: row.bmr,
    tdee: row.tdee,
    targetCalories: row.target_calories,
    proteinG: row.protein_g,
    fatG: row.fat_g,
    carbsG: row.carbs_g,
    createdAt: row.created_at,
  };
}

function tdeeToRow(userId: string, e: TdeeLogEntry): TdeeRow & { user_id: string } {
  return {
    id: e.id,
    user_id: userId,
    date: e.date,
    weight_kg: e.weightKg,
    goal: e.goal,
    bmr: e.bmr,
    tdee: e.tdee,
    target_calories: e.targetCalories,
    protein_g: e.proteinG,
    fat_g: e.fatG,
    carbs_g: e.carbsG,
    created_at: e.createdAt,
  };
}

interface FoodLogRow {
  id: string;
  date: string;
  barcode: string;
  product_name: string;
  brand: string | null;
  basis: string;
  servings: number;
  nutrients: NutrientProfile;
  created_at: string;
  deleted_at: string | null;
}

function foodLogRowToLocal(row: FoodLogRow): FoodLogEntry {
  return {
    id: row.id,
    date: row.date,
    barcode: row.barcode,
    productName: row.product_name,
    brand: row.brand ?? undefined,
    basis: row.basis as FoodLogEntry["basis"],
    servings: row.servings,
    nutrients: row.nutrients,
    createdAt: row.created_at,
  };
}

function foodLogToRow(userId: string, e: FoodLogEntry): FoodLogRow & { user_id: string } {
  return {
    id: e.id,
    user_id: userId,
    date: e.date,
    barcode: e.barcode,
    product_name: e.productName,
    brand: e.brand ?? null,
    basis: e.basis,
    servings: e.servings,
    nutrients: e.nutrients,
    created_at: e.createdAt,
    deleted_at: null,
  };
}

interface ChatRow {
  id: string;
  conversation_id: string;
  role: string;
  content: string;
  created_at: string;
}

function chatRowToLocal(row: ChatRow): ChatMessage {
  return {
    id: row.id,
    conversationId: row.conversation_id,
    role: row.role as ChatMessage["role"],
    content: row.content,
    createdAt: row.created_at,
  };
}

function chatToRow(userId: string, m: ChatMessage): ChatRow & { user_id: string } {
  return {
    id: m.id,
    user_id: userId,
    conversation_id: m.conversationId,
    role: m.role,
    content: m.content,
    created_at: m.createdAt,
  };
}

// ---- Pull + merge on login ----

async function mergeCollection<Local extends { id: string }, Row>(
  userId: string,
  tableName: string,
  localTable: { toArray: () => Promise<Local[]>; bulkPut: (items: Local[]) => Promise<unknown> },
  rowToLocal: (row: Row) => Local,
  localToRow: (userId: string, item: Local) => Row
): Promise<void> {
  if (!supabase) return;
  const [localItems, remoteRes] = await Promise.all([
    localTable.toArray(),
    supabase.from(tableName).select("*").eq("user_id", userId),
  ]);
  const remoteItems = ((remoteRes.data ?? []) as Row[]).map(rowToLocal);
  const remoteIds = new Set(remoteItems.map((r) => r.id));
  const localIds = new Set(localItems.map((l) => l.id));

  const toPullDown = remoteItems.filter((r) => !localIds.has(r.id));
  const toPushUp = localItems.filter((l) => !remoteIds.has(l.id));

  if (toPullDown.length) await localTable.bulkPut(toPullDown);
  if (toPushUp.length) {
    const rows = toPushUp.map((item) => localToRow(userId, item)) as Record<string, unknown>[];
    await supabase.from(tableName).upsert(rows);
  }
}

// Same shape as mergeCollection, but food_log rows are soft-deleted
// (deleted_at set instead of the row being removed) so a deletion made on
// one device — or before this device ever saw the row — propagates instead
// of the entry quietly reappearing on the next sync.
async function mergeFoodLog(userId: string): Promise<void> {
  if (!supabase) return;
  const [localItems, remoteRes] = await Promise.all([
    db.foodLog.toArray(),
    supabase.from("food_log").select("*").eq("user_id", userId),
  ]);
  const remoteRows = (remoteRes.data ?? []) as FoodLogRow[];
  const remoteById = new Map(remoteRows.map((r) => [r.id, r]));
  const localIds = new Set(localItems.map((l) => l.id));

  const toPullDown = remoteRows.filter((r) => !r.deleted_at && !localIds.has(r.id)).map(foodLogRowToLocal);
  const toDeleteLocally = localItems
    .filter((l) => remoteById.get(l.id)?.deleted_at)
    .map((l) => l.id);
  const toPushUp = localItems.filter((l) => !remoteById.has(l.id));

  if (toPullDown.length) await db.foodLog.bulkPut(toPullDown);
  if (toDeleteLocally.length) await db.foodLog.bulkDelete(toDeleteLocally);
  if (toPushUp.length) {
    const rows = toPushUp.map((item) => foodLogToRow(userId, item));
    await supabase.from("food_log").upsert(rows);
  }
}

// Runs once right after a successful sign-in. Merges local (on-device) data
// with whatever's already synced to the account: newest profile wins,
// history/log/chat entries are unioned by id in both directions so nothing
// on either side is silently discarded.
export async function syncAfterLogin(userId: string): Promise<void> {
  if (!supabase) return;

  const [localProfile, remoteProfileRes] = await Promise.all([
    db.profile.get("profile"),
    supabase.from("profiles").select("*").eq("user_id", userId).maybeSingle(),
  ]);
  const remoteProfile = remoteProfileRes.data ? profileRowToLocal(remoteProfileRes.data as ProfileRow) : undefined;

  if (remoteProfile && (!localProfile || remoteProfile.updatedAt > localProfile.updatedAt)) {
    await db.profile.put(remoteProfile);
  } else if (localProfile && (!remoteProfile || localProfile.updatedAt > remoteProfile.updatedAt)) {
    await supabase.from("profiles").upsert(profileToRow(userId, localProfile));
  }

  await Promise.all([
    mergeCollection(userId, "tdee_history", db.tdeeHistory, tdeeRowToLocal, tdeeToRow),
    mergeFoodLog(userId),
    mergeCollection(userId, "chat_messages", db.chatMessages, chatRowToLocal, chatToRow),
  ]);
}

// ---- Write-through helpers (local write + push if logged in) ----

export async function saveProfileSynced(partial: Partial<UserProfile>): Promise<UserProfile> {
  const next = await saveProfile(partial);
  if (supabase && currentUserId) {
    await supabase.from("profiles").upsert(profileToRow(currentUserId, next));
  }
  return next;
}

export async function addTdeeEntrySynced(entry: TdeeLogEntry): Promise<void> {
  await db.tdeeHistory.put(entry);
  if (supabase && currentUserId) {
    await supabase.from("tdee_history").upsert(tdeeToRow(currentUserId, entry));
  }
}

export async function addFoodLogEntrySynced(entry: FoodLogEntry): Promise<void> {
  await db.foodLog.add(entry);
  if (supabase && currentUserId) {
    await supabase.from("food_log").upsert(foodLogToRow(currentUserId, entry));
  }
}

export async function removeFoodLogEntrySynced(id: string): Promise<void> {
  await db.foodLog.delete(id);
  if (supabase && currentUserId) {
    // Soft-delete remotely (tombstone) instead of removing the row outright,
    // so the deletion propagates on the next sync instead of the union merge
    // pulling the "still there" remote copy back down onto another device.
    await supabase
      .from("food_log")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", id)
      .eq("user_id", currentUserId);
  }
}

export async function addChatMessageSynced(message: ChatMessage): Promise<void> {
  await db.chatMessages.put(message);
  if (supabase && currentUserId) {
    await supabase.from("chat_messages").upsert(chatToRow(currentUserId, message));
  }
}

// Deletes every synced row for this account — used by "Clear all local
// data" so wiping the device doesn't just get undone by the next sync.
export async function deleteAllSyncedData(userId: string): Promise<void> {
  if (!supabase) return;
  await Promise.all([
    supabase.from("profiles").delete().eq("user_id", userId),
    supabase.from("tdee_history").delete().eq("user_id", userId),
    supabase.from("food_log").delete().eq("user_id", userId),
    supabase.from("chat_messages").delete().eq("user_id", userId),
  ]);
}
