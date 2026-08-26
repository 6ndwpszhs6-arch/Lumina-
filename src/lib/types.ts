// Core data models for Lumina — Diet & Metabolism

export type Sex = "male" | "female";
export type UnitSystem = "metric" | "imperial";
export type ActivityLevel =
  | "sedentary"
  | "light"
  | "moderate"
  | "active"
  | "very_active";
export type Goal = "lose" | "maintain" | "gain";

export type MetabolicCondition =
  | "diabetes_type1"
  | "diabetes_type2"
  | "pku"
  | "thyroid"
  | "metabolic_syndrome"
  | "other";

export const ACTIVITY_LEVELS: { value: ActivityLevel; label: string; multiplier: number }[] = [
  { value: "sedentary", label: "Sedentary (little to no exercise)", multiplier: 1.2 },
  { value: "light", label: "Light (exercise 1–3 days/week)", multiplier: 1.375 },
  { value: "moderate", label: "Moderate (exercise 3–5 days/week)", multiplier: 1.55 },
  { value: "active", label: "Active (exercise 6–7 days/week)", multiplier: 1.725 },
  { value: "very_active", label: "Very active (hard exercise + physical job)", multiplier: 1.9 },
];

export const METABOLIC_CONDITIONS: { value: MetabolicCondition; label: string }[] = [
  { value: "diabetes_type1", label: "Type 1 diabetes" },
  { value: "diabetes_type2", label: "Type 2 diabetes" },
  { value: "pku", label: "PKU (Phenylketonuria)" },
  { value: "thyroid", label: "Thyroid condition" },
  { value: "metabolic_syndrome", label: "Metabolic syndrome" },
  { value: "other", label: "Other" },
];

export interface UserProfile {
  id: "profile";
  sex?: Sex;
  age?: number;
  heightCm?: number;
  weightKg?: number;
  activityLevel?: ActivityLevel;
  goal?: Goal;
  units: UnitSystem;
  conditions: MetabolicCondition[];
  otherConditionNote?: string;
  name?: string;
  createdAt: string;
  updatedAt: string;
}

export interface TdeeLogEntry {
  id: string;
  date: string; // YYYY-MM-DD
  weightKg: number;
  bmr: number;
  tdee: number;
  targetCalories: number;
  proteinG: number;
  fatG: number;
  carbsG: number;
  goal: Goal;
  createdAt: string;
}

export type ChatRole = "user" | "assistant";

export interface ChatMessage {
  id: string;
  conversationId: string;
  role: ChatRole;
  content: string;
  createdAt: string;
}

export type ForumCategory =
  | "diabetes"
  | "pku"
  | "metabolism"
  | "nutrition_research"
  | "general_news";

export const FORUM_CATEGORIES: { value: ForumCategory; label: string }[] = [
  { value: "general_news", label: "General News" },
  { value: "nutrition_research", label: "Nutrition Research" },
  { value: "metabolism", label: "Metabolism" },
  { value: "diabetes", label: "Diabetes" },
  { value: "pku", label: "PKU" },
];

export interface ForumPost {
  id: string;
  title: string;
  summary: string;
  content: string; // markdown
  category: ForumCategory;
  sourceName: string;
  sourceUrl: string;
  published: boolean;
  publishedAt: string; // ISO
  createdAt: string;
  updatedAt: string;
}

export interface AppSettings {
  id: "settings";
  onboarded: boolean;
}
