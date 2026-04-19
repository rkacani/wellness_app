import { NextResponse } from "next/server";
import { getSupabaseService } from "@/src/lib/supabase-server";

type DayName =
  | "Monday"
  | "Tuesday"
  | "Wednesday"
  | "Thursday"
  | "Friday"
  | "Saturday"
  | "Sunday";

const DAYS: DayName[] = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

type ExercisePayload = {
  id: string;
  name: string;
  durationSec: number;
  sets: number;
  restSec: number;
  weightKg: number | null;
  notes?: string;
  rank: number;
};

const emptySchedule = (): Record<DayName, ExercisePayload[]> => ({
  Monday: [],
  Tuesday: [],
  Wednesday: [],
  Thursday: [],
  Friday: [],
  Saturday: [],
  Sunday: [],
});

export async function GET(req: Request) {
  try {
    const userId = new URL(req.url).searchParams.get("userId");
    console.log("[GET /api/programs] userId:", userId);

    if (!userId) {
      return NextResponse.json({ error: "Missing userId" }, { status: 400 });
    }

    console.log("[GET /api/programs] Initializing Supabase service...");
    const supabase = getSupabaseService();
    console.log("[GET /api/programs] Fetching programs for user:", userId);

    const { data: programs, error: programError } = await supabase
      .from("week_programs")
      .select("id, name, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: true });

    if (programError) {
      console.error("[GET /api/programs] Program fetch error:", programError);
      return NextResponse.json({ error: programError.message }, { status: 500 });
    }
    console.log("[GET /api/programs] Programs fetched:", programs?.length || 0);

    if (!programs || programs.length === 0) {
      return NextResponse.json([], { status: 200 });
    }

    const programIds = programs.map((program) => program.id);
    const { data: exercises, error: exerciseError } = await supabase
      .from("exercises")
      .select("id, program_id, day_of_week, rank, name, duration_seconds, sets, rest_seconds, weight_kg, notes")
      .in("program_id", programIds)
      .order("rank", { ascending: true });

    if (exerciseError) {
      return NextResponse.json({ error: exerciseError.message }, { status: 500 });
    }

    const payload = programs.map((program) => {
      const schedule = emptySchedule();
      (exercises || [])
        .filter((exercise) => exercise.program_id === program.id)
        .forEach((exercise) => {
          const day = exercise.day_of_week as DayName;
          if (DAYS.includes(day)) {
            const dayItems = schedule[day] as ExercisePayload[];
            dayItems.push({
              id: exercise.id,
              name: exercise.name,
              durationSec: exercise.duration_seconds,
              sets: exercise.sets,
              restSec: exercise.rest_seconds,
              weightKg: exercise.weight_kg,
              notes: exercise.notes || undefined,
              rank: exercise.rank,
            });
          }
        });

      return {
        id: program.id,
        name: program.name,
        schedule,
      };
    });

    return NextResponse.json(payload, { status: 200 });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error("[GET /api/programs] Exception:", errorMsg, error);
    return NextResponse.json(
      { error: `Failed to load programs: ${errorMsg}` },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const userId = body?.userId as string | undefined;
    const name = body?.name as string | undefined;

    console.log("[POST /api/programs] userId:", userId, "name:", name);

    if (!userId || !name?.trim()) {
      return NextResponse.json({ error: "userId and name are required" }, { status: 400 });
    }

    console.log("[POST /api/programs] Initializing Supabase service...");
    const supabase = getSupabaseService();

    console.log("[POST /api/programs] Inserting program:", name.trim());
    const { data, error } = await supabase
      .from("week_programs")
      .insert({ user_id: userId, name: name.trim() })
      .select("id, name")
      .single();

    if (error) {
      console.error("[POST /api/programs] Insert error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    console.log("[POST /api/programs] Program created:", data.id);

    return NextResponse.json(
      {
        id: data.id,
        name: data.name,
        schedule: emptySchedule(),
      },
      { status: 201 }
    );
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error("[POST /api/programs] Exception:", errorMsg, error);
    return NextResponse.json(
      { error: `Failed to create program: ${errorMsg}` },
      { status: 500 }
    );
  }
}
