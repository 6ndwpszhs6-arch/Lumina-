"use client";

import { useEffect, useState } from "react";
import { db, seedDemoDataIfEmpty, ensureSettings } from "@/lib/db";
import type { Task, Habit, Note, Goal, Expense } from "@/lib/types";
import { formatDate, isToday, isOverdue, cn } from "@/lib/utils";
import {
  CheckCircle2,
  Circle,
  Calendar,
  Target,
  ListTodo,
  Flame,
  Plus,
  Sparkles,
  Menu,
  Home,
  BarChart3,
  Settings,
} from "lucide-react";

type Tab = "today" | "tasks" | "habits" | "notes" | "goals" | "budget" | "more";

export default function HomePage() {
  const [ready, setReady] = useState(false);
  const [tab, setTab] = useState<Tab>("today");
  const [tasks, setTasks] = useState<Task[]>([]);
  const [habits, setHabits] = useState<Habit[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [userName, setUserName] = useState("there");

  useEffect(() => {
    async function init() {
      await seedDemoDataIfEmpty();
      const settings = await ensureSettings();
      if (settings.name) setUserName(settings.name);

      const [t, h, n, g, e] = await Promise.all([
        db.tasks.orderBy("updatedAt").reverse().toArray(),
        db.habits.filter((x) => !x.archived).toArray(),
        db.notes.orderBy("updatedAt").reverse().toArray(),
        db.goals.filter((x) => x.status === "active").toArray(),
        db.expenses.orderBy("date").reverse().limit(20).toArray(),
      ]);
      setTasks(t);
      setHabits(h);
      setNotes(n);
      setGoals(g);
      setExpenses(e);
      setReady(true);
    }
    init();
  }, []);

  const todayTasks = tasks.filter(
    (t) =>
      t.status !== "done" &&
      t.status !== "cancelled" &&
      (t.dueDate ? isToday(t.dueDate) || isOverdue(t.dueDate) : true)
  );

  const toggleTask = async (task: Task) => {
    const newStatus = task.status === "done" ? "todo" : "done";
    await db.tasks.update(task.id, {
      status: newStatus,
      completedAt: newStatus === "done" ? new Date().toISOString() : undefined,
      updatedAt: new Date().toISOString(),
    });
    setTasks((prev) =>
      prev.map((t) =>
        t.id === task.id
          ? {
              ...t,
              status: newStatus,
              completedAt:
                newStatus === "done" ? new Date().toISOString() : undefined,
            }
          : t
      )
    );
  };

  const completeHabitToday = async (habit: Habit) => {
    const today = new Date().toISOString().slice(0, 10);
    const existing = await db.habitLogs
      .where({ habitId: habit.id, date: today })
      .first();

    if (existing) {
      await db.habitLogs.update(existing.id, { completed: !existing.completed });
    } else {
      await db.habitLogs.add({
        id: crypto.randomUUID(),
        habitId: habit.id,
        date: today,
        completed: true,
        createdAt: new Date().toISOString(),
      });
    }

    const newStreak = (habit.currentStreak || 0) + 1;
    await db.habits.update(habit.id, {
      currentStreak: newStreak,
      longestStreak: Math.max(habit.longestStreak || 0, newStreak),
      lastCompletedDate: today,
      updatedAt: new Date().toISOString(),
    });
    setHabits((prev) =>
      prev.map((h) =>
        h.id === habit.id
          ? {
              ...h,
              currentStreak: newStreak,
              longestStreak: Math.max(h.longestStreak || 0, newStreak),
              lastCompletedDate: today,
            }
          : h
      )
    );
  };

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground">Loading Lumina…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-md safe-top">
        <div className="mx-auto flex h-14 max-w-lg items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/20">
              <Sparkles className="h-4 w-4 text-primary" />
            </div>
            <h1 className="text-base font-semibold tracking-tight">Lumina</h1>
          </div>
          <button className="rounded-full p-2 text-muted-foreground hover:bg-accent hover:text-foreground">
            <Settings className="h-5 w-5" />
          </button>
        </div>
      </header>

      <main className="mx-auto w-full max-w-lg flex-1 overflow-y-auto px-4 pb-24 pt-4">
        {tab === "today" && (
          <div className="space-y-6">
            <section>
              <p className="text-sm text-muted-foreground">Good day,</p>
              <h2 className="text-2xl font-semibold tracking-tight">{userName}</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {new Date().toLocaleDateString(undefined, {
                  weekday: "long",
                  month: "long",
                  day: "numeric",
                })}
              </p>
            </section>

            <section className="grid grid-cols-3 gap-3">
              <StatCard
                label="Tasks"
                value={todayTasks.length}
                icon={<ListTodo className="h-4 w-4" />}
                color="text-blue-400"
              />
              <StatCard
                label="Habits"
                value={habits.length}
                icon={<Flame className="h-4 w-4" />}
                color="text-orange-400"
              />
              <StatCard
                label="Goals"
                value={goals.length}
                icon={<Target className="h-4 w-4" />}
                color="text-violet-400"
              />
            </section>

            <section>
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-medium text-muted-foreground">
                  Today&apos;s focus
                </h3>
              </div>
              <div className="space-y-2">
                {todayTasks.length === 0 ? (
                  <EmptyState text="No tasks for today. Enjoy the calm ✨" />
                ) : (
                  todayTasks.slice(0, 6).map((task) => (
                    <TaskRow
                      key={task.id}
                      task={task}
                      onToggle={() => toggleTask(task)}
                    />
                  ))
                )}
              </div>
            </section>

            <section>
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-medium text-muted-foreground">Habits</h3>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {habits.slice(0, 4).map((habit) => (
                  <HabitCard
                    key={habit.id}
                    habit={habit}
                    onComplete={() => completeHabitToday(habit)}
                  />
                ))}
              </div>
            </section>

            {notes.filter((n) => n.pinned).length > 0 && (
              <section>
                <h3 className="mb-3 text-sm font-medium text-muted-foreground">
                  Pinned notes
                </h3>
                <div className="space-y-2">
                  {notes
                    .filter((n) => n.pinned)
                    .slice(0, 2)
                    .map((note) => (
                      <div
                        key={note.id}
                        className="rounded-xl border border-border bg-card p-3"
                      >
                        <p className="font-medium">{note.title}</p>
                        <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                          {note.content.replace(/[#*`]/g, "").slice(0, 100)}
                        </p>
                      </div>
                    ))}
                </div>
              </section>
            )}

            {goals.length > 0 && (
              <section>
                <h3 className="mb-3 text-sm font-medium text-muted-foreground">
                  Active goals
                </h3>
                <div className="space-y-2">
                  {goals.slice(0, 3).map((goal) => (
                    <GoalCard key={goal.id} goal={goal} />
                  ))}
                </div>
              </section>
            )}
          </div>
        )}

        {tab === "tasks" && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">All Tasks</h2>
            <div className="space-y-2">
              {tasks
                .filter((t) => t.status !== "done" && t.status !== "cancelled")
                .map((task) => (
                  <TaskRow
                    key={task.id}
                    task={task}
                    onToggle={() => toggleTask(task)}
                  />
                ))}
            </div>
          </div>
        )}

        {tab === "habits" && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">Habits</h2>
            <div className="grid gap-3">
              {habits.map((habit) => (
                <HabitCard
                  key={habit.id}
                  habit={habit}
                  onComplete={() => completeHabitToday(habit)}
                  large
                />
              ))}
            </div>
          </div>
        )}

        {tab === "notes" && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">Notes</h2>
            <div className="space-y-2">
              {notes.map((note) => (
                <div
                  key={note.id}
                  className="rounded-xl border border-border bg-card p-4"
                >
                  <div className="flex items-start justify-between">
                    <p className="font-medium">{note.title}</p>
                    {note.pinned && (
                      <span className="text-xs text-primary">Pinned</span>
                    )}
                  </div>
                  <p className="mt-2 line-clamp-3 text-sm text-muted-foreground">
                    {note.content.replace(/[#*`]/g, "")}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === "goals" && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">Goals</h2>
            <div className="space-y-3">
              {goals.map((goal) => (
                <GoalCard key={goal.id} goal={goal} />
              ))}
            </div>
          </div>
        )}

        {tab === "budget" && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">Budget</h2>
            <p className="text-sm text-muted-foreground">
              Recent expenses (add some to see them here)
            </p>
            {expenses.length === 0 ? (
              <EmptyState text="No expenses logged yet" />
            ) : (
              <div className="space-y-2">
                {expenses.map((e) => (
                  <div
                    key={e.id}
                    className="flex items-center justify-between rounded-xl border border-border bg-card p-3"
                  >
                    <div>
                      <p className="font-medium">{e.description}</p>
                      <p className="text-xs text-muted-foreground">
                        {e.category} · {formatDate(e.date)}
                      </p>
                    </div>
                    <p className="font-semibold text-danger">
                      -{e.amount} {e.currency}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === "more" && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">More</h2>
            <div className="grid gap-2">
              <MenuItem
                icon={<Calendar className="h-5 w-5" />}
                label="Calendar"
                onClick={() => {}}
              />
              <MenuItem
                icon={<BarChart3 className="h-5 w-5" />}
                label="Weekly Review"
                onClick={() => {}}
              />
              <MenuItem
                icon={<Sparkles className="h-5 w-5" />}
                label="AI Assistant"
                onClick={() => {}}
              />
              <MenuItem
                icon={<ListTodo className="h-5 w-5" />}
                label="Notes"
                onClick={() => setTab("notes")}
              />
              <MenuItem
                icon={<Target className="h-5 w-5" />}
                label="Goals"
                onClick={() => setTab("goals")}
              />
              <MenuItem
                icon={<Settings className="h-5 w-5" />}
                label="Settings"
                onClick={() => {}}
              />
            </div>
            <p className="mt-8 text-center text-xs text-muted-foreground">
              Lumina v0.1 · Offline-first · Built for iOS & Android
            </p>
          </div>
        )}
      </main>

      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-background/90 backdrop-blur-lg safe-bottom">
        <div className="mx-auto flex max-w-lg items-center justify-around px-2 py-2">
          <NavButton
            active={tab === "today"}
            onClick={() => setTab("today")}
            icon={<Home className="h-5 w-5" />}
            label="Today"
          />
          <NavButton
            active={tab === "tasks"}
            onClick={() => setTab("tasks")}
            icon={<ListTodo className="h-5 w-5" />}
            label="Tasks"
          />
          <button
            className="flex h-12 w-12 -translate-y-2 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/30"
            aria-label="Add"
          >
            <Plus className="h-6 w-6" />
          </button>
          <NavButton
            active={tab === "habits"}
            onClick={() => setTab("habits")}
            icon={<Flame className="h-5 w-5" />}
            label="Habits"
          />
          <NavButton
            active={tab === "more"}
            onClick={() => setTab("more")}
            icon={<Menu className="h-5 w-5" />}
            label="More"
          />
        </div>
      </nav>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon,
  color,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  color: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-3">
      <div className={cn("mb-1", color)}>{icon}</div>
      <p className="text-xl font-semibold">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

function TaskRow({ task, onToggle }: { task: Task; onToggle: () => void }) {
  const overdue =
    task.dueDate && isOverdue(task.dueDate) && task.status !== "done";
  return (
    <div className="flex items-start gap-3 rounded-xl border border-border bg-card p-3">
      <button onClick={onToggle} className="mt-0.5 shrink-0">
        {task.status === "done" ? (
          <CheckCircle2 className="h-5 w-5 text-success" />
        ) : (
          <Circle className="h-5 w-5 text-muted-foreground" />
        )}
      </button>
      <div className="min-w-0 flex-1">
        <p
          className={cn(
            "font-medium leading-snug",
            task.status === "done" && "text-muted-foreground line-through"
          )}
        >
          {task.title}
        </p>
        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          {task.dueDate && (
            <span className={cn(overdue && "text-danger")}>
              {formatDate(task.dueDate)}
            </span>
          )}
          {(task.priority === "high" || task.priority === "urgent") && (
            <span className="rounded bg-danger/15 px-1.5 py-0.5 text-danger">
              {task.priority}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function HabitCard({
  habit,
  onComplete,
  large,
}: {
  habit: Habit;
  onComplete: () => void;
  large?: boolean;
}) {
  const doneToday =
    habit.lastCompletedDate === new Date().toISOString().slice(0, 10);
  return (
    <button
      onClick={onComplete}
      className={cn(
        "flex flex-col items-start rounded-xl border border-border bg-card p-3 text-left transition active:scale-[0.98]",
        large && "p-4",
        doneToday && "border-success/40 bg-success/5"
      )}
    >
      <div className="flex w-full items-center justify-between">
        <span
          className="h-2.5 w-2.5 rounded-full"
          style={{ backgroundColor: habit.color }}
        />
        {doneToday ? (
          <CheckCircle2 className="h-4 w-4 text-success" />
        ) : (
          <Circle className="h-4 w-4 text-muted-foreground" />
        )}
      </div>
      <p className={cn("mt-2 font-medium", large && "text-base")}>
        {habit.title}
      </p>
      <p className="mt-1 text-xs text-muted-foreground">
        🔥 {habit.currentStreak} day streak
      </p>
    </button>
  );
}

function GoalCard({ goal }: { goal: Goal }) {
  const progress =
    goal.targetValue && goal.targetValue > 0
      ? Math.min(100, Math.round((goal.currentValue / goal.targetValue) * 100))
      : 0;
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-start justify-between">
        <p className="font-medium">{goal.title}</p>
        <span className="text-sm font-semibold text-primary">{progress}%</span>
      </div>
      {goal.targetValue != null && (
        <>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-secondary">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="mt-1.5 text-xs text-muted-foreground">
            {goal.currentValue} / {goal.targetValue} {goal.unit}
          </p>
        </>
      )}
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-xl border border-dashed border-border py-8 text-center text-sm text-muted-foreground">
      {text}
    </div>
  );
}

function NavButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex flex-col items-center gap-0.5 rounded-lg px-3 py-1.5 text-xs transition",
        active ? "text-primary" : "text-muted-foreground"
      )}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}

function MenuItem({
  icon,
  label,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex w-full items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 text-left transition active:scale-[0.99]"
    >
      <span className="text-muted-foreground">{icon}</span>
      <span className="font-medium">{label}</span>
    </button>
  );
}
