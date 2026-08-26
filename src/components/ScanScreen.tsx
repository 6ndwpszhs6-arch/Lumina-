"use client";

import { useEffect, useRef, useState } from "react";
import { Capacitor } from "@capacitor/core";
import { db, generateId } from "@/lib/db";
import { lookupBarcode, scaleNutrientProfile } from "@/lib/nutrition";
import { GREEK_DISHES, greekDishToScannedFood } from "@/lib/greekFoods";
import { NUTRIENT_FIELDS } from "@/lib/types";
import type { FoodLogEntry, NutrientBasis, NutrientProfile, ScannedFood, Subscription } from "@/lib/types";
import { cn } from "@/lib/utils";
import Paywall from "./Paywall";
import { Camera, Loader2, Search, Trash2, X } from "lucide-react";

interface Props {
  subscription: Subscription;
  onSetPremium: (enabled: boolean) => void;
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

export default function ScanScreen({ subscription, onSetPremium }: Props) {
  const isPremium = subscription.tier === "premium";

  const [barcode, setBarcode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ScannedFood | null>(null);
  const [basis, setBasis] = useState<NutrientBasis>("100g");
  const [servings, setServings] = useState("1");
  const [todayLog, setTodayLog] = useState<FoodLogEntry[]>([]);
  const [scanning, setScanning] = useState(false);
  const [dishQuery, setDishQuery] = useState("");
  const isNative = Capacitor.isNativePlatform();
  const [cameraSupported] = useState(
    () => isNative || (typeof window !== "undefined" && "BarcodeDetector" in window)
  );

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);

  const today = new Date().toISOString().slice(0, 10);

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
  }

  function handleManualLookup() {
    const code = barcode.trim();
    if (!code) return;
    runLookup(code);
  }

  function selectGreekDish(dish: (typeof GREEK_DISHES)[number]) {
    setError(null);
    setBarcode("");
    const food = greekDishToScannedFood(dish);
    setResult(food);
    setBasis("serving");
    setServings("1");
  }

  const matchingDishes = GREEK_DISHES.filter((d) =>
    d.name.toLowerCase().includes(dishQuery.trim().toLowerCase())
  );

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
          ],
        });
        const value = barcodes[0]?.rawValue || barcodes[0]?.displayValue;
        if (value) {
          setBarcode(value);
          runLookup(value);
        }
      } catch {
        setError("Camera scanning failed. Please enter the barcode manually below.");
      }
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setScanning(true);
      pollForBarcode();
    } catch {
      setError("Couldn't access the camera. You can still enter a barcode manually below.");
    }
  }

  function stopCamera() {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setScanning(false);
  }

  function pollForBarcode() {
    // BarcodeDetector isn't in the TS DOM lib yet; declared as unknown and
    // accessed dynamically, feature-detected before this function is ever called.
    const Detector = (window as unknown as { BarcodeDetector?: new (opts: { formats: string[] }) => { detect: (v: HTMLVideoElement) => Promise<{ rawValue: string }[]> } }).BarcodeDetector;
    if (!Detector || !videoRef.current) return;
    const detector = new Detector({ formats: ["ean_13", "ean_8", "upc_a", "upc_e", "qr_code"] });

    const tick = async () => {
      if (!videoRef.current || !streamRef.current) return;
      try {
        const codes = await detector.detect(videoRef.current);
        if (codes.length > 0) {
          const value = codes[0].rawValue;
          stopCamera();
          setBarcode(value);
          runLookup(value);
          return;
        }
      } catch {
        // keep polling — a single failed frame isn't fatal
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
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
    await db.foodLog.add(entry);
    setTodayLog((prev) => [...prev, entry]);
  }

  async function removeEntry(id: string) {
    await db.foodLog.delete(id);
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
            "Scan any packaged food's barcode for instant nutrition",
            "Search traditional Greek dishes that don't have a barcode",
            "Full macro breakdown: calories, protein, fat, sugar, fiber",
            "Micronutrients: sodium, potassium, calcium, iron, vitamins",
            "Log scanned foods and see your daily nutrient totals",
          ]}
          onUnlock={() => onSetPremium(true)}
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
          Scan or enter a barcode for packaged foods, or search traditional Greek dishes that don&apos;t have one.
        </p>
      </div>

      <div className="flex gap-2">
        <input
          value={barcode}
          onChange={(e) => setBarcode(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleManualLookup()}
          inputMode="numeric"
          placeholder="Enter barcode (e.g. 737628064502)"
          className="flex-1 rounded-xl border border-border bg-card px-3.5 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring"
        />
        <button
          onClick={handleManualLookup}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground"
          aria-label="Look up"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
        </button>
      </div>

      {cameraSupported && (
        <button
          onClick={!isNative && scanning ? stopCamera : startCamera}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-card py-2.5 text-sm font-medium"
        >
          {!isNative && scanning ? <X className="h-4 w-4" /> : <Camera className="h-4 w-4" />}
          {!isNative && scanning ? "Stop scanning" : "Scan with camera"}
        </button>
      )}
      {!cameraSupported && (
        <p className="text-xs text-muted-foreground">
          Camera scanning needs a browser with barcode-detection support (Chrome/Edge) — Safari on iOS doesn&apos;t
          support it, but manual entry always works, and the native iOS app uses the device camera directly.
        </p>
      )}

      {!isNative && scanning && (
        <div className="overflow-hidden rounded-xl border border-border bg-black">
          <video ref={videoRef} className="aspect-video w-full object-cover" muted playsInline />
        </div>
      )}

      <div className="space-y-2 border-t border-border pt-4">
        <p className="text-sm font-medium">
          No barcode? Browse traditional Greek dishes
        </p>
        <input
          value={dishQuery}
          onChange={(e) => setDishQuery(e.target.value)}
          placeholder="Search dishes (e.g. moussaka, feta, tzatziki)"
          className="w-full rounded-xl border border-border bg-card px-3.5 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring"
        />
        <div className="max-h-56 space-y-1.5 overflow-y-auto">
          {matchingDishes.map((dish) => (
            <button
              key={dish.slug}
              onClick={() => selectGreekDish(dish)}
              className="flex w-full items-center justify-between gap-2 rounded-xl border border-border bg-card px-3 py-2 text-left text-sm transition active:scale-[0.99]"
            >
              <span className="min-w-0 truncate font-medium">{dish.name}</span>
              <span className="shrink-0 text-xs text-muted-foreground">{dish.category}</span>
            </button>
          ))}
          {matchingDishes.length === 0 && (
            <p className="py-2 text-center text-xs text-muted-foreground">No dishes match &quot;{dishQuery}&quot;.</p>
          )}
        </div>
      </div>

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
              ? "Typical values for this dish — real nutrition varies with recipe and portion, so treat this as an estimate."
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
            <p className="mb-2 text-xs uppercase tracking-wide text-primary">Today&apos;s totals</p>
            <NutrientTable profile={totals} />
          </div>
        </div>
      )}
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
