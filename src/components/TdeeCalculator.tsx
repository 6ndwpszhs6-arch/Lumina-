"use client";

import { useState } from "react";
import { db, generateId, saveProfile } from "@/lib/db";
import { calculateTdee, kgToLb, lbToKg, cmToFtIn, ftInToCm } from "@/lib/tdee";
import { ACTIVITY_LEVELS, METABOLIC_CONDITIONS } from "@/lib/types";
import type {
  ActivityLevel,
  Goal,
  MetabolicCondition,
  Sex,
  TdeeLogEntry,
  UnitSystem,
  UserProfile,
} from "@/lib/types";
import { cn, formatDate } from "@/lib/utils";
import { AlertTriangle } from "lucide-react";

interface Props {
  profile: UserProfile | undefined;
  history: TdeeLogEntry[];
  onProfileSaved: (profile: UserProfile) => void;
  onHistoryAdded: (entry: TdeeLogEntry) => void;
}

export default function TdeeCalculator({ profile, history, onProfileSaved, onHistoryAdded }: Props) {
  const [units, setUnits] = useState<UnitSystem>(profile?.units ?? "metric");
  const [sex, setSex] = useState<Sex>(profile?.sex ?? "female");
  const [age, setAge] = useState<string>(profile?.age?.toString() ?? "");
  const [heightCm, setHeightCm] = useState<number | undefined>(profile?.heightCm);
  const [weightKg, setWeightKg] = useState<number | undefined>(profile?.weightKg);
  const [activityLevel, setActivityLevel] = useState<ActivityLevel>(profile?.activityLevel ?? "sedentary");
  const [goal, setGoal] = useState<Goal>(profile?.goal ?? "maintain");
  const [conditions, setConditions] = useState<MetabolicCondition[]>(profile?.conditions ?? []);
  const [result, setResult] = useState<ReturnType<typeof calculateTdee> | null>(null);
  const [error, setError] = useState<string | null>(null);

  const heightFtIn = heightCm ? cmToFtIn(heightCm) : { ft: 5, inches: 6 };
  const weightLb = weightKg ? Math.round(kgToLb(weightKg)) : undefined;

  const hasSensitiveCondition = conditions.some((c) => c === "diabetes_type1" || c === "diabetes_type2" || c === "pku");

  const toggleCondition = (c: MetabolicCondition) => {
    setConditions((prev) => (prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]));
  };

  const handleCalculate = async () => {
    setError(null);
    const ageNum = Number(age);
    if (!ageNum || ageNum <= 0 || ageNum > 120) {
      setError("Please enter a valid age.");
      return;
    }
    if (!heightCm || heightCm <= 0) {
      setError("Please enter a valid height.");
      return;
    }
    if (!weightKg || weightKg <= 0) {
      setError("Please enter a valid weight.");
      return;
    }

    const computed = calculateTdee({ sex, age: ageNum, heightCm, weightKg, activityLevel, goal });
    setResult(computed);

    const savedProfile = await saveProfile({
      sex,
      age: ageNum,
      heightCm,
      weightKg,
      activityLevel,
      goal,
      units,
      conditions,
    });
    onProfileSaved(savedProfile);

    const today = new Date().toISOString().slice(0, 10);
    const existingToday = history.find((h) => h.date === today);
    const entry: TdeeLogEntry = {
      id: existingToday?.id ?? generateId(),
      date: today,
      weightKg,
      goal,
      createdAt: new Date().toISOString(),
      ...computed,
    };
    await db.tdeeHistory.put(entry);
    onHistoryAdded(entry);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-serif text-2xl font-semibold tracking-tight">Your Calorie Target</h2>
        <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
          A couple of details give you a daily calorie and macro target built around your goal — grounded in the
          Mifflin-St Jeor equation used by dietitians.
        </p>
      </div>

      <div className="flex gap-2">
        <SegButton active={units === "metric"} onClick={() => setUnits("metric")} label="Metric (kg/cm)" />
        <SegButton active={units === "imperial"} onClick={() => setUnits("imperial")} label="Imperial (lb/ft)" />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <SegButton active={sex === "female"} onClick={() => setSex("female")} label="Female" />
        <SegButton active={sex === "male"} onClick={() => setSex("male")} label="Male" />
      </div>

      <Field label="Age (years)">
        <input
          type="number"
          inputMode="numeric"
          value={age}
          onChange={(e) => setAge(e.target.value)}
          className="w-full rounded-xl border border-border bg-card px-3 py-2.5 outline-none focus:ring-2 focus:ring-ring"
          placeholder="e.g. 28"
        />
      </Field>

      {units === "metric" ? (
        <Field label="Height (cm)">
          <input
            type="number"
            inputMode="decimal"
            value={heightCm ?? ""}
            onChange={(e) => setHeightCm(e.target.value ? Number(e.target.value) : undefined)}
            className="w-full rounded-xl border border-border bg-card px-3 py-2.5 outline-none focus:ring-2 focus:ring-ring"
            placeholder="e.g. 170"
          />
        </Field>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          <Field label="Height (ft)">
            <input
              type="number"
              inputMode="numeric"
              value={heightFtIn.ft}
              onChange={(e) => setHeightCm(ftInToCm(Number(e.target.value) || 0, heightFtIn.inches))}
              className="w-full rounded-xl border border-border bg-card px-3 py-2.5 outline-none focus:ring-2 focus:ring-ring"
            />
          </Field>
          <Field label="Height (in)">
            <input
              type="number"
              inputMode="numeric"
              value={heightFtIn.inches}
              onChange={(e) => setHeightCm(ftInToCm(heightFtIn.ft, Number(e.target.value) || 0))}
              className="w-full rounded-xl border border-border bg-card px-3 py-2.5 outline-none focus:ring-2 focus:ring-ring"
            />
          </Field>
        </div>
      )}

      <Field label={units === "metric" ? "Weight (kg)" : "Weight (lb)"}>
        <input
          type="number"
          inputMode="decimal"
          value={units === "metric" ? weightKg ?? "" : weightLb ?? ""}
          onChange={(e) => {
            const v = e.target.value ? Number(e.target.value) : undefined;
            setWeightKg(v === undefined ? undefined : units === "metric" ? v : lbToKg(v));
          }}
          className="w-full rounded-xl border border-border bg-card px-3 py-2.5 outline-none focus:ring-2 focus:ring-ring"
          placeholder={units === "metric" ? "e.g. 65" : "e.g. 143"}
        />
      </Field>

      <Field label="Activity level">
        <select
          value={activityLevel}
          onChange={(e) => setActivityLevel(e.target.value as ActivityLevel)}
          className="w-full rounded-xl border border-border bg-card px-3 py-2.5 outline-none focus:ring-2 focus:ring-ring"
        >
          {ACTIVITY_LEVELS.map((a) => (
            <option key={a.value} value={a.value}>
              {a.label}
            </option>
          ))}
        </select>
      </Field>

      <Field label="Goal">
        <div className="grid grid-cols-3 gap-2">
          <SegButton active={goal === "lose"} onClick={() => setGoal("lose")} label="Lose" />
          <SegButton active={goal === "maintain"} onClick={() => setGoal("maintain")} label="Maintain" />
          <SegButton active={goal === "gain"} onClick={() => setGoal("gain")} label="Gain" />
        </div>
      </Field>

      <Field label="Metabolic conditions (optional)">
        <div className="flex flex-wrap gap-2">
          {METABOLIC_CONDITIONS.map((c) => (
            <button
              key={c.value}
              type="button"
              onClick={() => toggleCondition(c.value)}
              className={cn(
                "rounded-full border px-3 py-1.5 text-sm transition",
                conditions.includes(c.value)
                  ? "border-primary bg-primary/15 text-primary"
                  : "border-border bg-card text-muted-foreground"
              )}
            >
              {c.label}
            </button>
          ))}
        </div>
      </Field>

      {hasSensitiveCondition && (
        <div className="flex gap-2 rounded-xl border border-warning/40 bg-warning/10 p-3 text-sm text-warning">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <p>
            These are general estimates only. With diabetes or PKU, calorie and macro needs should be individualized
            by your endocrinologist or metabolic dietitian — please don&apos;t treat this as a prescribed target.
          </p>
        </div>
      )}

      {error && <p className="text-sm text-danger">{error}</p>}

      <button
        onClick={handleCalculate}
        className="w-full rounded-xl bg-primary py-3 font-medium text-primary-foreground transition active:scale-[0.99]"
      >
        Calculate
      </button>

      {result && (
        <div className="space-y-5 rounded-2xl border border-border bg-card p-6">
          <div className="text-center">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Your daily target</p>
            <p className="mt-2 font-serif text-5xl font-semibold tracking-tight text-primary">
              {result.targetCalories}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">calories per day</p>
          </div>
          <div className="grid grid-cols-2 gap-3 border-t border-border pt-5 text-sm">
            <Stat label="BMR" value={`${result.bmr} kcal`} />
            <Stat label="TDEE" value={`${result.tdee} kcal`} />
          </div>
          <div className="grid grid-cols-3 gap-3 text-sm">
            <Stat label="Protein" value={`${result.proteinG} g`} />
            <Stat label="Fat" value={`${result.fatG} g`} />
            <Stat label="Carbs" value={`${result.carbsG} g`} />
          </div>
        </div>
      )}

      {history.length > 0 && (
        <div>
          <h3 className="mb-2 text-sm font-medium text-muted-foreground">History</h3>
          <div className="space-y-2">
            {history
              .slice()
              .sort((a, b) => b.date.localeCompare(a.date))
              .slice(0, 7)
              .map((h) => (
                <div
                  key={h.id}
                  className="flex items-center justify-between rounded-xl border border-border bg-card px-3 py-2 text-sm"
                >
                  <span className="text-muted-foreground">{formatDate(h.date)}</span>
                  <span>
                    {units === "metric"
                      ? `${h.weightKg} kg`
                      : `${Math.round(kgToLb(h.weightKg) * 10) / 10} lb`}
                  </span>
                  <span className="font-medium">{h.targetCalories} kcal</span>
                </div>
              ))}
          </div>
        </div>
      )}

      <p className="pb-4 text-center text-xs text-muted-foreground">
        Educational estimate only — not medical advice. Consult a healthcare professional for personalized guidance.
      </p>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-sm font-medium text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}

function SegButton({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-xl border px-3 py-2.5 text-sm font-medium transition",
        active ? "border-primary bg-primary/15 text-primary" : "border-border bg-card text-muted-foreground"
      )}
    >
      {label}
    </button>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-secondary p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-0.5 font-semibold">{value}</p>
    </div>
  );
}
