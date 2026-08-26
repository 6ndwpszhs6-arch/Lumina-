import { ACTIVITY_LEVELS } from "./types";
import type { ActivityLevel, Goal, Sex } from "./types";

export interface TdeeInput {
  sex: Sex;
  age: number;
  heightCm: number;
  weightKg: number;
  activityLevel: ActivityLevel;
  goal: Goal;
}

export interface TdeeOutput {
  bmr: number;
  tdee: number;
  targetCalories: number;
  proteinG: number;
  fatG: number;
  carbsG: number;
}

// Mifflin-St Jeor equation
export function calculateBMR({ sex, age, heightCm, weightKg }: Pick<TdeeInput, "sex" | "age" | "heightCm" | "weightKg">): number {
  const base = 10 * weightKg + 6.25 * heightCm - 5 * age;
  return Math.round(sex === "male" ? base + 5 : base - 161);
}

export function activityMultiplier(level: ActivityLevel): number {
  return ACTIVITY_LEVELS.find((a) => a.value === level)?.multiplier ?? 1.2;
}

const GOAL_ADJUSTMENT: Record<Goal, number> = {
  lose: -0.2,
  maintain: 0,
  gain: 0.12,
};

// Higher protein when cutting to preserve lean mass; balanced split otherwise.
const MACRO_SPLIT: Record<Goal, { protein: number; fat: number; carbs: number }> = {
  lose: { protein: 0.35, fat: 0.3, carbs: 0.35 },
  maintain: { protein: 0.3, fat: 0.3, carbs: 0.4 },
  gain: { protein: 0.3, fat: 0.25, carbs: 0.45 },
};

export function calculateTdee(input: TdeeInput): TdeeOutput {
  const bmr = calculateBMR(input);
  const tdee = Math.round(bmr * activityMultiplier(input.activityLevel));
  const targetCalories = Math.round(tdee * (1 + GOAL_ADJUSTMENT[input.goal]));

  const split = MACRO_SPLIT[input.goal];
  const proteinG = Math.round((targetCalories * split.protein) / 4);
  const fatG = Math.round((targetCalories * split.fat) / 9);
  const carbsG = Math.round((targetCalories * split.carbs) / 4);

  return { bmr, tdee, targetCalories, proteinG, fatG, carbsG };
}

export function lbToKg(lb: number): number {
  return lb * 0.453592;
}
export function kgToLb(kg: number): number {
  return kg / 0.453592;
}
export function ftInToCm(ft: number, inches: number): number {
  return (ft * 12 + inches) * 2.54;
}
export function cmToFtIn(cm: number): { ft: number; inches: number } {
  const totalInches = cm / 2.54;
  const ft = Math.floor(totalInches / 12);
  const inches = Math.round(totalInches - ft * 12);
  return { ft, inches };
}
