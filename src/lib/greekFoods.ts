import { scaleNutrientProfile } from "./nutrition";
import type { NutrientProfile, ScannedFood } from "./types";

// Traditional Greek foods rarely carry a barcode (homemade dishes, deli
// counter items, olives sold loose, etc.), so barcode lookup against Open
// Food Facts can't find them no matter how good its Greek coverage is.
// This is a small curated, name-searchable alternative for exactly that
// gap. Values are typical/representative figures for each dish (the kind
// found in general food-composition references), not measurements of a
// specific packaged product — real dishes vary with recipe and portion.
export interface GreekDish {
  slug: string;
  name: string;
  category: string;
  servingLabel: string;
  gramsPerServing: number;
  per100g: NutrientProfile;
  // Wikimedia Commons filename (not a URL) — resolved via commonsImageUrl().
  imageFile: string;
}

// Wikimedia Commons' Special:FilePath redirects straight to the actual file,
// so a filename is enough — no need to know the CDN hash path it lives at.
export function commonsImageUrl(filename: string, width = 200): string {
  return `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(filename)}?width=${width}`;
}

export const GREEK_DISHES: GreekDish[] = [
  {
    slug: "feta",
    name: "Feta cheese",
    category: "Dairy",
    servingLabel: "1 cube (30 g)",
    gramsPerServing: 30,
    per100g: { calories: 264, proteinG: 14.2, fatG: 21.3, saturatedFatG: 14.9, carbsG: 4.1, sugarsG: 4.1, fiberG: 0, sodiumMg: 1116, potassiumMg: 62, calciumMg: 493, ironMg: 0.65, vitaminCMg: 0, vitaminDMcg: 0 },
    imageFile: "Feta_Cheese.jpg",
  },
  {
    slug: "greek-yogurt",
    name: "Greek yogurt (whole milk, strained)",
    category: "Dairy",
    servingLabel: "1 cup (170 g)",
    gramsPerServing: 170,
    per100g: { calories: 97, proteinG: 9, fatG: 5, saturatedFatG: 3.3, carbsG: 3.6, sugarsG: 3.6, fiberG: 0, sodiumMg: 35, potassiumMg: 141, calciumMg: 111, ironMg: 0.04, vitaminCMg: 0, vitaminDMcg: 0 },
    imageFile: "Fresh_greek_yoghurt.jpg",
  },
  {
    slug: "halloumi",
    name: "Halloumi, grilled",
    category: "Dairy",
    servingLabel: "1 slice (80 g)",
    gramsPerServing: 80,
    per100g: { calories: 321, proteinG: 21.3, fatG: 25.1, saturatedFatG: 17, carbsG: 2, sugarsG: 2, fiberG: 0, sodiumMg: 1590, potassiumMg: 95, calciumMg: 795, ironMg: 0.5, vitaminCMg: 0, vitaminDMcg: 0 },
    imageFile: "Grilled_Halloumi.jpg",
  },
  {
    slug: "kalamata-olives",
    name: "Kalamata olives, in brine",
    category: "Olives & oil",
    servingLabel: "6 olives (30 g)",
    gramsPerServing: 30,
    per100g: { calories: 115, proteinG: 0.8, fatG: 10.7, saturatedFatG: 1.4, carbsG: 6.3, sugarsG: 0, fiberG: 3.2, sodiumMg: 1556, potassiumMg: 42, calciumMg: 52, ironMg: 0.5, vitaminCMg: 0, vitaminDMcg: 0 },
    imageFile: "Kalamataolives.jpg",
  },
  {
    slug: "olive-oil",
    name: "Extra virgin olive oil",
    category: "Olives & oil",
    servingLabel: "1 tbsp (13.5 g)",
    gramsPerServing: 13.5,
    per100g: { calories: 884, proteinG: 0, fatG: 100, saturatedFatG: 13.8, carbsG: 0, sugarsG: 0, fiberG: 0, sodiumMg: 2, potassiumMg: 1, calciumMg: 1, ironMg: 0.56, vitaminCMg: 0, vitaminDMcg: 0 },
    imageFile: "Extra_Virgin_Olive_Oil.jpg",
  },
  {
    slug: "tzatziki",
    name: "Tzatziki",
    category: "Dips & spreads",
    servingLabel: "2 tbsp (30 g)",
    gramsPerServing: 30,
    per100g: { calories: 82, proteinG: 3.5, fatG: 6, saturatedFatG: 2, carbsG: 3.5, sugarsG: 2, fiberG: 0.3, sodiumMg: 250, potassiumMg: 130, calciumMg: 90, ironMg: 0.2, vitaminCMg: 2, vitaminDMcg: 0 },
    imageFile: "Tzatziki.jpg",
  },
  {
    slug: "taramasalata",
    name: "Taramasalata",
    category: "Dips & spreads",
    servingLabel: "2 tbsp (30 g)",
    gramsPerServing: 30,
    per100g: { calories: 400, proteinG: 3, fatG: 42, saturatedFatG: 4.5, carbsG: 6, sugarsG: 1, fiberG: 0.2, sodiumMg: 650, potassiumMg: 90, calciumMg: 20, ironMg: 0.5, vitaminCMg: 0, vitaminDMcg: 1 },
    imageFile: "Taramosalata01.jpg",
  },
  {
    slug: "moussaka",
    name: "Moussaka",
    category: "Mains",
    servingLabel: "1 portion (300 g)",
    gramsPerServing: 300,
    per100g: { calories: 145, proteinG: 7, fatG: 9.5, saturatedFatG: 4, carbsG: 8, sugarsG: 3, fiberG: 1.5, sodiumMg: 320, potassiumMg: 280, calciumMg: 60, ironMg: 1, vitaminCMg: 4, vitaminDMcg: 0.2 },
    imageFile: "Moussaka_12.jpg",
  },
  {
    slug: "souvlaki-gyro",
    name: "Souvlaki / gyro meat, grilled",
    category: "Mains",
    servingLabel: "1 skewer (150 g)",
    gramsPerServing: 150,
    per100g: { calories: 220, proteinG: 26, fatG: 12, saturatedFatG: 4, carbsG: 1, sugarsG: 0, fiberG: 0, sodiumMg: 380, potassiumMg: 350, calciumMg: 15, ironMg: 1.3, vitaminCMg: 0, vitaminDMcg: 0.3 },
    imageFile: "Souvlaki_457.jpg",
  },
  {
    slug: "dolmades",
    name: "Dolmades (stuffed grape leaves)",
    category: "Mains",
    servingLabel: "3 pieces (90 g)",
    gramsPerServing: 90,
    per100g: { calories: 170, proteinG: 2.5, fatG: 9, saturatedFatG: 1.2, carbsG: 20, sugarsG: 1, fiberG: 2, sodiumMg: 400, potassiumMg: 150, calciumMg: 40, ironMg: 1.5, vitaminCMg: 3, vitaminDMcg: 0 },
    imageFile: "Dolmadakia.JPG",
  },
  {
    slug: "spanakopita",
    name: "Spanakopita (spinach pie)",
    category: "Savory pastry",
    servingLabel: "1 slice (120 g)",
    gramsPerServing: 120,
    per100g: { calories: 250, proteinG: 7, fatG: 16, saturatedFatG: 6, carbsG: 20, sugarsG: 1.5, fiberG: 2.5, sodiumMg: 480, potassiumMg: 250, calciumMg: 150, ironMg: 2, vitaminCMg: 8, vitaminDMcg: 0 },
    imageFile: "Spanakopita.jpg",
  },
  {
    slug: "horiatiki",
    name: "Horiatiki (Greek village salad)",
    category: "Salads",
    servingLabel: "1 bowl (250 g)",
    gramsPerServing: 250,
    per100g: { calories: 110, proteinG: 3, fatG: 9, saturatedFatG: 3, carbsG: 5, sugarsG: 3, fiberG: 1.5, sodiumMg: 320, potassiumMg: 220, calciumMg: 90, ironMg: 0.6, vitaminCMg: 15, vitaminDMcg: 0 },
    imageFile: "Greece_Food_Horiatiki.JPG",
  },
  {
    slug: "fasolada",
    name: "Fasolada (Greek bean soup)",
    category: "Soups",
    servingLabel: "1 bowl (300 g)",
    gramsPerServing: 300,
    per100g: { calories: 95, proteinG: 5, fatG: 2, saturatedFatG: 0.3, carbsG: 15, sugarsG: 2, fiberG: 5, sodiumMg: 300, potassiumMg: 350, calciumMg: 40, ironMg: 1.8, vitaminCMg: 6, vitaminDMcg: 0 },
    imageFile: "Fasolada.JPG",
  },
  {
    slug: "baklava",
    name: "Baklava",
    category: "Sweets",
    servingLabel: "1 piece (40 g)",
    gramsPerServing: 40,
    per100g: { calories: 430, proteinG: 6, fatG: 25, saturatedFatG: 8, carbsG: 45, sugarsG: 30, fiberG: 2, sodiumMg: 180, potassiumMg: 120, calciumMg: 60, ironMg: 1.5, vitaminCMg: 0, vitaminDMcg: 0 },
    imageFile: "Baklava.jpg",
  },
];

export function greekDishToScannedFood(dish: GreekDish): ScannedFood {
  return {
    barcode: `greek:${dish.slug}`,
    productName: dish.name,
    brand: "Traditional Greek dish — typical values",
    servingSize: dish.servingLabel,
    imageUrl: commonsImageUrl(dish.imageFile, 200),
    per100g: dish.per100g,
    perServing: scaleNutrientProfile(dish.per100g, dish.gramsPerServing / 100),
  };
}
