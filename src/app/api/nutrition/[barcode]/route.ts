import "server-only";
import { NextResponse } from "next/server";
import type { NutrientProfile, ScannedFood } from "@/lib/types";

export const runtime = "nodejs";

// Open Food Facts is a free, keyless, community-maintained food database.
// Coverage and unit consistency vary by product — this is a best-effort
// normalization, not a certified nutrition source.
const OFF_BASE = "https://world.openfoodfacts.org/api/v2/product";

type Nutriments = Record<string, unknown>;

function num(n: Nutriments, key: string): number | undefined {
  const v = n[key];
  return typeof v === "number" && Number.isFinite(v) ? v : undefined;
}
function grams(n: Nutriments, key: string): number | undefined {
  const v = num(n, key);
  return v === undefined ? undefined : Math.round(v * 10) / 10;
}
function gramsToMg(n: Nutriments, key: string): number | undefined {
  const v = num(n, key);
  return v === undefined ? undefined : Math.round(v * 1000 * 10) / 10;
}
function gramsToMcg(n: Nutriments, key: string): number | undefined {
  const v = num(n, key);
  return v === undefined ? undefined : Math.round(v * 1_000_000);
}

function buildProfile(n: Nutriments, suffix: "_100g" | "_serving"): NutrientProfile {
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

export async function GET(req: Request, { params }: { params: Promise<{ barcode: string }> }) {
  const { barcode } = await params;

  if (!/^\d{6,14}$/.test(barcode)) {
    return NextResponse.json({ error: "That doesn't look like a valid barcode." }, { status: 400 });
  }

  let res: Response;
  try {
    res = await fetch(
      `${OFF_BASE}/${encodeURIComponent(barcode)}.json?fields=product_name,brands,image_front_small_url,serving_size,nutriments`,
      { headers: { "User-Agent": "Metabo-DietMetabolismApp/1.0" } }
    );
  } catch {
    return NextResponse.json({ error: "Couldn't reach the food database. Please try again." }, { status: 502 });
  }

  if (!res.ok) {
    return NextResponse.json({ error: "Couldn't reach the food database. Please try again." }, { status: 502 });
  }

  const data = await res.json();
  if (data.status !== 1 || !data.product) {
    return NextResponse.json({ error: "No product found for that barcode." }, { status: 404 });
  }

  const p = data.product;
  const n: Nutriments = p.nutriments ?? {};

  const food: ScannedFood = {
    barcode,
    productName: p.product_name || "Unknown product",
    brand: p.brands || undefined,
    imageUrl: p.image_front_small_url || undefined,
    servingSize: p.serving_size || undefined,
    per100g: buildProfile(n, "_100g"),
    perServing: p.serving_size ? buildProfile(n, "_serving") : undefined,
  };

  return NextResponse.json({ food });
}
