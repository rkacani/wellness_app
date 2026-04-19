"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type DayName =
  | "Monday"
  | "Tuesday"
  | "Wednesday"
  | "Thursday"
  | "Friday"
  | "Saturday"
  | "Sunday";

type Exercise = {
  id: string;
  rank?: number;
  name: string;
  durationSec: number;
  sets: number;
  restSec: number;
  weightKg?: number | null;
  notes?: string;
};

type WeekProgram = {
  id: string;
  name: string;
  schedule: Record<DayName, Exercise[]>;
};

type SessionState = {
  exerciseIndex: number;
  phase: "work" | "rest";
  setNumber: number;
  remainingSec: number;
  quote: string;
};

type AuthUser = {
  id: string;
  email: string;
};

const DAYS: DayName[] = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

const QUOTES = [
  "Small progress is still progress.",
  "You are stronger than yesterday.",
  "Finish what you started.",
  "Consistency beats intensity.",
  "Focus on form, then power.",
  "Your body can handle it.",
];

const getQuoteBySeed = (seed: number) => QUOTES[Math.abs(seed) % QUOTES.length];

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

const emptySchedule = (): Record<DayName, Exercise[]> => ({
  Monday: [],
  Tuesday: [],
  Wednesday: [],
  Thursday: [],
  Friday: [],
  Saturday: [],
  Sunday: [],
});

const formatClock = (seconds: number) => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.max(0, seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
};

const formatLongDuration = (seconds: number) => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.max(0, seconds % 60);
  return `${mins}m ${secs}s`;
};

const calculateExerciseTotal = (exercise: Exercise) =>
  exercise.durationSec * exercise.sets + Math.max(0, exercise.sets - 1) * exercise.restSec;

const splitDuration = (seconds: number) => ({
  minutes: Math.floor(seconds / 60),
  seconds: seconds % 60,
});

export default function DashboardPage() {
  const router = useRouter();
  const authUser = React.useMemo(
    () => (typeof window === "undefined" ? null : parseStoredAuthUser()),
    []
  );

  const [isLoadingData, setIsLoadingData] = React.useState(true);
  const [programs, setPrograms] = React.useState<WeekProgram[]>([]);
  const [selectedProgramId, setSelectedProgramId] = React.useState<string>("");
  const [selectedDay, setSelectedDay] = React.useState<DayName>("Monday");

  const [newProgramName, setNewProgramName] = React.useState("");
  const [renameProgramName, setRenameProgramName] = React.useState("");

  const [exerciseName, setExerciseName] = React.useState("");
  const [durationMinutes, setDurationMinutes] = React.useState(0);
  const [durationSeconds, setDurationSeconds] = React.useState(45);
  const [sets, setSets] = React.useState(3);
  const [restMinutes, setRestMinutes] = React.useState(0);
  const [restSeconds, setRestSeconds] = React.useState(20);
  const [weightKg, setWeightKg] = React.useState("");
  const [notes, setNotes] = React.useState("");
  const [editingExerciseId, setEditingExerciseId] = React.useState<string | null>(null);

  const [nextExerciseIndex, setNextExerciseIndex] = React.useState(0);
  const [session, setSession] = React.useState<SessionState | null>(null);

  const selectedProgram = React.useMemo(
    () => programs.find((p) => p.id === selectedProgramId) ?? programs[0],
    [programs, selectedProgramId]
  );

  const dayExercises = selectedProgram?.schedule[selectedDay] ?? [];
  const readyExerciseIndex = Math.min(nextExerciseIndex, Math.max(0, dayExercises.length - 1));
  const dayTotalDuration = dayExercises.reduce(
    (total, exercise) => total + calculateExerciseTotal(exercise),
    0
  );

  const loadPrograms = async (preferredProgramId?: string) => {
    if (!authUser) {
      return;
    }

    const res = await fetch(`/api/programs?userId=${encodeURIComponent(authUser.id)}`);
    if (!res.ok) {
      return;
    }

    const data = (await res.json()) as WeekProgram[];
    const programsPayload = Array.isArray(data) ? data : [];

    setPrograms(programsPayload);
    setSelectedProgramId((prev) => {
      if (preferredProgramId && programsPayload.some((item) => item.id === preferredProgramId)) {
        return preferredProgramId;
      }

      if (prev && programsPayload.some((item) => item.id === prev)) {
        return prev;
      }

      return programsPayload[0]?.id ?? "";
    });
  };

  React.useEffect(() => {
    if (!authUser) {
      router.replace("/login");
      return;
    }

    const load = async () => {
      setIsLoadingData(true);
      await loadPrograms();
      setIsLoadingData(false);
    };

    void load();
  }, [authUser, router]);

  React.useEffect(() => {
    if (!session) {
      return;
    }

    const timer = setInterval(() => {
      setSession((prev) => {
        if (!prev) {
          return null;
        }

        if (prev.remainingSec > 1) {
          return { ...prev, remainingSec: prev.remainingSec - 1 };
        }

        const currentExercise = dayExercises[prev.exerciseIndex];
        if (!currentExercise) {
          return null;
        }

        if (prev.phase === "work") {
          if (prev.setNumber < currentExercise.sets && currentExercise.restSec > 0) {
            return {
              ...prev,
              phase: "rest",
              remainingSec: currentExercise.restSec,
              quote: getQuoteBySeed(prev.exerciseIndex + prev.setNumber),
            };
          }

          if (prev.setNumber < currentExercise.sets) {
            return {
              ...prev,
              phase: "work",
              setNumber: prev.setNumber + 1,
              remainingSec: currentExercise.durationSec,
              quote: getQuoteBySeed(prev.exerciseIndex + prev.setNumber + 1),
            };
          }

          setNextExerciseIndex(Math.min(prev.exerciseIndex + 1, Math.max(0, dayExercises.length - 1)));
          return null;
        }

        return {
          ...prev,
          phase: "work",
          setNumber: prev.setNumber + 1,
          remainingSec: currentExercise.durationSec,
          quote: getQuoteBySeed(prev.exerciseIndex + prev.setNumber + 2),
        };
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [session, dayExercises]);

  const resetExerciseForm = () => {
    setExerciseName("");
    setDurationMinutes(0);
    setDurationSeconds(45);
    setSets(3);
    setRestMinutes(0);
    setRestSeconds(20);
    setWeightKg("");
    setNotes("");
    setEditingExerciseId(null);
  };

  const handleAddProgram = async () => {
    if (!authUser || !newProgramName.trim()) {
      return;
    }

    const res = await fetch("/api/programs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: authUser.id, name: newProgramName.trim() }),
    });

    if (!res.ok) {
      return;
    }

    const created = (await res.json()) as WeekProgram;
    setNewProgramName("");
    await loadPrograms(created.id);
  };

  const handleRenameProgram = async () => {
    if (!authUser || !selectedProgram || !renameProgramName.trim()) {
      return;
    }

    const res = await fetch(`/api/programs/${selectedProgram.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: authUser.id, name: renameProgramName.trim() }),
    });

    if (!res.ok) {
      return;
    }

    setRenameProgramName("");
    await loadPrograms(selectedProgram.id);
  };

  const handleDeleteProgram = async () => {
    if (!authUser || !selectedProgram) {
      return;
    }

    const confirmed = window.confirm(
      `Delete week program "${selectedProgram.name}"? This will delete all exercises in it.`
    );
    if (!confirmed) {
      return;
    }

    const res = await fetch(`/api/programs/${selectedProgram.id}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: authUser.id }),
    });

    if (!res.ok) {
      return;
    }

    setSession(null);
    setNextExerciseIndex(0);
    await loadPrograms();
  };

  const handleAddOrUpdateExercise = async () => {
    if (!authUser || !selectedProgram || !exerciseName.trim()) {
      return;
    }

    const totalDurationSeconds = Math.floor(durationMinutes) * 60 + Math.floor(durationSeconds);
    const totalRestSeconds = Math.floor(restMinutes) * 60 + Math.floor(restSeconds);

    if (totalDurationSeconds <= 0 || sets < 1 || totalRestSeconds < 0) {
      return;
    }

    const payload = {
      userId: authUser.id,
      dayOfWeek: selectedDay,
      name: exerciseName.trim(),
      durationSeconds: totalDurationSeconds,
      sets,
      restSeconds: totalRestSeconds,
      weightKg: weightKg.trim() ? Number(weightKg) : null,
      notes: notes.trim(),
    };

    const endpoint = editingExerciseId
      ? `/api/exercises/${editingExerciseId}`
      : `/api/programs/${selectedProgram.id}/exercises`;

    const method = editingExerciseId ? "PATCH" : "POST";

    const res = await fetch(endpoint, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      return;
    }

    resetExerciseForm();
    await loadPrograms(selectedProgram.id);
  };

  const handleEditExercise = (exercise: Exercise) => {
    const durationSplit = splitDuration(exercise.durationSec);
    const restSplit = splitDuration(exercise.restSec);

    setEditingExerciseId(exercise.id);
    setExerciseName(exercise.name);
    setDurationMinutes(durationSplit.minutes);
    setDurationSeconds(durationSplit.seconds);
    setSets(exercise.sets);
    setRestMinutes(restSplit.minutes);
    setRestSeconds(restSplit.seconds);
    setWeightKg(exercise.weightKg == null ? "" : String(exercise.weightKg));
    setNotes(exercise.notes || "");
  };

  const handleDeleteExercise = async (exerciseId: string, exerciseNameLabel: string) => {
    if (!authUser) {
      return;
    }

    const confirmed = window.confirm(
      `Delete exercise "${exerciseNameLabel}" from ${selectedDay}?`
    );

    if (!confirmed) {
      return;
    }

    const res = await fetch(`/api/exercises/${exerciseId}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: authUser.id }),
    });

    if (!res.ok) {
      return;
    }

    if (session && dayExercises[session.exerciseIndex]?.id === exerciseId) {
      setSession(null);
    }

    setNextExerciseIndex((prev) => Math.min(prev, Math.max(0, dayExercises.length - 2)));
    await loadPrograms(selectedProgram?.id);
  };

  const moveExercise = async (index: number, direction: -1 | 1) => {
    if (!authUser || !selectedProgram) {
      return;
    }

    const target = index + direction;
    if (target < 0 || target >= dayExercises.length) {
      return;
    }

    const cloned = [...dayExercises];
    [cloned[index], cloned[target]] = [cloned[target], cloned[index]];

    setPrograms((prev) =>
      prev.map((program) => {
        if (program.id !== selectedProgram.id) {
          return program;
        }

        return {
          ...program,
          schedule: {
            ...program.schedule,
            [selectedDay]: cloned,
          },
        };
      })
    );

    const firstUpdate = fetch(`/api/exercises/${cloned[index].id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: authUser.id, rank: index }),
    });

    const secondUpdate = fetch(`/api/exercises/${cloned[target].id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: authUser.id, rank: target }),
    });

    await Promise.all([firstUpdate, secondUpdate]);
    await loadPrograms(selectedProgram.id);
  };

  const startExercise = (index: number) => {
    const exercise = dayExercises[index];
    if (!exercise) {
      return;
    }

    setSession({
      exerciseIndex: index,
      phase: "work",
      setNumber: 1,
      remainingSec: exercise.durationSec,
      quote: getQuoteBySeed(index),
    });
  };

  const logout = () => {
    localStorage.removeItem("wellness-auth-user");
    router.push("/login");
  };

  if (!authUser) {
    return (
      <div className="app-shell">
        <div className="card text-center">
          <p>Redirecting to login...</p>
        </div>
      </div>
    );
  }

  if (isLoadingData) {
    return (
      <div className="app-shell">
        <div className="card text-center">
          <p>Loading your programs...</p>
        </div>
      </div>
    );
  }

  const selectedSchedule = selectedProgram?.schedule ?? emptySchedule();

  return (
    <div className="min-h-screen px-4 py-8 sm:px-6 lg:px-10">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="card-lg max-w-none bg-gradient-to-r from-sky-500 to-indigo-600 text-white">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl">Workout Dashboard</h1>
              <p className="mt-2 text-sm text-sky-100">Manage weekly plans, day exercises and guided timers.</p>
            </div>
            <div className="flex gap-3">
              <Link href="/login" className="btn bg-white/15 px-4 py-2 text-white hover:bg-white/25">
                Back
              </Link>
              <button className="btn bg-white px-4 py-2 text-slate-900" onClick={logout}>
                Logout
              </button>
            </div>
          </div>
        </header>

        <section className="grid gap-6 lg:grid-cols-[320px_1fr]">
          <aside className="card max-w-none">
            <h3>Week Programs</h3>
            <p className="text-sm-muted mb-4">All data is scoped to: {authUser.email}</p>

            <div className="space-y-2">
              {programs.map((program) => (
                <button
                  key={program.id}
                  onClick={() => {
                    setSelectedProgramId(program.id);
                    setSession(null);
                    setNextExerciseIndex(0);
                  }}
                  className={`w-full rounded-lg border px-3 py-2 text-left text-sm transition-smooth ${
                    selectedProgram?.id === program.id
                      ? "border-sky-500 bg-sky-50 dark:bg-sky-900/30"
                      : "border-slate-200 hover:border-slate-300 dark:border-slate-700"
                  }`}
                >
                  {program.name}
                </button>
              ))}
            </div>

            <div className="mt-5 space-y-2">
              <label className="form-label">New program name</label>
              <input
                className="form-input"
                value={newProgramName}
                onChange={(e) => setNewProgramName(e.target.value)}
                placeholder="Strength Week A"
              />
              <button className="btn btn-secondary" onClick={handleAddProgram}>
                Add Program
              </button>
            </div>

            <div className="mt-6 border-t border-slate-200 pt-4 dark:border-slate-700">
              <label className="form-label">Rename selected program</label>
              <input
                className="form-input"
                value={renameProgramName}
                onChange={(e) => setRenameProgramName(e.target.value)}
                placeholder={selectedProgram?.name || "No selected program"}
                disabled={!selectedProgram}
              />
              <div className="mt-2 grid grid-cols-2 gap-2">
                <button className="btn btn-secondary" onClick={handleRenameProgram} disabled={!selectedProgram}>
                  Rename
                </button>
                <button
                  className="btn bg-rose-500 text-white hover:bg-rose-600 disabled:opacity-40"
                  onClick={handleDeleteProgram}
                  disabled={!selectedProgram}
                >
                  Delete
                </button>
              </div>
            </div>
          </aside>

          <main className="space-y-6">
            <div className="card-lg max-w-none">
              <div className="mb-4 flex items-center justify-between">
                <h3>{selectedProgram?.name || "No Program Selected"} · Weekly Calendar</h3>
                <span className="text-sm-muted">Click a day to manage exercises</span>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {DAYS.map((day) => (
                  <button
                    key={day}
                    className={`rounded-xl border p-4 text-left transition-smooth ${
                      selectedDay === day
                        ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20"
                        : "border-slate-200 hover:border-slate-300 dark:border-slate-700"
                    }`}
                    onClick={() => {
                      setSelectedDay(day);
                      setSession(null);
                      setNextExerciseIndex(0);
                    }}
                  >
                    <p className="font-semibold">{day}</p>
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                      {selectedSchedule[day].length} exercise(s)
                    </p>
                  </button>
                ))}
              </div>
            </div>

            <div className="grid gap-6 xl:grid-cols-[420px_1fr]">
              <section className="card max-w-none">
                <h3>{editingExerciseId ? "Edit Exercise" : `Add Exercise · ${selectedDay}`}</h3>

                <div className="mt-4 space-y-3">
                  <div>
                    <label className="form-label">Exercise name</label>
                    <input
                      className="form-input"
                      value={exerciseName}
                      onChange={(e) => setExerciseName(e.target.value)}
                      placeholder="Bodyweight squats"
                      disabled={!selectedProgram}
                    />
                  </div>

                  <div>
                    <label className="form-label">Duration</label>
                    <div className="grid grid-cols-2 gap-3">
                      <input
                        type="number"
                        min={0}
                        className="form-input"
                        value={durationMinutes}
                        onChange={(e) => setDurationMinutes(Number(e.target.value))}
                        placeholder="Minutes"
                        disabled={!selectedProgram}
                      />
                      <input
                        type="number"
                        min={0}
                        max={59}
                        className="form-input"
                        value={durationSeconds}
                        onChange={(e) => setDurationSeconds(Number(e.target.value))}
                        placeholder="Seconds"
                        disabled={!selectedProgram}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="form-label">Rest between sets</label>
                    <div className="grid grid-cols-2 gap-3">
                      <input
                        type="number"
                        min={0}
                        className="form-input"
                        value={restMinutes}
                        onChange={(e) => setRestMinutes(Number(e.target.value))}
                        placeholder="Minutes"
                        disabled={!selectedProgram}
                      />
                      <input
                        type="number"
                        min={0}
                        max={59}
                        className="form-input"
                        value={restSeconds}
                        onChange={(e) => setRestSeconds(Number(e.target.value))}
                        placeholder="Seconds"
                        disabled={!selectedProgram}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="form-label">Sets</label>
                      <input
                        type="number"
                        min={1}
                        className="form-input"
                        value={sets}
                        onChange={(e) => setSets(Number(e.target.value))}
                        disabled={!selectedProgram}
                      />
                    </div>
                    <div>
                      <label className="form-label">Weight (kg)</label>
                      <input
                        type="number"
                        min={0}
                        step="0.5"
                        className="form-input"
                        value={weightKg}
                        onChange={(e) => setWeightKg(e.target.value)}
                        placeholder="Optional"
                        disabled={!selectedProgram}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="form-label">Notes (optional)</label>
                    <textarea
                      className="form-textarea"
                      rows={3}
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Controlled movement, full range"
                      disabled={!selectedProgram}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <button className="btn btn-secondary" onClick={handleAddOrUpdateExercise} disabled={!selectedProgram}>
                      {editingExerciseId ? "Update" : "Add"}
                    </button>
                    <button className="btn btn-secondary" onClick={resetExerciseForm}>
                      Clear
                    </button>
                  </div>
                </div>
              </section>

              <section className="card-lg max-w-none">
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <h3>{selectedDay} Program</h3>
                    <p className="text-sm-muted">Day total duration: {formatLongDuration(dayTotalDuration)}</p>
                  </div>
                  <span className="text-sm-muted">Ranked list with timer flow</span>
                </div>

                {dayExercises.length === 0 && (
                  <div className="alert alert-info">No exercises yet for {selectedDay}. Add one from the left panel.</div>
                )}

                <div className="space-y-3">
                  {dayExercises.map((exercise, index) => {
                    const isCurrent = session?.exerciseIndex === index;
                    const canStart = session ? false : index === readyExerciseIndex;
                    const exerciseTotal = calculateExerciseTotal(exercise);

                    return (
                      <div
                        key={exercise.id}
                        className={`rounded-xl border p-4 ${
                          isCurrent
                            ? "border-emerald-400 bg-emerald-50 dark:bg-emerald-900/20"
                            : "border-slate-200 dark:border-slate-700"
                        }`}
                      >
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">#{index + 1}</p>
                            <h4 className="text-lg font-semibold">{exercise.name}</h4>
                            <p className="text-sm-muted mt-1">
                              {exercise.sets} set(s) · {formatLongDuration(exercise.durationSec)} work · {formatLongDuration(exercise.restSec)} rest
                            </p>
                            <p className="text-sm-muted">Total exercise duration: {formatLongDuration(exerciseTotal)}</p>
                            {exercise.weightKg != null && <p className="text-sm-muted">Weight: {exercise.weightKg} kg</p>}
                            {exercise.notes && <p className="mt-2 text-sm">{exercise.notes}</p>}
                          </div>

                          <div className="flex flex-wrap gap-2">
                            <button className="btn btn-secondary px-3 py-1.5" onClick={() => moveExercise(index, -1)}>
                              ↑
                            </button>
                            <button className="btn btn-secondary px-3 py-1.5" onClick={() => moveExercise(index, 1)}>
                              ↓
                            </button>
                            <button className="btn btn-secondary px-3 py-1.5" onClick={() => handleEditExercise(exercise)}>
                              Edit
                            </button>
                            <button
                              className="btn bg-rose-500 px-3 py-1.5 text-white hover:bg-rose-600"
                              onClick={() => handleDeleteExercise(exercise.id, exercise.name)}
                            >
                              Delete
                            </button>
                            <button
                              className="btn bg-emerald-500 px-3 py-1.5 text-white hover:bg-emerald-600 disabled:opacity-40"
                              onClick={() => startExercise(index)}
                              disabled={!canStart}
                            >
                              Start
                            </button>
                          </div>
                        </div>

                        {isCurrent && session && (
                          <div className="mt-4 rounded-lg border border-emerald-300 bg-white p-4 dark:bg-slate-900">
                            <p className="text-sm font-medium text-emerald-700 dark:text-emerald-300">
                              {session.phase === "work" ? "Workout in progress" : "Rest time"}
                            </p>
                            <p className="mt-1 text-3xl font-bold">{formatClock(session.remainingSec)}</p>
                            <p className="mt-1 text-sm-muted">
                              Set {Math.min(session.setNumber, exercise.sets)} of {exercise.sets}
                            </p>
                            <p className="mt-3 rounded bg-slate-100 px-3 py-2 text-sm italic dark:bg-slate-800">“{session.quote}”</p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </section>
            </div>
          </main>
        </section>
      </div>
    </div>
  );
}
