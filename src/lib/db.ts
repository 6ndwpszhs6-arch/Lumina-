import Dexie, { type Table } from "dexie";
import type {
  UserProfile,
  TdeeLogEntry,
  ChatMessage,
  ForumPost,
  AppSettings,
} from "./types";

export class LuminaDB extends Dexie {
  profile!: Table<UserProfile, string>;
  tdeeHistory!: Table<TdeeLogEntry, string>;
  chatMessages!: Table<ChatMessage, string>;
  forumCache!: Table<ForumPost, string>;
  settings!: Table<AppSettings, string>;

  constructor() {
    super("LuminaMetabolismDB");
    this.version(1).stores({
      profile: "id",
      tdeeHistory: "id, date, createdAt",
      chatMessages: "id, conversationId, createdAt",
      forumCache: "id, category, publishedAt",
      settings: "id",
    });
  }
}

export const db = new LuminaDB();

export function generateId(): string {
  return crypto.randomUUID();
}

export async function ensureSettings(): Promise<AppSettings> {
  const existing = await db.settings.get("settings");
  if (existing) return existing;
  const defaults: AppSettings = { id: "settings", onboarded: false };
  await db.settings.put(defaults);
  return defaults;
}

export async function getProfile(): Promise<UserProfile | undefined> {
  return db.profile.get("profile");
}

export async function saveProfile(
  partial: Partial<UserProfile>
): Promise<UserProfile> {
  const now = new Date().toISOString();
  const existing = await db.profile.get("profile");
  const next: UserProfile = {
    id: "profile",
    units: "metric",
    conditions: [],
    ...existing,
    ...partial,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };
  await db.profile.put(next);
  return next;
}
