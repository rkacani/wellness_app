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
  exerciseTypeId?: string | null;
  exerciseTypeName?: string | null;
  exerciseMediaUrl?: string | null;
  durationSec: number;
  sets: number;
  restSec: number;
  weightKg?: number | null;
  notes?: string;
};

type ExerciseType = {
  id: string;
  name: string;
  mediaUrl?: string | null;
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
  paused?: boolean;
};

type AuthUser = {
  id: string;
  email: string;
};

type Habit = {
  id: string;
  name: string;
  completedAt: string | null;
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
  const [isSidebarOpen, setIsSidebarOpen] = React.useState(false);
  const [isClient, setIsClient] = React.useState(false);
  const [programs, setPrograms] = React.useState<WeekProgram[]>([]);
  const [selectedProgramId, setSelectedProgramId] = React.useState<string>("");
  const [selectedDay, setSelectedDay] = React.useState<DayName>(() => {
    const todayIndex = new Date().getDay();
    const map: DayName[] = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    return map[todayIndex] ?? "Monday";
  });

  const [newProgramName, setNewProgramName] = React.useState("");
  const [renameProgramName, setRenameProgramName] = React.useState("");
  const [isRenameInputFocused, setIsRenameInputFocused] = React.useState(false);
  const [showProgramForm, setShowProgramForm] = React.useState(false);
  const [showRenameProgramForm, setShowRenameProgramForm] = React.useState(false);

  const [exerciseName, setExerciseName] = React.useState("");
  const [exerciseTypes, setExerciseTypes] = React.useState<ExerciseType[]>([]);
  const [selectedExerciseTypeId, setSelectedExerciseTypeId] = React.useState<string>("");
  const [showExerciseForm, setShowExerciseForm] = React.useState(false);
  const [durationMinutes, setDurationMinutes] = React.useState(0);
  const [durationSeconds, setDurationSeconds] = React.useState(45);
  const [sets, setSets] = React.useState(3);
  const [restMinutes, setRestMinutes] = React.useState(0);
  const [restSeconds, setRestSeconds] = React.useState(20);
  const [weightKg, setWeightKg] = React.useState("");
  const [notes, setNotes] = React.useState("");
  const [editingExerciseId, setEditingExerciseId] = React.useState<string | null>(null);

  const [habits, setHabits] = React.useState<Habit[]>([]);
  const [habitName, setHabitName] = React.useState("");
  const [showHabitForm, setShowHabitForm] = React.useState(false);

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
    setIsClient(true);
  }, []);

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
    if (!authUser) {
      return;
    }

    const loadExerciseTypes = async () => {
      const res = await fetch("/api/exercise-types");
      if (!res.ok) {
        return;
      }

      const data = (await res.json()) as Array<ExerciseType & { media_url?: string | null }>;
      const normalized = Array.isArray(data)
        ? data.map((item) => ({
            ...item,
            mediaUrl: item.mediaUrl ?? item.media_url ?? null,
          }))
        : [];
      setExerciseTypes(normalized);
    };

    void loadExerciseTypes();
  }, [authUser]);

  React.useEffect(() => {
    if (!session) {
      return;
    }

    const timer = setInterval(() => {
      setSession((prev) => {
        if (!prev || prev.paused) {
          return prev;
        }

        if (prev.remainingSec > 1) {
          return { ...prev, remainingSec: prev.remainingSec - 1 };
        }

        const currentExercise = dayExercises[prev.exerciseIndex];
        if (!currentExercise) {
          return null;
        }

        if (prev.phase === "work") {
          // Check if this is the last set
          if (prev.setNumber >= currentExercise.sets) {
            // Last set completed - show rest time before next exercise if available
            if (currentExercise.restSec > 0) {
              return {
                ...prev,
                phase: "rest",
                remainingSec: currentExercise.restSec,
                quote: getQuoteBySeed(prev.exerciseIndex + prev.setNumber),
              };
            }
            // No rest time - move to next exercise
            const nextExerciseIndex = prev.exerciseIndex + 1;
            if (nextExerciseIndex < dayExercises.length) {
              const nextExercise = dayExercises[nextExerciseIndex];
              return {
                ...prev,
                exerciseIndex: nextExerciseIndex,
                phase: "work",
                setNumber: 1,
                remainingSec: nextExercise.durationSec,
                quote: getQuoteBySeed(nextExerciseIndex),
              };
            }
            // All exercises done - pause
            return {
              ...prev,
              paused: true,
            };
          }

          // Not the last set - show rest time
          if (currentExercise.restSec > 0) {
            return {
              ...prev,
              phase: "rest",
              remainingSec: currentExercise.restSec,
              quote: getQuoteBySeed(prev.exerciseIndex + prev.setNumber),
            };
          }

          // No rest time - start next set
          return {
            ...prev,
            phase: "work",
            setNumber: prev.setNumber + 1,
            remainingSec: currentExercise.durationSec,
            quote: getQuoteBySeed(prev.exerciseIndex + prev.setNumber + 1),
          };
        }

        // Rest phase complete
        // Check if we need to move to next exercise
        if (prev.setNumber >= currentExercise.sets) {
          const nextExerciseIndex = prev.exerciseIndex + 1;
          if (nextExerciseIndex < dayExercises.length) {
            const nextExercise = dayExercises[nextExerciseIndex];
            return {
              ...prev,
              exerciseIndex: nextExerciseIndex,
              phase: "work",
              setNumber: 1,
              remainingSec: nextExercise.durationSec,
              quote: getQuoteBySeed(nextExerciseIndex),
            };
          }
          // All exercises done - pause
          return {
            ...prev,
            paused: true,
          };
        }

        // Start next set of same exercise
        return {
          ...prev,
          phase: "work",
          setNumber: prev.setNumber + 1,
          remainingSec: currentExercise.durationSec,
          quote: getQuoteBySeed(prev.exerciseIndex + prev.setNumber + 1),
        };
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [session, dayExercises]);

  React.useEffect(() => {
    const previousOverflow = document.body.style.overflow;

    if (showExerciseForm) {
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [showExerciseForm]);

  const resetExerciseForm = () => {
    setExerciseName("");
    setSelectedExerciseTypeId("");
    setDurationMinutes(0);
    setDurationSeconds(45);
    setSets(3);
    setRestMinutes(0);
    setRestSeconds(20);
    setWeightKg("");
    setNotes("");
    setEditingExerciseId(null);
    setShowExerciseForm(false);
  };

  const openNewExerciseForm = () => {
    setExerciseName("");
    setSelectedExerciseTypeId("");
    setDurationMinutes(0);
    setDurationSeconds(45);
    setSets(3);
    setRestMinutes(0);
    setRestSeconds(20);
    setWeightKg("");
    setNotes("");
    setEditingExerciseId(null);
    setShowExerciseForm(true);
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
    setShowProgramForm(false);
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
    setShowRenameProgramForm(false);
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
    if (!authUser || !selectedProgram || !selectedProgram.id || !exerciseName.trim()) {
      return;
    }

    // Debug: log the selected program and user
    console.log("DEBUG: selectedProgram:", selectedProgram);
    console.log("DEBUG: authUser.id:", authUser.id);

    const totalDurationSeconds = Math.floor(durationMinutes) * 60 + Math.floor(durationSeconds);
    const totalRestSeconds = Math.floor(restMinutes) * 60 + Math.floor(restSeconds);

    if (totalDurationSeconds <= 0 || sets < 1 || totalRestSeconds < 0) {
      return;
    }

    const resolvedName = exerciseName.trim();
    if (!resolvedName) {
      return;
    }

    const payload = {
      userId: authUser.id,
      dayOfWeek: selectedDay,
      name: resolvedName,
      exerciseTypeId: selectedExerciseTypeId || null,
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
      const errorData = await res.json();
      console.error("Exercise creation error:", res.status, errorData);
      alert(`Error: ${errorData?.error || 'Failed to save exercise'}`);
      return;
    }

    resetExerciseForm();
    await loadPrograms(selectedProgram.id);
  };

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
    setHabits((prev: Habit[]) => [...prev, created]);
    setHabitName("");
    setShowHabitForm(false);
  };

  const toggleHabit = async (habit: Habit) => {
    if (!authUser) {
      return;
    }

    const nextCompletedAt = habit.completedAt ? null : new Date().toISOString();
    const res = await fetch(`/api/habits/${habit.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: authUser.id, completedAt: nextCompletedAt }),
    });

    if (!res.ok) {
      return;
    }

    const updated = (await res.json()) as Habit;
    setHabits((prev: Habit[]) => prev.map((item: Habit) => (item.id === habit.id ? updated : item)));
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

    setHabits((prev: Habit[]) => prev.filter((item: Habit) => item.id !== habit.id));
  };

  const handleEditExercise = (exercise: Exercise) => {
    const durationSplit = splitDuration(exercise.durationSec);
    const restSplit = splitDuration(exercise.restSec);

    setEditingExerciseId(exercise.id);
    setExerciseName(exercise.name);
    setSelectedExerciseTypeId(exercise.exerciseTypeId ?? "");
    setDurationMinutes(durationSplit.minutes);
    setDurationSeconds(durationSplit.seconds);
    setSets(exercise.sets);
    setRestMinutes(restSplit.minutes);
    setRestSeconds(restSplit.seconds);
    setWeightKg(exercise.weightKg == null ? "" : String(exercise.weightKg));
    setNotes(exercise.notes || "");
    setShowExerciseForm(true);
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
      paused: false,
    });
  };

  const handlePauseResume = () => {
    setSession((prev) => {
      if (!prev) {
        return null;
      }
      return { ...prev, paused: !prev.paused };
    });
  };

  const handleEndExercise = () => {
    setNextExerciseIndex(0);
    setSession(null);
  };

  const logout = () => {
    localStorage.removeItem("wellness-auth-user");
    router.push("/login");
  };

  if (!isClient) {
    return (
      <div className="app-shell">
        <div className="card text-center">
          <p>Loading your programs...</p>
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      {showProgramForm && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center">
          <div className="w-full max-w-md rounded-xl bg-white p-4 shadow-xl dark:bg-slate-900">
            <div className="flex items-center justify-between gap-2 border-b border-slate-200 pb-3 dark:border-slate-700">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">New Program</p>
                <h3 className="text-base font-semibold">Create weekly plan</h3>
              </div>
              <button className="btn btn-secondary text-xs" onClick={() => setShowProgramForm(false)}>
                Close
              </button>
            </div>

            <div className="mt-4 space-y-3">
              <div>
                <label className="form-label">Program name</label>
                <input
                  className="form-input text-sm"
                  value={newProgramName}
                  onChange={(e) => setNewProgramName(e.target.value)}
                  placeholder="Morning strength"
                />
              </div>
            </div>

            <div className="mt-5 flex gap-2">
              <button
                className="btn btn-secondary text-xs sm:text-sm"
                onClick={handleAddProgram}
                disabled={!newProgramName.trim()}
              >
                Create Program
              </button>
              <button className="btn btn-secondary text-xs sm:text-sm" onClick={() => setShowProgramForm(false)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
      {showRenameProgramForm && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center">
          <div className="w-full max-w-md rounded-xl bg-white p-4 shadow-xl dark:bg-slate-900">
            <div className="flex items-center justify-between gap-2 border-b border-slate-200 pb-3 dark:border-slate-700">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Rename Program</p>
                <h3 className="text-base font-semibold">{selectedProgram?.name ?? "Program"}</h3>
              </div>
              <button className="btn btn-secondary text-xs" onClick={() => setShowRenameProgramForm(false)}>
                Close
              </button>
            </div>

            <div className="mt-4 space-y-3">
              <div>
                <label className="form-label">New name</label>
                <input
                  className="form-input text-sm"
                  value={renameProgramName}
                  onChange={(e) => setRenameProgramName(e.target.value)}
                  placeholder={selectedProgram?.name || "New name"}
                  disabled={!selectedProgram}
                />
              </div>
            </div>

            <div className="mt-5 flex gap-2">
              <button
                className="btn btn-secondary text-xs sm:text-sm"
                onClick={handleRenameProgram}
                disabled={!selectedProgram || !renameProgramName.trim() || renameProgramName === selectedProgram?.name}
              >
                Rename program
              </button>
              <button className="btn btn-secondary text-xs sm:text-sm" onClick={() => setShowRenameProgramForm(false)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
      {showExerciseForm && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 p-4">
          <div className="h-[calc(100vh-2rem)] w-full max-w-lg touch-pan-y overflow-y-auto overscroll-contain rounded-xl bg-white p-4 shadow-xl dark:bg-slate-900">
            <div className="flex items-center justify-between gap-2 border-b border-slate-200 pb-3 dark:border-slate-700">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Add Exercise</p>
                <h3 className="text-base font-semibold">{selectedDay}</h3>
              </div>
            </div>

            <div className="mt-4 space-y-3">
              <div>
                <label className="form-label">Exercise type</label>
                <div className="grid gap-3 sm:grid-cols-[1fr_120px]">
                  <select
                    className="form-select text-sm"
                    value={selectedExerciseTypeId}
                    onChange={(e) => {
                      const value = e.target.value;
                      setSelectedExerciseTypeId(value);
                      const selected = exerciseTypes.find((item) => item.id === value);
                      setExerciseName(selected?.name ?? "");
                    }}
                    disabled={!selectedProgram}
                  >
                    <option value="">-- Select --</option>
                    {exerciseTypes.map((type) => (
                      <option key={type.id} value={type.id}>
                        {type.name}
                      </option>
                    ))}
                  </select>
                  <div className="flex h-24 items-center justify-center rounded-lg border border-dashed border-slate-300 bg-white/60 p-2 text-xs text-slate-500 dark:border-slate-700 dark:bg-slate-800/40 sm:h-20">
                    {exerciseTypes.find((item) => item.id === selectedExerciseTypeId)?.mediaUrl ? (
                      <img
                        src={exerciseTypes.find((item) => item.id === selectedExerciseTypeId)?.mediaUrl ?? ""}
                        alt="Exercise preview"
                        className="h-20 w-50 rounded-md object-contain sm:h-10 sm:w-30"
                      />
                    ) : (
                      "Preview"
                    )}
                  </div>
                </div>
              </div>

              <div>
                <label className="form-label">Custom name</label>
                <input
                  className="form-input text-sm"
                  value={exerciseName}
                  onChange={(e) => setExerciseName(e.target.value)}
                  placeholder="Optional display name"
                  disabled={!selectedProgram}
                />
              </div>

              <div>
                <label className="form-label">Duration</label>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="number"
                    min={0}
                    className="form-input text-sm"
                    value={durationMinutes}
                    onChange={(e) => setDurationMinutes(Number(e.target.value))}
                    placeholder="Min"
                    disabled={!selectedProgram}
                  />
                  <input
                    type="number"
                    min={0}
                    max={59}
                    className="form-input text-sm"
                    value={durationSeconds}
                    onChange={(e) => setDurationSeconds(Number(e.target.value))}
                    placeholder="Sec"
                    disabled={!selectedProgram}
                  />
                </div>
              </div>

              <div>
                <label className="form-label">Rest between sets</label>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="number"
                    min={0}
                    className="form-input text-sm"
                    value={restMinutes}
                    onChange={(e) => setRestMinutes(Number(e.target.value))}
                    placeholder="Min"
                    disabled={!selectedProgram}
                  />
                  <input
                    type="number"
                    min={0}
                    max={59}
                    className="form-input text-sm"
                    value={restSeconds}
                    onChange={(e) => setRestSeconds(Number(e.target.value))}
                    placeholder="Sec"
                    disabled={!selectedProgram}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="form-label">Sets</label>
                  <input
                    type="number"
                    min={1}
                    className="form-input text-sm"
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
                    className="form-input text-sm"
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
                  className="form-textarea text-sm"
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Controlled movement"
                  disabled={!selectedProgram}
                />
              </div>
            </div>

            <div className="mt-5 flex gap-2">
              <button
                className="btn btn-secondary text-xs sm:text-sm"
                onClick={handleAddOrUpdateExercise}
                disabled={!selectedProgram}
              >
                {editingExerciseId ? "Update Exercise" : "Add Exercise"}
              </button>
              <button className="btn btn-secondary text-xs sm:text-sm" onClick={resetExerciseForm}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Header */}
      <header className="sticky top-0 z-40 bg-gradient-to-r from-sky-500 to-indigo-600 text-white shadow-lg">
        <div className="container-responsive pt-5 pb-1">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h1 className="text-lg font-bold md:text-2xl">Workout Dashboard</h1>
              <p className="hidden text-xs text-sky-100 sm:block">Manage weekly plans & guided timers</p>
            </div>
            <div className="flex items-center gap-2">
              <Link className="btn btn-secondary h-10 w-auto px-4 text-xs sm:text-sm" href="/habits" title="Go to habits">
                Go to habits
              </Link>
              <button
                className="btn btn-secondary w-auto text-xs sm:text-sm"
                onClick={logout}
                title="Logout"
              >
                Logout
              </button>
            </div>
          </div>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
            <div className="flex flex-nowrap items-center gap-2 overflow-x-auto">
              <span className="text-xs font-medium text-sky-100">Select program:</span>
              {programs.length > 0 ? (
                <select
                  className="form-select min-w-[180px] text-xs sm:text-sm"
                  value={selectedProgram?.id ?? ""}
                  onChange={(e) => {
                    const value = e.target.value;
                    setSelectedProgramId(value);
                    setSession(null);
                    setNextExerciseIndex(0);
                  }}
                >
                  {programs.map((program) => (
                    <option key={program.id} value={program.id}>
                      {program.name}
                    </option>
                  ))}
                </select>
              ) : (
                <span className="text-xs text-sky-100 sm:text-sm">No programs created</span>
              )}
            </div>
            <div className="flex flex-nowrap items-center gap-2 overflow-x-auto">
              <button
                className="btn btn-secondary w-auto text-xs sm:text-sm"
                onClick={() => setShowProgramForm(true)}
                title="Create a new workout program"
                          >
                New program
              </button>
              {selectedProgram && (
                <button
                  className="btn btn-secondary w-auto text-xs sm:text-sm"
                  onClick={() => {
                    setRenameProgramName(selectedProgram.name);
                    setShowRenameProgramForm(true);
                  }}
                  title="Rename the current program"
                >
                Rename program    
                </button>
              )}
              {selectedProgram && (
                <button
                  className="btn btn-secondary w-auto text-xs sm:text-sm"
                  onClick={() => void handleDeleteProgram()}
                  title="Delete the current program"
                >
                  Delete program
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container-responsive py-4 md:py-6">
        <div className="space-y-4 md:space-y-6">
          <div className="space-y-4 md:space-y-6">
            <section className="card-lg max-w-none">
                <div className="mb-3 md:mb-4">
                  <h2 className="text-base font-semibold md:text-lg">
                    {selectedProgram?.name || "No Program"} · Weekly Calendar
                  </h2>
                  <p className="text-xs-muted mt-1 text-xs">Click a day to manage exercises</p>
                </div>

                <div className="grid gap-2 sm:gap-3 grid-cols-4 lg:grid-cols-7">
                {DAYS.map((day) => (
                  <button
                    key={day}
                    className={`rounded-lg border p-2 text-center text-xs transition-smooth sm:p-3 sm:text-sm ${
                      selectedDay === day
                        ? "border-indigo-500 bg-indigo-50 font-semibold dark:bg-indigo-900/30"
                        : "border-slate-200 hover:border-slate-300 dark:border-slate-700"
                    }`}
                    onClick={() => {
                      setSelectedDay(day);
                      setSession(null);
                      setNextExerciseIndex(0);
                      setIsSidebarOpen(false);
                    }}
                  >
                    <p className="font-semibold">{day.slice(0, 3)}</p>
                    <p className="mt-1 text-xs opacity-75">
                      {selectedSchedule[day].length}
                    </p>
                  </button>
                ))}
                </div>
              </section>

              <section className="card-lg max-w-none">
                  <div className="mb-3 md:mb-4">
                    <h3 className="text-base font-semibold md:text-lg">{selectedDay} Program</h3>
                    <p className="text-xs-muted mt-1 text-xs">
                      Day total: {formatLongDuration(dayTotalDuration)}
                    </p>
                  </div>

                  {dayExercises.length === 0 && (
                    <div className="alert alert-info text-xs sm:text-sm">
                      No exercises yet for {selectedDay}. Add one below.
                    </div>
                  )}

                  <div className="space-y-2 md:space-y-3">
                    {dayExercises.map((exercise, index) => {
                      const isCurrent = session?.exerciseIndex === index;
                      const canStart = session ? false : index === readyExerciseIndex;
                      const exerciseTotal = calculateExerciseTotal(exercise);
                      const demoUrl = exercise.exerciseMediaUrl;

                      return (
                      <div
                        key={exercise.id}
                        className={`relative rounded-lg border p-3 text-xs transition-smooth sm:p-4 sm:text-sm ${
                          isCurrent
                            ? "border-emerald-400 bg-emerald-50 dark:bg-emerald-900/20"
                            : "border-slate-200 dark:border-slate-700"
                        }`}
                      >
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                            <div className="flex flex-1 items-start gap-2">
                              <div className="flex flex-col gap-1 pt-1">
                                <button
                                  className="btn btn-secondary px-1.5 py-1 text-[10px]"
                                  onClick={() => moveExercise(index, -1)}
                                  aria-label="Move up"
                                >
                                  ↑
                                </button>
                                <button
                                  className="btn btn-secondary px-1.5 py-1 text-[10px]"
                                  onClick={() => moveExercise(index, 1)}
                                  aria-label="Move down"
                                >
                                  ↓
                                </button>
                              </div>
                              <div className="flex-1">
                            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">#{index + 1}</p>
                            <h4 className="mt-1 font-semibold">{exercise.name}</h4>
                            <p className="text-xs-muted mt-1">
                              {exercise.sets}×{formatLongDuration(exercise.durationSec)} / {formatLongDuration(exercise.restSec)} rest
                            </p>
                            <p className="text-xs-muted">Total: {formatLongDuration(exerciseTotal)}</p>
                            {exercise.weightKg != null && (
                              <p className="text-xs-muted">{exercise.weightKg} kg</p>
                            )}
                              {demoUrl && (
                                <div className="mt-3 flex justify-center">
                                  <img
                                    src={demoUrl}
                                    alt={exercise.exerciseTypeName ?? "Exercise demo"}
                                    className="h-28 w-44 rounded-md object-contain sm:h-32 sm:w-52"
                                  />
                                </div>
                              )}
                            {exercise.notes && <p className="mt-2 text-xs">{exercise.notes}</p>}
                              </div>
                          </div>

                          <div className="absolute right-2 top-2 flex gap-1">
                            <button
                              className="btn btn-secondary h-7 w-7 p-0 text-[11px]"
                              onClick={() => handleEditExercise(exercise)}
                            >
                              ✎
                            </button>
                            <button
                              className="btn btn-secondary h-7 w-7 p-0 text-[11px]"
                              onClick={() => handleDeleteExercise(exercise.id, exercise.name)}
                            >
                              ✕
                            </button>
                          </div>
                        </div>

                        {isCurrent && session && (
                          <div className="mt-3 rounded-lg border border-emerald-300 bg-white p-3 dark:bg-slate-900 sm:p-4">
                            <p className="text-xs font-medium text-emerald-700 dark:text-emerald-300">
                              {session.phase === "work" ? "💪 Workout" : "🛑 Rest"}
                            </p>
                            <p className="mt-2 text-2xl font-bold sm:text-3xl">
                              {session.paused ? "⏸" : ""} {formatClock(session.remainingSec)}
                            </p>
                            <p className="text-xs-muted mt-1">
                              Set {Math.min(session.setNumber, exercise.sets)} of {exercise.sets}
                            </p>
                            <p className="mt-2 rounded bg-slate-100 px-2 py-1.5 text-xs italic dark:bg-slate-800">
                              &ldquo;{session.quote}&rdquo;
                            </p>
                          </div>
                        )}
                      </div>
                      );
                    })}
                    <button
                      className="btn btn-secondary w-full text-xs sm:text-sm"
                      onClick={openNewExerciseForm}
                      disabled={!selectedProgram}
                    >
                      + Add exercise
                    </button>
                    {dayExercises.length > 0 && (
                      <div className="mt-3 flex gap-2">
                        <button
                          className="btn btn-secondary flex-1 text-xs sm:text-sm"
                          onClick={() => startExercise(0)}
                          disabled={session !== null}
                        >
                          ▶️ Start
                        </button>
                        <button
                          className="btn btn-secondary flex-1 text-xs sm:text-sm"
                          onClick={handlePauseResume}
                          disabled={session === null}
                        >
                          {session?.paused ? "▶️ Resume" : "⏸ Pause"}
                        </button>
                        <button
                          className="btn btn-secondary flex-1 text-xs sm:text-sm"
                          onClick={handleEndExercise}
                          disabled={session === null}
                        >
                          ⏹ End
                        </button>
                      </div>
                    )}
                  </div>
                </section>
          </div>
        </div>
      </main>
    </div>
  );
}
