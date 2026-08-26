import { scaleNutrientProfile } from "./nutrition";
import type { NutrientProfile, ScannedFood } from "./types";

// A small curated set of common packaged products with real barcodes, so
// both name search and manual/camera barcode entry resolve instantly and
// reliably — independent of Open Food Facts' network availability or
// coverage for these specific items. Falls back to Open Food Facts for
// every barcode not in this list (see lookupBarcode in ./nutrition).
// Values are typical/representative label figures, not lab measurements.
export interface PackagedFood {
  barcode: string;
  name: string;
  brand: string;
  category: string;
  servingLabel: string;
  gramsPerServing: number;
  per100g: NutrientProfile;
}

export const PACKAGED_FOODS: PackagedFood[] = [
  {
    barcode: "3017620422003",
    name: "Nutella",
    brand: "Ferrero",
    category: "Spreads",
    servingLabel: "2 tbsp (37 g)",
    gramsPerServing: 37,
    per100g: { calories: 539, proteinG: 6.3, fatG: 30.9, saturatedFatG: 10.6, carbsG: 57.5, sugarsG: 56.3, fiberG: 0, sodiumMg: 42, potassiumMg: 180, calciumMg: 87, ironMg: 1.5 },
  },
  {
    barcode: "5449000000996",
    name: "Coca-Cola",
    brand: "Coca-Cola",
    category: "Beverages",
    servingLabel: "1 can (330 ml)",
    gramsPerServing: 330,
    per100g: { calories: 42, proteinG: 0, fatG: 0, saturatedFatG: 0, carbsG: 10.6, sugarsG: 10.6, fiberG: 0, sodiumMg: 5 },
  },
  {
    barcode: "7622300336738",
    name: "Oreo Original",
    brand: "Oreo",
    category: "Cookies & biscuits",
    servingLabel: "3 cookies (34 g)",
    gramsPerServing: 34,
    per100g: { calories: 480, proteinG: 5, fatG: 20, saturatedFatG: 6.7, carbsG: 69, sugarsG: 39, fiberG: 2.6, sodiumMg: 430, potassiumMg: 160, calciumMg: 30, ironMg: 3 },
  },
  {
    barcode: "5201054016305",
    name: "Total 0% Greek Yogurt",
    brand: "Fage",
    category: "Dairy",
    servingLabel: "1 cup (170 g)",
    gramsPerServing: 170,
    per100g: { calories: 57, proteinG: 10, fatG: 0.2, saturatedFatG: 0.1, carbsG: 3.8, sugarsG: 3.8, fiberG: 0, sodiumMg: 36, potassiumMg: 141, calciumMg: 120, ironMg: 0.05 },
  },
  {
    barcode: "8076800105056",
    name: "Spaghetti N.5",
    brand: "Barilla",
    category: "Pasta & grains",
    servingLabel: "1 serving, dry (85 g)",
    gramsPerServing: 85,
    per100g: { calories: 353, proteinG: 12.5, fatG: 1.5, saturatedFatG: 0.3, carbsG: 71, sugarsG: 3.2, fiberG: 3, sodiumMg: 2, potassiumMg: 200, ironMg: 1.5 },
  },
  {
    barcode: "5900783000455",
    name: "Tomato Ketchup",
    brand: "Heinz",
    category: "Sauces & condiments",
    servingLabel: "1 tbsp (17 g)",
    gramsPerServing: 17,
    per100g: { calories: 101, proteinG: 1.2, fatG: 0.1, saturatedFatG: 0, carbsG: 25, sugarsG: 22, fiberG: 1, sodiumMg: 1020, potassiumMg: 340, vitaminCMg: 7 },
  },
  {
    barcode: "5053827185851",
    name: "Corn Flakes",
    brand: "Kellogg's",
    category: "Cereal",
    servingLabel: "1 bowl (30 g)",
    gramsPerServing: 30,
    per100g: { calories: 378, proteinG: 7, fatG: 0.9, saturatedFatG: 0.2, carbsG: 84, sugarsG: 8, fiberG: 3, sodiumMg: 660, ironMg: 13, vitaminCMg: 12, vitaminDMcg: 2.5 },
  },
  {
    barcode: "9002490215408",
    name: "Red Bull Energy Drink",
    brand: "Red Bull",
    category: "Beverages",
    servingLabel: "1 can (250 ml)",
    gramsPerServing: 250,
    per100g: { calories: 45, proteinG: 0, fatG: 0, carbsG: 11, sugarsG: 11, fiberG: 0, sodiumMg: 20 },
  },
  {
    barcode: "5000159382731",
    name: "Snickers",
    brand: "Snickers",
    category: "Chocolate & candy",
    servingLabel: "1 bar (50 g)",
    gramsPerServing: 50,
    per100g: { calories: 488, proteinG: 8.5, fatG: 24, saturatedFatG: 9, carbsG: 59, sugarsG: 50, fiberG: 2, sodiumMg: 230, potassiumMg: 320, calciumMg: 80 },
  },
  {
    barcode: "3200700000974",
    name: "Classic Potato Chips",
    brand: "Lay's",
    category: "Snacks",
    servingLabel: "1 small bag (45 g)",
    gramsPerServing: 45,
    per100g: { calories: 536, proteinG: 6.4, fatG: 34, saturatedFatG: 3, carbsG: 53, sugarsG: 0.5, fiberG: 4, sodiumMg: 450, potassiumMg: 1000, vitaminCMg: 10 },
  },
  {
    barcode: "5201125003609",
    name: "Original Cream Cheese",
    brand: "Philadelphia",
    category: "Dairy",
    servingLabel: "2 tbsp (30 g)",
    gramsPerServing: 30,
    per100g: { calories: 253, proteinG: 5.5, fatG: 24, saturatedFatG: 15, carbsG: 4, sugarsG: 4, fiberG: 0, sodiumMg: 300, calciumMg: 90 },
  },
  {
    barcode: "5201219046154",
    name: "Nescafé Classic",
    brand: "Nescafé",
    category: "Coffee & tea",
    servingLabel: "1 tsp, dry (2 g)",
    gramsPerServing: 2,
    per100g: { calories: 105, proteinG: 14, fatG: 0.3, carbsG: 6, sugarsG: 0, fiberG: 0, sodiumMg: 180, potassiumMg: 3600 },
  },
  {
    barcode: "7622201098452",
    name: "Alpine Milk Chocolate",
    brand: "Milka",
    category: "Chocolate & candy",
    servingLabel: "4 squares (25 g)",
    gramsPerServing: 25,
    per100g: { calories: 534, proteinG: 6.2, fatG: 30, saturatedFatG: 18.6, carbsG: 57, sugarsG: 56, fiberG: 2, sodiumMg: 90, calciumMg: 180 },
  },
  {
    barcode: "6430012182113",
    name: "Natural Mineral Water",
    brand: "Evian",
    category: "Beverages",
    servingLabel: "1 bottle (500 ml)",
    gramsPerServing: 500,
    per100g: { calories: 0, proteinG: 0, fatG: 0, carbsG: 0, sugarsG: 0, fiberG: 0, sodiumMg: 0.5, calciumMg: 8 },
  },
];

export function packagedFoodToScannedFood(food: PackagedFood): ScannedFood {
  return {
    barcode: food.barcode,
    productName: food.name,
    brand: food.brand,
    servingSize: food.servingLabel,
    per100g: food.per100g,
    perServing: scaleNutrientProfile(food.per100g, food.gramsPerServing / 100),
  };
}

export function findPackagedFoodByBarcode(barcode: string): PackagedFood | undefined {
  return PACKAGED_FOODS.find((f) => f.barcode === barcode);
}
