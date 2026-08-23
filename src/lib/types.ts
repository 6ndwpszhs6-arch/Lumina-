// Core data models for Lumina Life Organizer

export type Priority = "low" | "medium" | "high" | "urgent";
export type TaskStatus = "todo" | "in_progress" | "done" | "cancelled";
export type HabitFrequency = "daily" | "weekly" | "custom";
export type AreaOfLife =
  | "health"
  | "work"
  | "personal"
  | "finance"
  | "relationships"
  | "learning"
  | "home"
  | "other";

export interface Tag {
  id: string;
  name: string;
  color: string;
  createdAt: string;
}

export interface Project {
  id: string;
  name: string;
  description?: string;
  area?: AreaOfLife;
  color: string;
  archived: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Task {
  id: string;
  title: string;
  notes?: string;
  status: TaskStatus;
  priority: Priority;
  dueDate?: string; // ISO date
  dueTime?: string; // HH:mm
  projectId?: string;
  area?: AreaOfLife;
  tagIds: string[];
  recurring?: {
    frequency: "daily" | "weekly" | "monthly" | "yearly";
    interval: number;
    daysOfWeek?: number[]; // 0=Sun ... 6=Sat
    endDate?: string;
  };
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
  estimatedMinutes?: number;
  parentId?: string; // for subtasks
}

export interface Habit {
  id: string;
  title: string;
  description?: string;
  frequency: HabitFrequency;
  targetDays?: number[]; // for weekly
  targetPerWeek?: number;
  color: string;
  area?: AreaOfLife;
  tagIds: string[];
  archived: boolean;
  createdAt: string;
  updatedAt: string;
  // Streak tracking
  currentStreak: number;
  longestStreak: number;
  lastCompletedDate?: string;
}

export interface HabitLog {
  id: string;
  habitId: string;
  date: string; // YYYY-MM-DD
  completed: boolean;
  note?: string;
  createdAt: string;
}

export interface Note {
  id: string;
  title: string;
  content: string; // markdown
  projectId?: string;
  area?: AreaOfLife;
  tagIds: string[];
  pinned: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Goal {
  id: string;
  title: string;
  description?: string;
  targetValue?: number;
  currentValue: number;
  unit?: string;
  deadline?: string;
  area?: AreaOfLife;
  projectId?: string;
  tagIds: string[];
  status: "active" | "completed" | "abandoned";
  createdAt: string;
  updatedAt: string;
}

export interface Expense {
  id: string;
  amount: number;
  currency: string;
  description: string;
  category: string;
  date: string; // YYYY-MM-DD
  projectId?: string;
  area?: AreaOfLife;
  tagIds: string[];
  createdAt: string;
}

export interface Budget {
  id: string;
  name: string;
  category: string;
  limit: number;
  currency: string;
  period: "monthly" | "weekly" | "yearly";
  createdAt: string;
}

export interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  start: string; // ISO datetime
  end: string;
  allDay: boolean;
  taskId?: string;
  projectId?: string;
  area?: AreaOfLife;
  color?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AppSettings {
  id: string; // always "settings"
  theme: "dark" | "light" | "system";
  currency: string;
  weekStartsOn: 0 | 1; // 0=Sun, 1=Mon
  aiEnabled: boolean;
  syncEnabled: boolean;
  name?: string;
}
