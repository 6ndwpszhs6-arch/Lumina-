import { findPackagedFoodByBarcode, packagedFoodToScannedFood } from "./packagedFoods";
import type { NutrientProfile, ScannedFood } from "./types";

export async function lookupBarcode(barcode: string): Promise<{ food?: ScannedFood; error?: string }> {
  const local = findPackagedFoodByBarcode(barcode);
  if (local) return { food: packagedFoodToScannedFood(local) };

  try {
    const res = await fetch(`/api/nutrition/${encodeURIComponent(barcode)}`);
    const data = await res.json();
    if (!res.ok) return { error: data.error ?? "Lookup failed." };
    return { food: data.food as ScannedFood };
  } catch {
    return { error: "Network error — check your connection and try again." };
  }
}

export async function searchFoodsByName(query: string): Promise<{ foods: ScannedFood[]; error?: string }> {
  try {
    const res = await fetch(`/api/nutrition/search?q=${encodeURIComponent(query)}`);
    const data = await res.json();
    if (!res.ok) return { foods: [], error: data.error ?? "Search failed." };
    return { foods: (data.foods as ScannedFood[]) ?? [] };
  } catch {
    return { foods: [], error: "Network error — check your connection and try again." };
  }
}

export function scaleNutrientProfile(profile: NutrientProfile, factor: number): NutrientProfile {
  const scaled: NutrientProfile = {};
  (Object.keys(profile) as (keyof NutrientProfile)[]).forEach((k) => {
    const v = profile[k];
    if (v !== undefined) scaled[k] = Math.round(v * factor * 10) / 10;
  });
  return scaled;
}

// Consecutive days logged, counting back from today. If nothing's been
// logged yet today, counts back from yesterday instead so the streak
// doesn't drop to zero the moment a new day starts.
export function computeLoggingStreak(loggedDates: string[]): number {
  const dates = new Set(loggedDates);
  const cursor = new Date();
  if (!dates.has(cursor.toISOString().slice(0, 10))) {
    cursor.setDate(cursor.getDate() - 1);
  }
  let streak = 0;
  while (dates.has(cursor.toISOString().slice(0, 10))) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}
