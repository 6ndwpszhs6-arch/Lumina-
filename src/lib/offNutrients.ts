import "server-only";
import type { NutrientProfile } from "./types";

export type OffNutriments = Record<string, unknown>;

function num(n: OffNutriments, key: string): number | undefined {
  const v = n[key];
  return typeof v === "number" && Number.isFinite(v) ? v : undefined;
}
function grams(n: OffNutriments, key: string): number | undefined {
  const v = num(n, key);
  return v === undefined ? undefined : Math.round(v * 10) / 10;
}
function gramsToMg(n: OffNutriments, key: string): number | undefined {
  const v = num(n, key);
  return v === undefined ? undefined : Math.round(v * 1000 * 10) / 10;
}
function gramsToMcg(n: OffNutriments, key: string): number | undefined {
  const v = num(n, key);
  return v === undefined ? undefined : Math.round(v * 1_000_000);
}

export function buildOffNutrientProfile(n: OffNutriments, suffix: "_100g" | "_serving"): NutrientProfile {
  return {
    calories: num(n, "energy-kcal" + suffix),
    proteinG: grams(n, "proteins" + suffix),
    fatG: grams(n, "fat" + suffix),
    saturatedFatG: grams(n, "saturated-fat" + suffix),
    carbsG: grams(n, "carbohydrates" + suffix),
    sugarsG: grams(n, "sugars" + suffix),
    fiberG: grams(n, "fiber" + suffix),
    sodiumMg: gramsToMg(n, "sodium" + suffix),
    potassiumMg: gramsToMg(n, "potassium" + suffix),
    calciumMg: gramsToMg(n, "calcium" + suffix),
    ironMg: gramsToMg(n, "iron" + suffix),
    cholesterolMg: gramsToMg(n, "cholesterol" + suffix),
    vitaminAMcg: gramsToMcg(n, "vitamin-a" + suffix),
    vitaminCMg: gramsToMg(n, "vitamin-c" + suffix),
    vitaminDMcg: gramsToMcg(n, "vitamin-d" + suffix),
  };
}
