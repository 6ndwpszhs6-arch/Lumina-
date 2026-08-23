import Dexie, { type Table } from "dexie";
import type {
  Task,
  Habit,
  HabitLog,
  Note,
  Goal,
  Expense,
  Budget,
  CalendarEvent,
  Tag,
  Project,
  AppSettings,
} from "./types";

export class LuminaDB extends Dexie {
  tasks!: Table<Task, string>;
  habits!: Table<Habit, string>;
  habitLogs!: Table<HabitLog, string>;
  notes!: Table<Note, string>;
  goals!: Table<Goal, string>;
  expenses!: Table<Expense, string>;
  budgets!: Table<Budget, string>;
  events!: Table<CalendarEvent, string>;
  tags!: Table<Tag, string>;
  projects!: Table<Project, string>;
  settings!: Table<AppSettings, string>;

  constructor() {
    super("LuminaDB");
    this.version(1).stores({
      tasks: "id, status, dueDate, projectId, area, priority, createdAt, updatedAt",
      habits: "id, archived, area, createdAt",
      habitLogs: "id, habitId, date, [habitId+date]",
      notes: "id, projectId, area, pinned, updatedAt",
      goals: "id, status, area, deadline",
      expenses: "id, date, category, area",
      budgets: "id, category, period",
      events: "id, start, end, taskId, projectId",
      tags: "id, name",
      projects: "id, area, archived",
      settings: "id",
    });
  }
}

export const db = new LuminaDB();

// Helper to generate IDs
export function generateId(): string {
  return crypto.randomUUID();
}

// Initialize default settings if none exist
export async function ensureSettings(): Promise<AppSettings> {
  const existing = await db.settings.get("settings");
  if (existing) return existing;

  const defaults: AppSettings = {
    id: "settings",
    theme: "dark",
    currency: "USD",
    weekStartsOn: 1,
    aiEnabled: true,
    syncEnabled: false,
    name: "You",
  };
  await db.settings.put(defaults);
  return defaults;
}

// Seed some demo data for first run (optional)
export async function seedDemoDataIfEmpty() {
  const taskCount = await db.tasks.count();
  if (taskCount > 0) return;

  const now = new Date().toISOString();
  const today = now.slice(0, 10);

  // Default tags
  const tags: Tag[] = [
    { id: generateId(), name: "urgent", color: "#ef4444", createdAt: now },
    { id: generateId(), name: "focus", color: "#3b82f6", createdAt: now },
    { id: generateId(), name: "quick", color: "#22c55e", createdAt: now },
  ];
  await db.tags.bulkAdd(tags);

  // Sample project
  const projectId = generateId();
  await db.projects.add({
    id: projectId,
    name: "Personal Growth",
    description: "Self-improvement & learning",
    area: "learning",
    color: "#8b5cf6",
    archived: false,
    createdAt: now,
    updatedAt: now,
  });

  // Sample tasks
  await db.tasks.bulkAdd([
    {
      id: generateId(),
      title: "Welcome to Lumina ✨",
      notes: "This is your offline-first life organizer. Everything works without internet.",
      status: "todo",
      priority: "medium",
      tagIds: [tags[1].id],
      createdAt: now,
      updatedAt: now,
    },
    {
      id: generateId(),
      title: "Plan your week",
      status: "todo",
      priority: "high",
      dueDate: today,
      projectId,
      tagIds: [],
      createdAt: now,
      updatedAt: now,
    },
  ]);

  // Sample habit
  const habitId = generateId();
  await db.habits.add({
    id: habitId,
    title: "Morning stretch",
    description: "5–10 min mobility",
    frequency: "daily",
    color: "#10b981",
    area: "health",
    tagIds: [],
    archived: false,
    currentStreak: 0,
    longestStreak: 0,
    createdAt: now,
    updatedAt: now,
  });

  // Sample note
  await db.notes.add({
    id: generateId(),
    title: "Quick capture",
    content: "# Ideas\n\n- Build better systems\n- Review weekly\n\n*This note supports Markdown.*",
    pinned: true,
    tagIds: [],
    createdAt: now,
    updatedAt: now,
  });

  // Sample goal
  await db.goals.add({
    id: generateId(),
    title: "Read 12 books this year",
    description: "One per month average",
    targetValue: 12,
    currentValue: 0,
    unit: "books",
    area: "learning",
    status: "active",
    tagIds: [],
    createdAt: now,
    updatedAt: now,
  });

  await ensureSettings();
}
