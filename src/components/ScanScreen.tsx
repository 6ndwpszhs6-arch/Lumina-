"use client";

import { useEffect, useRef, useState } from "react";
import { Capacitor } from "@capacitor/core";
import type { IScannerControls } from "@zxing/browser";
import { db, generateId } from "@/lib/db";
import { addFoodLogEntrySynced, removeFoodLogEntrySynced } from "@/lib/sync";
import { lookupBarcode, scaleNutrientProfile, searchFoodsByName } from "@/lib/nutrition";
import { GREEK_DISHES, commonsImageUrl, greekDishToScannedFood } from "@/lib/greekFoods";
import { PACKAGED_FOODS, packagedFoodToScannedFood } from "@/lib/packagedFoods";
import { NUTRIENT_FIELDS } from "@/lib/types";
import type { FoodLogEntry, NutrientBasis, NutrientProfile, ScannedFood, Subscription } from "@/lib/types";
import { cn } from "@/lib/utils";
import Paywall from "./Paywall";
import { Barcode, Camera, Loader2, Search, Trash2, X } from "lucide-react";

const BARCODE_PATTERN = /^\d{6,14}$/;
const BARCODE_LIKE_PATTERN = /^\d{3,}$/;

interface Props {
  subscription: Subscription;
  onSubscriptionChange: (subscription: Subscription) => void;
}

function fmt(value: number | undefined, unit: string): string {
  return value === undefined ? "—" : `${value} ${unit}`;
}

function sumProfiles(entries: FoodLogEntry[]): NutrientProfile {
  const total: NutrientProfile = {};
  entries.forEach((e) => {
    NUTRIENT_FIELDS.forEach(({ key }) => {
      const v = e.nutrients[key];
      if (v !== undefined) total[key] = Math.round(((total[key] ?? 0) + v) * 10) / 10;
    });
  });
  return total;
}

export default function ScanScreen({ subscription, onSubscriptionChange }: Props) {
  const isPremium = subscription.tier === "premium";

  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ScannedFood | null>(null);
  const [basis, setBasis] = useState<NutrientBasis>("100g");
  const [servings, setServings] = useState("1");
  const [todayLog, setTodayLog] = useState<FoodLogEntry[]>([]);
  const [scanning, setScanning] = useState(false);
  const [nameResults, setNameResults] = useState<ScannedFood[]>([]);
  const [nameSearching, setNameSearching] = useState(false);
  const [nameSearchError, setNameSearchError] = useState<string | null>(null);
  const isNative = Capacitor.isNativePlatform();
  const [cameraSupported] = useState(
    () => isNative || (typeof navigator !== "undefined" && Boolean(navigator.mediaDevices?.getUserMedia))
  );

  const videoRef = useRef<HTMLVideoElement>(null);
  const controlsRef = useRef<IScannerControls | null>(null);

  const today = new Date().toISOString().slice(0, 10);
  const trimmedQuery = query.trim();
  const isBarcodeQuery = BARCODE_PATTERN.test(trimmedQuery);

  useEffect(() => {
    if (!isPremium) return;
    db.foodLog.where("date").equals(today).toArray().then(setTodayLog);
    return () => stopCamera();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPremium]);

  async function runLookup(code: string) {
    setError(null);
    setResult(null);
    setLoading(true);
    const { food, error: err } = await lookupBarcode(code);
    setLoading(false);
    if (err || !food) {
      setError(err ?? "Lookup failed.");
      return;
    }
    setResult(food);
    setBasis(food.perServing ? "serving" : "100g");
    setServings("1");
    setQuery("");
  }

  useEffect(() => {
    const trimmed = query.trim();
    const timer = setTimeout(async () => {
      if (trimmed.length < 2 || BARCODE_LIKE_PATTERN.test(trimmed)) {
        setNameResults([]);
        setNameSearching(false);
        setNameSearchError(null);
        return;
      }
      setNameSearching(true);
      setNameSearchError(null);
      const { foods, error: err } = await searchFoodsByName(trimmed);
      setNameSearching(false);
      if (err) {
        setNameSearchError(err);
        return;
      }
      setNameResults(foods);
    }, 400);
    return () => clearTimeout(timer);
  }, [query]);

  function selectSearchResult(food: ScannedFood) {
    setError(null);
    setResult(food);
    setBasis(food.perServing ? "serving" : "100g");
    setServings("1");
    setQuery("");
  }

  function selectGreekDish(dish: (typeof GREEK_DISHES)[number]) {
    setError(null);
    const food = greekDishToScannedFood(dish);
    setResult(food);
    setBasis("serving");
    setServings("1");
    setQuery("");
  }

  function selectPackagedFood(item: (typeof PACKAGED_FOODS)[number]) {
    setError(null);
    const food = packagedFoodToScannedFood(item);
    setResult(food);
    setBasis(food.perServing ? "serving" : "100g");
    setServings("1");
    setQuery("");
  }

  const matchingDishes = trimmedQuery
    ? GREEK_DISHES.filter((d) => d.name.toLowerCase().includes(trimmedQuery.toLowerCase()))
    : [];

  const matchingPackaged = trimmedQuery
    ? PACKAGED_FOODS.filter(
        (f) =>
          f.name.toLowerCase().includes(trimmedQuery.toLowerCase()) ||
          f.brand.toLowerCase().includes(trimmedQuery.toLowerCase())
      )
    : [];

  async function startCamera() {
    setError(null);

    if (isNative) {
      try {
        const { BarcodeScanner, BarcodeFormat } = await import("@capacitor-mlkit/barcode-scanning");
        const { camera } = await BarcodeScanner.requestPermissions();
        if (camera !== "granted" && camera !== "limited") {
          setError("Camera permission was denied — enable it in Settings, or enter the barcode manually below.");
          return;
        }
        const { barcodes } = await BarcodeScanner.scan({
          formats: [
            BarcodeFormat.Ean13,
            BarcodeFormat.Ean8,
            BarcodeFormat.UpcA,
            BarcodeFormat.UpcE,
            BarcodeFormat.QrCode,
            BarcodeFormat.Code128,
            BarcodeFormat.Code39,
            BarcodeFormat.Code93,
            BarcodeFormat.Codabar,
            BarcodeFormat.Itf,
            BarcodeFormat.DataMatrix,
            BarcodeFormat.Pdf417,
            BarcodeFormat.Aztec,
          ],
        });
        const value = barcodes[0]?.rawValue || barcodes[0]?.displayValue;
        if (value) runLookup(value);
      } catch {
        setError("Camera scanning failed. Please enter the barcode manually below.");
      }
      return;
    }

    // Safari (and every other modern browser) supports camera access via
    // getUserMedia — it just has no native BarcodeDetector API. ZXing decodes
    // frames itself (canvas + JS), so this path works everywhere getUserMedia
    // does, including iOS Safari.
    try {
      const { BrowserMultiFormatReader } = await import("@zxing/browser");
      const { BarcodeFormat, DecodeHintType } = await import("@zxing/library");
      const hints = new Map();
      hints.set(DecodeHintType.POSSIBLE_FORMATS, [
        BarcodeFormat.EAN_13,
        BarcodeFormat.EAN_8,
        BarcodeFormat.UPC_A,
        BarcodeFormat.UPC_E,
        BarcodeFormat.QR_CODE,
        BarcodeFormat.CODE_128,
        BarcodeFormat.CODE_39,
        BarcodeFormat.CODE_93,
        BarcodeFormat.CODABAR,
        BarcodeFormat.ITF,
        BarcodeFormat.DATA_MATRIX,
        BarcodeFormat.PDF_417,
        BarcodeFormat.AZTEC,
      ]);
      const reader = new BrowserMultiFormatReader(hints);
      if (!videoRef.current) return;
      setScanning(true);
      const controls = await reader.decodeFromConstraints(
        { video: { facingMode: "environment" } },
        videoRef.current,
        (result) => {
          if (!result) return;
          stopCamera();
          runLookup(result.getText());
        }
      );
      controlsRef.current = controls;
    } catch {
      setScanning(false);
      setError("Couldn't access the camera — check camera permission in your browser settings, or enter the barcode manually below.");
    }
  }

  function stopCamera() {
    controlsRef.current?.stop();
    controlsRef.current = null;
    setScanning(false);
  }

  async function addToLog() {
    if (!result) return;
    const qty = Number(servings) || 1;
    const base = basis === "serving" && result.perServing ? result.perServing : result.per100g;
    const entry: FoodLogEntry = {
      id: generateId(),
      date: today,
      barcode: result.barcode,
      productName: result.productName,
      brand: result.brand,
      basis,
      servings: qty,
      nutrients: scaleNutrientProfile(base, qty),
      createdAt: new Date().toISOString(),
    };
    await addFoodLogEntrySynced(entry);
    setTodayLog((prev) => [...prev, entry]);
  }

  async function removeEntry(id: string) {
    await removeFoodLogEntrySynced(id);
    setTodayLog((prev) => prev.filter((e) => e.id !== id));
  }

  if (!isPremium) {
    return (
      <div className="space-y-4">
        <div>
          <h2 className="text-xl font-semibold">Food Scanner</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Scan a barcode to see a food&apos;s full macro and micronutrient breakdown.
          </p>
        </div>
        <Paywall
          title="Unlock the Food Scanner"
          features={[
            "Scan any packaged food's barcode or QR code with your camera",
            "Search packaged foods and traditional Greek dishes by name",
            "Full macro breakdown: calories, protein, fat, sugar, fiber",
            "Micronutrients: sodium, potassium, calcium, iron, vitamins",
            "Log scanned foods and see your daily nutrient totals",
          ]}
          onSubscriptionChange={onSubscriptionChange}
        />
      </div>
    );
  }

  const displayed = result ? (basis === "serving" && result.perServing ? result.perServing : result.per100g) : null;
  const totals = sumProfiles(todayLog);

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-semibold">Food Scanner</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Search any packaged food or traditional Greek dish, enter a barcode, or scan with your camera.
        </p>
      </div>

      <div className="space-y-2">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && isBarcodeQuery && runLookup(trimmedQuery)}
            placeholder="Search foods, Greek dishes, or enter a barcode"
            className="w-full rounded-xl border border-border bg-card py-2.5 pl-10 pr-9 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
          {(loading || nameSearching) && (
            <Loader2 className="absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
          )}
        </div>

        {trimmedQuery && (
          <div className="max-h-72 space-y-1.5 overflow-y-auto">
            {isBarcodeQuery && (
              <button
                onClick={() => runLookup(trimmedQuery)}
                className="flex w-full items-center gap-2 rounded-xl border border-primary bg-primary/10 px-3 py-2 text-left text-sm font-medium text-primary transition active:scale-[0.99]"
              >
                <Barcode className="h-4 w-4 shrink-0" />
                Look up barcode {trimmedQuery}
              </button>
            )}

            {matchingDishes.map((dish) => (
              <button
                key={dish.slug}
                onClick={() => selectGreekDish(dish)}
                className="flex w-full items-center gap-2.5 rounded-xl border border-border bg-card px-3 py-2 text-left text-sm transition active:scale-[0.99]"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={commonsImageUrl(dish.imageFile, 80)}
                  alt=""
                  loading="lazy"
                  className="h-9 w-9 shrink-0 rounded-lg object-cover"
                />
                <span className="min-w-0 flex-1 truncate font-medium">{dish.name}</span>
                <span className="shrink-0 text-xs text-muted-foreground">Greek dish</span>
              </button>
            ))}

            {matchingPackaged.map((item) => (
              <button
                key={item.barcode}
                onClick={() => selectPackagedFood(item)}
                className="flex w-full items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 text-left text-sm transition active:scale-[0.99]"
              >
                <span className="min-w-0 flex-1 truncate font-medium">{item.name}</span>
                <span className="shrink-0 truncate text-xs text-muted-foreground">{item.brand}</span>
              </button>
            ))}

            {nameResults.map((food) => (
              <button
                key={food.barcode}
                onClick={() => selectSearchResult(food)}
                className="flex w-full items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 text-left text-sm transition active:scale-[0.99]"
              >
                {food.imageUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={food.imageUrl} alt="" className="h-8 w-8 shrink-0 rounded object-cover" />
                )}
                <span className="min-w-0 flex-1 truncate font-medium">{food.productName}</span>
                {food.brand && <span className="shrink-0 truncate text-xs text-muted-foreground">{food.brand}</span>}
              </button>
            ))}

            {nameSearchError && <p className="py-1 text-xs text-danger">{nameSearchError}</p>}

            {!isBarcodeQuery &&
              !nameSearching &&
              !nameSearchError &&
              matchingDishes.length === 0 &&
              matchingPackaged.length === 0 &&
              nameResults.length === 0 && (
                <p className="py-2 text-center text-xs text-muted-foreground">No matches for &quot;{trimmedQuery}&quot;.</p>
              )}
          </div>
        )}
      </div>

      {cameraSupported && (
        <button
          onClick={startCamera}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-card py-2.5 text-sm font-medium"
        >
          <Camera className="h-4 w-4" />
          Scan with camera
        </button>
      )}
      {!cameraSupported && (
        <p className="text-xs text-muted-foreground">
          Camera scanning needs browser camera access, which isn&apos;t available here — manual entry and search
          always work, and the native iOS app uses the device camera directly.
        </p>
      )}

      {!isNative && (
        <div className={cn("fixed inset-0 z-[60] flex flex-col bg-black", !scanning && "hidden")}>
          <video ref={videoRef} className="absolute inset-0 h-full w-full object-cover" muted playsInline />

          <div className="relative z-10 flex items-center justify-between px-4 pt-4 safe-top">
            <button
              onClick={stopCamera}
              aria-label="Close scanner"
              className="flex h-10 w-10 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-sm transition active:scale-95"
            >
              <X className="h-5 w-5" />
            </button>
            <p className="text-sm font-medium text-white">Scan a barcode or QR code</p>
            <div className="h-10 w-10" />
          </div>

          <div className="relative flex flex-1 items-center justify-center">
            <div
              className="relative h-48 w-72 max-w-[80vw] overflow-hidden rounded-2xl"
              style={{ boxShadow: "0 0 0 9999px rgba(0,0,0,0.55)" }}
            >
              <ScannerCorner className="left-0 top-0 rounded-tl-2xl border-l-[3px] border-t-[3px]" />
              <ScannerCorner className="right-0 top-0 rounded-tr-2xl border-r-[3px] border-t-[3px]" />
              <ScannerCorner className="bottom-0 left-0 rounded-bl-2xl border-b-[3px] border-l-[3px]" />
              <ScannerCorner className="bottom-0 right-0 rounded-br-2xl border-b-[3px] border-r-[3px]" />
              <div className="animate-scan-line absolute inset-x-0 h-0.5 bg-primary shadow-[0_0_8px_2px_var(--color-primary)]" />
            </div>
          </div>

          <p className="relative z-10 pb-10 text-center text-sm text-white/80 safe-bottom">
            Position the barcode within the frame
          </p>
        </div>
      )}

      {error && <p className="text-sm text-danger">{error}</p>}

      {result && displayed && (
        <div className="space-y-3 rounded-2xl border border-border bg-card p-4">
          <div className="flex items-start gap-3">
            {result.imageUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={result.imageUrl} alt="" className="h-14 w-14 shrink-0 rounded-lg object-cover" />
            )}
            <div className="min-w-0">
              <p className="truncate font-medium">{result.productName}</p>
              {result.brand && <p className="truncate text-xs text-muted-foreground">{result.brand}</p>}
            </div>
          </div>

          {result.perServing && (
            <div className="flex gap-2">
              <button
                onClick={() => setBasis("100g")}
                className={cn(
                  "rounded-full border px-3 py-1 text-xs font-medium",
                  basis === "100g" ? "border-primary bg-primary/15 text-primary" : "border-border text-muted-foreground"
                )}
              >
                Per 100g
              </button>
              <button
                onClick={() => setBasis("serving")}
                className={cn(
                  "rounded-full border px-3 py-1 text-xs font-medium",
                  basis === "serving" ? "border-primary bg-primary/15 text-primary" : "border-border text-muted-foreground"
                )}
              >
                Per serving ({result.servingSize})
              </button>
            </div>
          )}

          <NutrientTable profile={displayed} />

          <div className="flex items-center gap-2 pt-1">
            <label className="text-sm text-muted-foreground" htmlFor="servings-input">
              Servings
            </label>
            <input
              id="servings-input"
              type="number"
              min="0.25"
              step="0.25"
              value={servings}
              onChange={(e) => setServings(e.target.value)}
              className="w-20 rounded-lg border border-border bg-secondary px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
            <button
              onClick={addToLog}
              className="ml-auto rounded-xl bg-primary px-3.5 py-2 text-sm font-medium text-primary-foreground"
            >
              Add to today&apos;s log
            </button>
          </div>

          <p className="text-xs text-muted-foreground">
            {result.barcode.startsWith("greek:")
              ? "Typical values for this dish — real nutrition varies with recipe and portion, so treat this as an estimate. Photo via Wikimedia Commons."
              : "Nutrition data from Open Food Facts, a community-maintained database."}{" "}
            Always check the actual package label when precision matters (e.g. for insulin dosing or PKU Phe
            tracking).
          </p>
        </div>
      )}

      {todayLog.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-muted-foreground">Today&apos;s log</h3>
          <div className="space-y-2">
            {todayLog.map((entry) => (
              <div
                key={entry.id}
                className="flex items-center justify-between gap-2 rounded-xl border border-border bg-card px-3 py-2 text-sm"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium">{entry.productName}</p>
                  <p className="text-xs text-muted-foreground">
                    {entry.servings}× {entry.basis === "serving" ? "serving" : "100g"} · {entry.nutrients.calories ?? "—"} kcal
                  </p>
                </div>
                <button onClick={() => removeEntry(entry.id)} className="shrink-0 text-muted-foreground">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
          <div className="rounded-2xl border border-border bg-card p-4">
            <p className="mb-3 text-xs uppercase tracking-wide text-primary">Today&apos;s totals</p>
            <MacroRing totals={totals} />
            <div className="mt-4 border-t border-border pt-4">
              <NutrientTable profile={totals} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ScannerCorner({ className }: { className: string }) {
  return <div className={cn("pointer-events-none absolute h-7 w-7 border-white", className)} />;
}

const MACRO_RING_RADIUS = 42;
const MACRO_RING_CIRCUMFERENCE = 2 * Math.PI * MACRO_RING_RADIUS;

function MacroRing({ totals }: { totals: NutrientProfile }) {
  const proteinG = totals.proteinG ?? 0;
  const fatG = totals.fatG ?? 0;
  const carbsG = totals.carbsG ?? 0;
  const grams = proteinG + fatG + carbsG || 1;
  const proteinLen = (proteinG / grams) * MACRO_RING_CIRCUMFERENCE;
  const fatLen = (fatG / grams) * MACRO_RING_CIRCUMFERENCE;
  const carbLen = (carbsG / grams) * MACRO_RING_CIRCUMFERENCE;

  return (
    <div className="flex items-center gap-4">
      <div className="relative h-28 w-28 shrink-0">
        <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
          <circle cx="50" cy="50" r={MACRO_RING_RADIUS} fill="none" stroke="var(--border)" strokeWidth="9" />
          <circle
            cx="50"
            cy="50"
            r={MACRO_RING_RADIUS}
            fill="none"
            stroke="var(--primary)"
            strokeWidth="9"
            strokeLinecap="round"
            strokeDasharray={`${proteinLen} 999`}
            className="transition-all duration-500"
          />
          <circle
            cx="50"
            cy="50"
            r={MACRO_RING_RADIUS}
            fill="none"
            stroke="var(--warning)"
            strokeWidth="9"
            strokeLinecap="round"
            strokeDasharray={`${fatLen} 999`}
            strokeDashoffset={-proteinLen}
            className="transition-all duration-500"
          />
          <circle
            cx="50"
            cy="50"
            r={MACRO_RING_RADIUS}
            fill="none"
            stroke="var(--success)"
            strokeWidth="9"
            strokeLinecap="round"
            strokeDasharray={`${carbLen} 999`}
            strokeDashoffset={-(proteinLen + fatLen)}
            className="transition-all duration-500"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-lg font-semibold tabular-nums">{fmt(totals.calories, "").trim()}</span>
          <span className="text-[9px] uppercase tracking-wide text-muted-foreground">kcal</span>
        </div>
      </div>
      <div className="flex flex-1 flex-col gap-2 text-xs">
        <MacroLegendRow color="var(--primary)" label="Protein" value={`${proteinG} g`} />
        <MacroLegendRow color="var(--warning)" label="Fat" value={`${fatG} g`} />
        <MacroLegendRow color="var(--success)" label="Carbs" value={`${carbsG} g`} />
      </div>
    </div>
  );
}

function MacroLegendRow({ color, label, value }: { color: string; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: color }} />
      <span className="flex-1 text-muted-foreground">{label}</span>
      <span className="font-medium tabular-nums">{value}</span>
    </div>
  );
}

function NutrientTable({ profile }: { profile: NutrientProfile }) {
  const macros = NUTRIENT_FIELDS.filter((f) => f.group === "macro");
  const micros = NUTRIENT_FIELDS.filter((f) => f.group === "micro");
  return (
    <div className="space-y-3">
      <div>
        <p className="mb-1.5 text-xs font-medium text-muted-foreground">Macronutrients</p>
        <div className="grid grid-cols-2 gap-2 text-sm">
          {macros.map((f) => (
            <div key={f.key} className="flex items-baseline justify-between gap-2 rounded-lg bg-secondary px-2.5 py-1.5">
              <span className="truncate text-muted-foreground">{f.label}</span>
              <span className="shrink-0 whitespace-nowrap font-medium">{fmt(profile[f.key], f.unit)}</span>
            </div>
          ))}
        </div>
      </div>
      <div>
        <p className="mb-1.5 text-xs font-medium text-muted-foreground">Micronutrients</p>
        <div className="grid grid-cols-2 gap-2 text-sm">
          {micros.map((f) => (
            <div key={f.key} className="flex items-baseline justify-between gap-2 rounded-lg bg-secondary px-2.5 py-1.5">
              <span className="truncate text-muted-foreground">{f.label}</span>
              <span className="shrink-0 whitespace-nowrap font-medium">{fmt(profile[f.key], f.unit)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
