"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type Habit = {
  id: string;
  name: string;
  completedAt: string | null;
  createdAt?: string;
  completionCount?: number;
  completionDates?: string[];
};

type AuthUser = {
  id: string;
  email: string;
};

const toDateInputValue = (date: Date) => {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const parseDateInputValue = (value: string) => {
  const [year, month, day] = value.split("-").map((part) => Number(part));
  if (!year || !month || !day) {
    return null;
  }

  return new Date(year, month - 1, day);
};

const toCompletionTimestamp = (date: Date) => {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 12, 0, 0).toISOString();
};

const toMonthInputValue = (date: Date) => {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  return `${year}-${month}`;
};

const parseMonthInputValue = (value: string) => {
  const [year, month] = value.split("-").map((part) => Number(part));
  if (!year || !month) {
    return null;
  }

  return new Date(year, month - 1, 1);
};

const getDaysInMonth = (date: Date) => {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
};

const getDaysInYear = (date: Date) => {
  return new Date(date.getFullYear(), 11, 31).getDate();
};

const isSameLocalDate = (left: string, right: string | Date) => {
  const leftDate = new Date(left);
  const rightDate = right instanceof Date ? right : new Date(right);

  if (Number.isNaN(leftDate.getTime()) || Number.isNaN(rightDate.getTime())) {
    return false;
  }

  return (
    leftDate.getFullYear() === rightDate.getFullYear() &&
    leftDate.getMonth() === rightDate.getMonth() &&
    leftDate.getDate() === rightDate.getDate()
  );
};

const parseStoredAuthUser = (): AuthUser | null => {
  try {
    const raw = localStorage.getItem("wellness-auth-user");
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as Partial<AuthUser>;
    if (!parsed?.id || !parsed?.email) {
      return null;
    }

    return { id: parsed.id, email: parsed.email };
  } catch {
    return null;
  }
};

export default function HabitsPage() {
  const router = useRouter();
  const authUser = React.useMemo(
    () => (typeof window === "undefined" ? null : parseStoredAuthUser()),
    []
  );

  const [isClient, setIsClient] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(true);
  const [habits, setHabits] = React.useState<Habit[]>([]);
  const [habitName, setHabitName] = React.useState("");
  const [showHabitForm, setShowHabitForm] = React.useState(false);
  const [selectedPeriod, setSelectedPeriod] = React.useState<"day" | "month" | "year" | "all">("day");
  const [selectedDay, setSelectedDay] = React.useState(() => toDateInputValue(new Date()));
  const [selectedMonth, setSelectedMonth] = React.useState(() => toMonthInputValue(new Date()));
  const filteredCompletionDates = React.useMemo(() => {
    return habits.flatMap((habit) => habit.completionDates || []);
  }, [habits]);

  const selectedDayDate = React.useMemo(() => parseDateInputValue(selectedDay), [selectedDay]);

  const selectedDayHabitSummaries = React.useMemo(() => {
    if (!selectedDayDate) {
      return habits.map((habit) => ({ ...habit, completedOnSelectedDay: false, selectedDayCompletionCount: 0 }));
    }

    return habits.map((habit) => {
      const completionDates = habit.completionDates || [];
      const selectedDayCompletionCount = completionDates.filter((dateStr) => isSameLocalDate(dateStr, selectedDayDate)).length;

      return {
        ...habit,
        completedOnSelectedDay: selectedDayCompletionCount > 0,
        selectedDayCompletionCount,
      };
    });
  }, [habits, selectedDayDate]);

  const selectedDayCompletionCount = React.useMemo(() => {
    return selectedDayHabitSummaries.filter((habit) => habit.completedOnSelectedDay).length;
  }, [selectedDayHabitSummaries]);

  const selectedMonthDate = React.useMemo(() => parseMonthInputValue(selectedMonth), [selectedMonth]);

  const selectedMonthSeries = React.useMemo(() => {
    if (!selectedMonthDate) {
      return [] as { day: number; count: number }[];
    }

    const daysInMonth = getDaysInMonth(selectedMonthDate);
    const counts = Array.from({ length: daysInMonth }, (_, index) => ({ day: index + 1, count: 0 }));

    habits.forEach((habit) => {
      (habit.completionDates || []).forEach((dateStr) => {
        const date = new Date(dateStr);
        if (Number.isNaN(date.getTime())) {
          return;
        }

        if (date.getFullYear() === selectedMonthDate.getFullYear() && date.getMonth() === selectedMonthDate.getMonth()) {
          const idx = date.getDate() - 1;
          if (idx >= 0 && idx < counts.length) {
            counts[idx].count += 1;
          }
        }
      });
    });

    return counts;
  }, [habits, selectedMonthDate]);

  const selectedMonthMax = React.useMemo(() => {
    return Math.max(1, habits.length);
  }, [habits.length]);

  const selectedMonthTicks = React.useMemo(() => {
    const max = selectedMonthMax;
    const steps = 4;
    const increment = Math.max(1, Math.ceil(max / steps));
    const values = Array.from({ length: steps + 1 }, (_, index) => Math.max(0, max - increment * index));
    if (!values.includes(0)) {
      values.push(0);
    }

    return Array.from(new Set(values)).sort((a, b) => b - a);
  }, [selectedMonthMax]);

  const completedHabitCount = selectedDayCompletionCount;
  const habitProgress = habits.length ? Math.round((selectedDayCompletionCount / habits.length) * 100) : 0;

  const selectedDayLabel = React.useMemo(() => {
    if (!selectedDayDate) {
      return "Selected day";
    }

    return selectedDayDate.toLocaleDateString(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }, [selectedDayDate]);

  const filteredCompletionCount = React.useMemo(() => {
    const baseDate = selectedDayDate || new Date();
    const startOfDay = new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate());
    const startOfMonth = new Date(baseDate.getFullYear(), baseDate.getMonth(), 1);
    const startOfYear = new Date(baseDate.getFullYear(), 0, 1);

    return filteredCompletionDates.filter((dateStr) => {
      const date = new Date(dateStr);
      if (Number.isNaN(date.getTime())) {
        return false;
      }

      if (selectedPeriod === "day") {
        return isSameLocalDate(dateStr, startOfDay);
      }

      if (selectedPeriod === "month") {
        return date >= startOfMonth;
      }

      if (selectedPeriod === "year") {
        return date >= startOfYear;
      }

      return true;
    }).length;
  }, [filteredCompletionDates, selectedPeriod, selectedDayDate]);

  const selectedPeriodHabits = React.useMemo(() => {
    const baseDate = selectedDayDate || new Date();
    const startOfDay = new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate());
    const startOfMonth = new Date(baseDate.getFullYear(), baseDate.getMonth(), 1);
    const startOfYear = new Date(baseDate.getFullYear(), 0, 1);

    return habits.map((habit) => {
      const count = (habit.completionDates || []).filter((dateStr) => {
        const date = new Date(dateStr);
        if (Number.isNaN(date.getTime())) return false;
        if (selectedPeriod === "day") return isSameLocalDate(dateStr, startOfDay);
        if (selectedPeriod === "month") return date >= startOfMonth;
        if (selectedPeriod === "year") return date >= startOfYear;
        return true;
      }).length;

      return { ...habit, periodCompletionCount: count };
    });
  }, [habits, selectedPeriod, selectedDayDate]);

  const selectedPeriodHabitCount = React.useMemo(() => {
    return selectedPeriodHabits.reduce((sum, habit) => sum + ((habit as Habit & { periodCompletionCount?: number }).periodCompletionCount || 0), 0);
  }, [selectedPeriodHabits]);

  const selectedPeriodLabel = () => {
    if (selectedPeriod === "day") return selectedDayLabel;
    if (selectedPeriod === "month") return "This month";
    if (selectedPeriod === "year") return "This year";
    return "All time";
  };

  const selectedPeriodTotalCount = React.useMemo(() => {
    const baseDate = selectedDayDate || new Date();

    if (selectedPeriod === "day") {
      return habits.length;
    }

    if (selectedPeriod === "month") {
      return habits.length * getDaysInMonth(baseDate);
    }

    if (selectedPeriod === "year") {
      return habits.length * getDaysInYear(baseDate);
    }

    const candidateDates = habits
      .flatMap((habit) => [habit.createdAt, ...(habit.completionDates || [])])
      .filter((value): value is string => typeof value === "string")
      .map((value) => new Date(value))
      .filter((date) => !Number.isNaN(date.getTime()));

    if (candidateDates.length === 0) {
      return habits.length;
    }

    const earliest = new Date(Math.min(...candidateDates.map((date) => date.getTime())));
    const today = new Date();
    const diffDays = Math.max(
      1,
      Math.ceil((today.getTime() - new Date(earliest.getFullYear(), earliest.getMonth(), earliest.getDate()).getTime()) / 86400000) + 1
    );

    return habits.length * diffDays;
  }, [habits, selectedDayDate, selectedPeriod]);

  const chartHeight = 96;


  const loadHabits = async () => {
    if (!authUser) {
      return;
    }

    const res = await fetch(`/api/habits?userId=${encodeURIComponent(authUser.id)}`);
    if (!res.ok) {
      return;
    }

    const data = (await res.json()) as Habit[];
    setHabits(Array.isArray(data) ? data : []);
  };

  React.useEffect(() => {
    setIsClient(true);
  }, []);

  React.useEffect(() => {
    if (!authUser) {
      router.replace("/login");
      return;
    }

    const load = async () => {
      setIsLoading(true);
      await loadHabits();
      setIsLoading(false);
    };

    void load();
  }, [authUser, router]);

  const handleAddHabit = async () => {
    if (!authUser || !habitName.trim()) {
      return;
    }

    const res = await fetch("/api/habits", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: authUser.id, name: habitName.trim() }),
    });

    if (!res.ok) {
      return;
    }

    const created = (await res.json()) as Habit;
    setHabits((prev) => [...prev, created]);
    setHabitName("");
    setShowHabitForm(false);
  };

  const toggleHabit = async (habit: Habit & { completedOnSelectedDay?: boolean }) => {
    if (!authUser || !selectedDayDate) {
      return;
    }

    const completionDate = toCompletionTimestamp(selectedDayDate);
    const markComplete = !habit.completedOnSelectedDay;
    const res = await fetch(`/api/habits/${habit.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: authUser.id, completionDate, markComplete }),
    });

    if (!res.ok) {
      return;
    }

    const updated = (await res.json()) as Habit;
    setHabits((prev) =>
      prev.map((item) => {
        if (item.id !== habit.id) {
          return item;
        }

        const existingDates = item.completionDates || [];
        const nextDates = markComplete
          ? existingDates.some((dateStr) => isSameLocalDate(dateStr, completionDate))
            ? existingDates
            : [...existingDates, completionDate]
          : existingDates.filter((dateStr) => !isSameLocalDate(dateStr, completionDate));

        return {
          ...item,
          ...updated,
          completedAt: markComplete ? completionDate : null,
          completionDates: nextDates,
          completionCount: nextDates.length,
        };
      })
    );
  };

  const handleDeleteHabit = async (habit: Habit) => {
    if (!authUser) {
      return;
    }

    const res = await fetch(`/api/habits/${habit.id}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: authUser.id }),
    });

    if (!res.ok) {
      return;
    }

    setHabits((prev) => prev.filter((item) => item.id !== habit.id));
  };

  const logout = () => {
    localStorage.removeItem("wellness-auth-user");
    router.push("/login");
  };

  if (!isClient) {
    return (
      <div className="app-shell">
        <div className="card text-center">
          <p>Loading your habits...</p>
        </div>
      </div>
    );
  }

  if (!authUser) {
    return (
      <div className="app-shell">
        <div className="card text-center">
          <p>Redirecting to login...</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="app-shell">
        <div className="card text-center">
          <p>Loading your habits...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      {showHabitForm && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center">
          <div className="w-full max-w-md rounded-xl bg-white p-4 shadow-xl dark:bg-slate-900">
            <div className="flex items-center justify-between gap-2 border-b border-slate-200 pb-3 dark:border-slate-700">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">New Habit</p>
                <h3 className="text-base font-semibold">Create a habit</h3>
              </div>
              <button className="btn btn-secondary text-xs" onClick={() => setShowHabitForm(false)}>
                Close
              </button>
            </div>

            <div className="mt-4 space-y-3">
              <div>
                <label className="form-label">Habit name</label>
                <input
                  className="form-input text-sm"
                  value={habitName}
                  onChange={(e) => setHabitName(e.target.value)}
                  placeholder="Drink water"
                />
              </div>
            </div>

        <div className="mt-5 flex gap-2 justify-end">
            <button className="btn btn-secondary text-xs sm:text-sm" onClick={() => setShowHabitForm(false)}>
                Cancel
            </button>
              <button
                className="btn btn-secondary text-xs sm:text-sm"
                onClick={handleAddHabit}
                disabled={!habitName.trim()}
              >
                Add habit
              </button>
            </div>
          </div>
        </div>
      )}
      <header className="sticky top-0 z-40 bg-gradient-to-r from-emerald-500 to-sky-500 text-white shadow-lg">
        <div className="container-responsive pt-5 pb-1">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h1 className="text-lg font-bold md:text-2xl">Daily Habits</h1>
              <p className="hidden text-xs text-emerald-100 sm:block">Track your routines separate from workouts.</p>
            </div>
            <div className="flex items-center gap-2">
              <Link className="btn btn-secondary w-auto text-xs sm:text-sm" href="/dashboard" title="Go to workout">
                Go to workout
              </Link>
               <button className="btn btn-secondary w-auto text-xs sm:text-sm" onClick={logout} title="Logout">
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="container-responsive py-4 md:py-6">
        <section className="card-lg max-w-none">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-base font-semibold md:text-lg">Your daily checklist</h2>
                <p className="text-xs-muted mt-1 text-xs">
                  Track daily habits by marking them complete each day and watch your progress over time.
                </p>
            </div>
            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              <input
                aria-label="Select habit day"
                className="btn btn-secondary h-9 px-3 text-xs sm:text-sm"
                type="date"
                value={selectedDay}
                onChange={(e) => setSelectedDay(e.target.value)}
              />
              <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-300">
                {habitProgress}% complete
              </span>
              <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-300">
                {completedHabitCount}/{habits.length} done
              </span>
            </div>
          </div>

          {habits.length === 0 ? (
            <div className="mt-4 rounded-lg border border-dashed border-slate-200 p-4 text-xs text-slate-500 dark:border-slate-700">
              Add daily habits like water intake, sleep goals, and recovery rituals.
            </div>
          ) : (
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {selectedDayHabitSummaries.map((habit) => (
                <div
                  key={`${habit.id}-${selectedDay}`}
                  className={`rounded-lg border p-3 transition-smooth ${
                    habit.completedOnSelectedDay
                      ? "border-emerald-300 bg-emerald-50 dark:border-emerald-700 dark:bg-emerald-900/20"
                      : "border-slate-200 dark:border-slate-700"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <button
                        className={`h-9 w-9 rounded-full border text-sm font-semibold transition-smooth ${
                          habit.completedOnSelectedDay
                            ? "border-emerald-400 bg-emerald-400 text-white"
                            : "border-slate-300 bg-white text-slate-400 dark:border-slate-600 dark:bg-slate-800"
                        }`}
                        onClick={() => void toggleHabit(habit)}
                        aria-label={`Mark ${habit.name} as done`}
                      >
                        {habit.completedOnSelectedDay ? "✓" : "○"}
                      </button>
                      <div>
                        <p className="text-sm font-semibold">{habit.name}</p>
                      </div>
                    </div>
                    <button
                      className="btn btn-secondary h-7 w-7 p-0 text-[11px]"
                      onClick={() => void handleDeleteHabit(habit)}
                      aria-label={`Delete ${habit.name}`}
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <button className="btn btn-secondary h-10 w-auto px-4 text-xs sm:tex" onClick={() => setShowHabitForm(true)}>
              Add habit
            </button>
          </div>

          <div className="mt-6 rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    Monthly progress
                  </p>
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                    {selectedMonthDate
                      ? selectedMonthDate.toLocaleDateString(undefined, { month: "long", year: "numeric" })
                      : "Select a month"}
                  </h3>
                </div>
                <div className="flex flex-wrap items-start gap-2 sm:gap-3">
                  <input
                    aria-label="Select month"
                    className="btn btn-secondary h-9 px-3 text-xs sm:text-sm"
                    type="month"
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                  />
                </div>
              </div>
            {selectedMonthSeries.length === 0 ? (
              <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">Pick a month to see completion trends.</p>
            ) : (
              <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50/70 p-3 dark:border-slate-700 dark:bg-slate-800/60">
                <p className="mb-3 text-xs text-slate-500 dark:text-slate-400">
                  Click a bar to see the progress on that day
                </p>
                <div className="flex gap-3">
                  <div className="relative h-24 w-4 shrink-0"></div>

                  <div className="flex-1 overflow-x-auto">
                    <div className="relative min-w-[500px] pr-2 sm:min-w-[720px]">
                      {/* chart area: fixed height, bars grow upward from the bottom */}
                      <div className="relative w-full" style={{ height: `${chartHeight}px` }}>
                        {selectedMonthTicks.map((tick) => (
                          <div
                            key={`grid-${tick}`}
                            className="absolute left-0 right-0 border-t border-slate-200 dark:border-slate-700"
                            style={{ top: `${(1 - tick / selectedMonthMax) * 100}%` }}
                          ></div>
                        ))}
                        <div className="absolute inset-0 flex items-end" style={{ gap: '3px' }}>
                          {selectedMonthSeries.map((item) => {
                            const pct = item.count / Math.max(selectedMonthMax, 1);
                            const barH = Math.max(6, pct * chartHeight);
                            const isSelected = selectedMonthDate
                              ? selectedDay ===
                                toDateInputValue(
                                  new Date(selectedMonthDate.getFullYear(), selectedMonthDate.getMonth(), item.day)
                                )
                              : false;
                            return (
                              <div
                                key={`col-${item.day}`}
                                className="relative flex flex-1 flex-col items-center justify-end"
                                style={{ height: "100%" }}
                              >
                                {item.count > 0 && (
                                  <span className="mb-0.5 text-[9px] font-semibold leading-none text-slate-600 dark:text-slate-300">
                                    {item.count}
                                  </span>
                                )}
                                <button
                                  type="button"
                                  className={`w-full rounded-sm border border-transparent transition-smooth ${
                                    isSelected
                                      ? "bg-slate-400 border-slate-500/60 ring-2 ring-slate-200 dark:bg-slate-500 dark:border-slate-400 dark:ring-slate-400"
                                      : item.count === 0
                                        ? "bg-emerald-200 hover:bg-emerald-300"
                                        : "bg-emerald-400 hover:bg-emerald-500"
                                  }`}
                                  style={{ height: `${barH}px` }}
                                  onClick={() => {
                                    if (!selectedMonthDate) {
                                      return;
                                    }

                                    const nextDate = new Date(
                                      selectedMonthDate.getFullYear(),
                                      selectedMonthDate.getMonth(),
                                      item.day
                                    );
                                    setSelectedDay(toDateInputValue(nextDate));
                                  }}
                                  aria-pressed={isSelected}
                                  title={`Day ${item.day}: ${item.count} habits completed`}
                                ></button>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* x-axis day labels */}
                        <div className="flex w-full items-start" style={{ gap: '3px' }}>
                        {selectedMonthSeries.map((item) => (
                          <div key={`label-${item.day}`} className="flex flex-1 justify-center">
                            {item.day % 5 === 0 ? (
                                <div className="flex flex-col items-center">
                                  <span className="h-px w-3 bg-slate-300 dark:bg-slate-600"></span>
                                  <span className="mt-1 text-[9px] font-medium text-slate-500 dark:text-slate-400">
                                    {item.day}
                                  </span>
                                </div>
                            ) : null}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
