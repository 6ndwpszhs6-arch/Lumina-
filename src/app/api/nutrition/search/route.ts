import "server-only";
import { NextResponse } from "next/server";
import { buildOffNutrientProfile } from "@/lib/offNutrients";
import type { ScannedFood } from "@/lib/types";

export const runtime = "nodejs";

// Open Food Facts is a free, keyless, community-maintained food database.
// Coverage and unit consistency vary by product — this is a best-effort
// normalization, not a certified nutrition source.
const OFF_SEARCH = "https://world.openfoodfacts.org/api/v2/search";

export async function GET(req: Request) {
  const q = new URL(req.url).searchParams.get("q")?.trim();
  if (!q || q.length < 2) {
    return NextResponse.json({ foods: [] });
  }

  let res: Response;
  try {
    res = await fetch(
      `${OFF_SEARCH}?search_terms=${encodeURIComponent(q)}&page_size=30&sort_by=unique_scans_n&fields=code,product_name,brands,image_front_small_url,serving_size,nutriments`,
      { headers: { "User-Agent": "Metabo-DietMetabolismApp/1.0" } }
    );
  } catch {
    return NextResponse.json({ error: "Couldn't reach the food database. Please try again." }, { status: 502 });
  }

  if (!res.ok) {
    return NextResponse.json({ error: "Couldn't reach the food database. Please try again." }, { status: 502 });
  }

  const data = await res.json();
  const products: unknown[] = Array.isArray(data.products) ? data.products : [];

  const foods: ScannedFood[] = products
    .filter((p): p is Record<string, unknown> => Boolean(p) && typeof p === "object")
    .map((p): ScannedFood | null => {
      const code = typeof p.code === "string" ? p.code : "";
      if (!code) return null;
      const n = (p.nutriments as Record<string, unknown>) ?? {};
      const servingSize = typeof p.serving_size === "string" ? p.serving_size : undefined;
      const per100g = buildOffNutrientProfile(n, "_100g");
      if (per100g.calories === undefined) return null;
      return {
        barcode: code,
        productName: typeof p.product_name === "string" && p.product_name ? p.product_name : "Unknown product",
        brand: typeof p.brands === "string" && p.brands ? p.brands : undefined,
        imageUrl: typeof p.image_front_small_url === "string" ? p.image_front_small_url : undefined,
        servingSize,
        per100g,
        perServing: servingSize ? buildOffNutrientProfile(n, "_serving") : undefined,
      };
    })
    .filter((f): f is ScannedFood => f !== null);

  return NextResponse.json({ foods });
}
