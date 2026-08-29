"use client";

import { useState } from "react";
import { generateId } from "@/lib/db";
import { addTdeeEntrySynced, saveProfileSynced } from "@/lib/sync";
import { calculateTdee, kgToLb, cmToFtIn } from "@/lib/tdee";
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
import { useCountUp } from "@/lib/useCountUp";
import { AlertTriangle, Check } from "lucide-react";

interface Props {
  profile: UserProfile | undefined;
  history: TdeeLogEntry[];
  onProfileSaved: (profile: UserProfile) => void;
  onHistoryAdded: (entry: TdeeLogEntry) => void;
}

export default function TdeeCalculator({ profile, history, onProfileSaved, onHistoryAdded }: Props) {
  const [units, setUnits] = useState<UnitSystem>(profile?.units ?? "metric");
  const [sex, setSex] = useState<Sex>(profile?.sex ?? "female");
  const [age, setAge] = useState(profile?.age ?? 28);
  const [heightCm, setHeightCm] = useState(profile?.heightCm ?? 168);
  const [weightKg, setWeightKg] = useState(profile?.weightKg ?? 65);
  const [activityLevel, setActivityLevel] = useState<ActivityLevel>(profile?.activityLevel ?? "sedentary");
  const [goal, setGoal] = useState<Goal>(profile?.goal ?? "maintain");
  const [conditions, setConditions] = useState<MetabolicCondition[]>(profile?.conditions ?? []);
  const [saved, setSaved] = useState(false);

  // Recomputes on every slider drag / segment tap — no "Calculate" step to
  // see your target; the button below only persists it as today's log entry.
  const result = calculateTdee({ sex, age, heightCm, weightKg, activityLevel, goal });
  const animatedTarget = useCountUp(result.targetCalories);

  const heightFtIn = cmToFtIn(heightCm);
  const weightLb = Math.round(kgToLb(weightKg));

  const hasSensitiveCondition = conditions.some((c) => c === "diabetes_type1" || c === "diabetes_type2" || c === "pku");

  const toggleCondition = (c: MetabolicCondition) => {
    setConditions((prev) => (prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]));
    setSaved(false);
  };

  const handleSave = async () => {
    const savedProfile = await saveProfileSynced({
      sex,
      age,
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
      ...result,
    };
    await addTdeeEntrySynced(entry);
    onHistoryAdded(entry);
    setSaved(true);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-serif text-2xl font-semibold tracking-tight">Your Calorie Target</h2>
        <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
          Drag the sliders — your target recalculates instantly, grounded in the Mifflin-St Jeor equation used by
          dietitians.
        </p>
      </div>

      {/* Live result */}
      <div className="rounded-2xl border border-border bg-card p-6 text-center">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Daily target</p>
        <p className="mt-2 font-serif text-5xl font-semibold tracking-tight text-primary tabular-nums">
          {animatedTarget}
        </p>
        <p className="mt-1 text-sm text-muted-foreground">calories per day</p>
        <div className="mt-5 grid grid-cols-3 gap-3 border-t border-border pt-5 text-sm">
          <Stat label="Protein" value={`${result.proteinG} g`} />
          <Stat label="Fat" value={`${result.fatG} g`} />
          <Stat label="Carbs" value={`${result.carbsG} g`} />
        </div>
        <p className="mt-4 text-xs text-muted-foreground">
          BMR {result.bmr} kcal &middot; TDEE {result.tdee} kcal
        </p>
      </div>

      <div className="flex gap-2">
        <SegButton
          active={units === "metric"}
          onClick={() => setUnits("metric")}
          label="Metric (kg/cm)"
        />
        <SegButton
          active={units === "imperial"}
          onClick={() => setUnits("imperial")}
          label="Imperial (lb/ft)"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <SegButton active={sex === "female"} onClick={() => setSex("female")} label="Female" />
        <SegButton active={sex === "male"} onClick={() => setSex("male")} label="Male" />
      </div>

      <Slider
        label="Age"
        readout={`${age} yrs`}
        value={age}
        min={16}
        max={90}
        step={1}
        onChange={(v) => {
          setAge(v);
          setSaved(false);
        }}
      />

      <Slider
        label="Height"
        readout={units === "metric" ? `${heightCm} cm` : `${heightFtIn.ft}′${heightFtIn.inches}″`}
        value={heightCm}
        min={140}
        max={205}
        step={1}
        onChange={(v) => {
          setHeightCm(v);
          setSaved(false);
        }}
      />

      <Slider
        label="Weight"
        readout={units === "metric" ? `${weightKg} kg` : `${weightLb} lb`}
        value={weightKg}
        min={40}
        max={160}
        step={0.5}
        onChange={(v) => {
          setWeightKg(v);
          setSaved(false);
        }}
      />

      <div>
        <p className="mb-2 text-sm font-medium text-muted-foreground">Activity level</p>
        <div className="space-y-1.5">
          {ACTIVITY_LEVELS.map((a) => (
            <ActivityRow
              key={a.value}
              active={activityLevel === a.value}
              label={a.label}
              onClick={() => {
                setActivityLevel(a.value);
                setSaved(false);
              }}
            />
          ))}
        </div>
      </div>

      <div>
        <p className="mb-2 text-sm font-medium text-muted-foreground">Goal</p>
        <div className="grid grid-cols-3 gap-2">
          <SegButton active={goal === "lose"} onClick={() => { setGoal("lose"); setSaved(false); }} label="Lose" />
          <SegButton active={goal === "maintain"} onClick={() => { setGoal("maintain"); setSaved(false); }} label="Maintain" />
          <SegButton active={goal === "gain"} onClick={() => { setGoal("gain"); setSaved(false); }} label="Gain" />
        </div>
      </div>

      <div>
        <p className="mb-2 text-sm font-medium text-muted-foreground">Metabolic conditions (optional)</p>
        <div className="flex flex-wrap gap-2">
          {METABOLIC_CONDITIONS.map((c) => (
            <button
              key={c.value}
              type="button"
              onClick={() => toggleCondition(c.value)}
              className={cn(
                "rounded-full border px-3 py-1.5 text-sm transition active:scale-95",
                conditions.includes(c.value)
                  ? "border-primary bg-primary/15 text-primary"
                  : "border-border bg-card text-muted-foreground"
              )}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>

      {hasSensitiveCondition && (
        <div className="flex gap-2 rounded-xl border border-warning/40 bg-warning/10 p-3 text-sm text-warning">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <p>
            These are general estimates only. With diabetes or PKU, calorie and macro needs should be individualized
            by your endocrinologist or metabolic dietitian — please don&apos;t treat this as a prescribed target.
          </p>
        </div>
      )}

      <button
        onClick={handleSave}
        disabled={saved}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 font-medium text-primary-foreground transition active:scale-[0.99] disabled:opacity-60"
      >
        {saved ? (
          <>
            <Check className="h-4 w-4" /> Saved to today&apos;s log
          </>
        ) : (
          "Save as today's target"
        )}
      </button>

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

function SegButton({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "min-h-11 flex-1 rounded-xl border px-3 py-2.5 text-sm font-medium transition active:scale-[0.98]",
        active ? "border-primary bg-primary/15 text-primary" : "border-border bg-card text-muted-foreground"
      )}
    >
      {label}
    </button>
  );
}

function ActivityRow({ active, label, onClick }: { active: boolean; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex min-h-11 w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left text-sm transition",
        active ? "border-primary bg-primary/10" : "border-border bg-card"
      )}
    >
      <span
        className={cn(
          "h-4 w-4 shrink-0 rounded-full border-[1.5px] transition",
          active ? "border-primary bg-primary" : "border-border"
        )}
      />
      <span className="flex-1">{label}</span>
    </button>
  );
}

function Slider({
  label,
  readout,
  value,
  min,
  max,
  step,
  onChange,
}: {
  label: string;
  readout: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-semibold tabular-nums">{readout}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="metabo-slider w-full"
      />
    </div>
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
