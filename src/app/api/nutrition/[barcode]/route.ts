import "server-only";
import { NextResponse } from "next/server";
import { buildOffNutrientProfile } from "@/lib/offNutrients";
import type { ScannedFood } from "@/lib/types";

export const runtime = "nodejs";

// Open Food Facts is a free, keyless, community-maintained food database.
// Coverage and unit consistency vary by product — this is a best-effort
// normalization, not a certified nutrition source.
const OFF_BASE = "https://world.openfoodfacts.org/api/v2/product";

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
  const n = p.nutriments ?? {};

  const food: ScannedFood = {
    barcode,
    productName: p.product_name || "Unknown product",
    brand: p.brands || undefined,
    imageUrl: p.image_front_small_url || undefined,
    servingSize: p.serving_size || undefined,
    per100g: buildOffNutrientProfile(n, "_100g"),
    perServing: p.serving_size ? buildOffNutrientProfile(n, "_serving") : undefined,
  };

  return NextResponse.json({ food });
}
