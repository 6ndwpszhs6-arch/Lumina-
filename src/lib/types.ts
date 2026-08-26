// Core data models for Metabo — Diet & Metabolism

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

export type SubscriptionTier = "free" | "premium";

export interface Subscription {
  id: "subscription";
  tier: SubscriptionTier;
  // "preview" = unlocked via the in-app dev toggle, no real payment involved.
  // "revenuecat" is reserved for when real StoreKit billing is wired up.
  source: "preview" | "revenuecat";
  updatedAt: string;
}

// All fields optional because community food-database entries are often
// incomplete — render "—" for anything missing rather than guessing.
export interface NutrientProfile {
  calories?: number;
  proteinG?: number;
  fatG?: number;
  saturatedFatG?: number;
  carbsG?: number;
  sugarsG?: number;
  fiberG?: number;
  sodiumMg?: number;
  potassiumMg?: number;
  calciumMg?: number;
  ironMg?: number;
  cholesterolMg?: number;
  vitaminAMcg?: number;
  vitaminCMg?: number;
  vitaminDMcg?: number;
}

export interface ScannedFood {
  barcode: string;
  productName: string;
  brand?: string;
  imageUrl?: string;
  servingSize?: string;
  per100g: NutrientProfile;
  perServing?: NutrientProfile;
}

export type NutrientBasis = "100g" | "serving";

export interface FoodLogEntry {
  id: string;
  date: string; // YYYY-MM-DD
  barcode: string;
  productName: string;
  brand?: string;
  basis: NutrientBasis;
  servings: number;
  nutrients: NutrientProfile; // already scaled by `servings`
  createdAt: string;
}

export const NUTRIENT_FIELDS: { key: keyof NutrientProfile; label: string; unit: string; group: "macro" | "micro" }[] = [
  { key: "calories", label: "Calories", unit: "kcal", group: "macro" },
  { key: "proteinG", label: "Protein", unit: "g", group: "macro" },
  { key: "fatG", label: "Fat", unit: "g", group: "macro" },
  { key: "saturatedFatG", label: "Saturated fat", unit: "g", group: "macro" },
  { key: "carbsG", label: "Carbohydrates", unit: "g", group: "macro" },
  { key: "sugarsG", label: "Sugars", unit: "g", group: "macro" },
  { key: "fiberG", label: "Fiber", unit: "g", group: "macro" },
  { key: "sodiumMg", label: "Sodium", unit: "mg", group: "micro" },
  { key: "potassiumMg", label: "Potassium", unit: "mg", group: "micro" },
  { key: "calciumMg", label: "Calcium", unit: "mg", group: "micro" },
  { key: "ironMg", label: "Iron", unit: "mg", group: "micro" },
  { key: "cholesterolMg", label: "Cholesterol", unit: "mg", group: "micro" },
  { key: "vitaminAMcg", label: "Vitamin A", unit: "mcg", group: "micro" },
  { key: "vitaminCMg", label: "Vitamin C", unit: "mg", group: "micro" },
  { key: "vitaminDMcg", label: "Vitamin D", unit: "mcg", group: "micro" },
];
