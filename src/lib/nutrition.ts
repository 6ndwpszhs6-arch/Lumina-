import type { NutrientProfile, ScannedFood } from "./types";

export async function lookupBarcode(barcode: string): Promise<{ food?: ScannedFood; error?: string }> {
  try {
    const res = await fetch(`/api/nutrition/${encodeURIComponent(barcode)}`);
    const data = await res.json();
    if (!res.ok) return { error: data.error ?? "Lookup failed." };
    return { food: data.food as ScannedFood };
  } catch {
    return { error: "Network error — check your connection and try again." };
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
