import { NextResponse } from "next/server";
import { getSupabaseService } from "@/src/lib/supabase-server";

type Params = { params: Promise<{ programId: string }> };

export async function POST(req: Request, { params }: Params) {
  try {
    const { programId } = await params;
    const body = await req.json();

    const userId = body?.userId as string | undefined;
    const dayOfWeek = body?.dayOfWeek as string | undefined;
    const name = body?.name as string | undefined;
    const durationSeconds = body?.durationSeconds as number | undefined;
    const sets = body?.sets as number | undefined;
    const restSeconds = body?.restSeconds as number | undefined;
    const weightKg = body?.weightKg as number | null | undefined;
    const notes = body?.notes as string | undefined;
    const exerciseTypeId = body?.exerciseTypeId as string | undefined;

    console.log("[POST /api/programs/:programId/exercises] programId:", programId, "userId:", userId, "dayOfWeek:", dayOfWeek, "name:", name);

    if (!userId || !dayOfWeek || !name?.trim()) {
      console.log("[POST /api/programs/:programId/exercises] Missing required fields");
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    if (!Number.isFinite(durationSeconds) || !Number.isFinite(sets) || !Number.isFinite(restSeconds)) {
      console.log("[POST /api/programs/:programId/exercises] Invalid numeric values: durationSeconds=", durationSeconds, "sets=", sets, "restSeconds=", restSeconds);
      return NextResponse.json({ error: "Invalid numeric values" }, { status: 400 });
    }

    const safeDurationSeconds = Math.floor(durationSeconds ?? 0);
    const safeSets = Math.floor(sets ?? 0);
    const safeRestSeconds = Math.floor(restSeconds ?? 0);

    const supabase = getSupabaseService();

    // First, check if program exists
    const { data: allPrograms, error: checkError } = await supabase
      .from("week_programs")
      .select("id, user_id")
      .eq("id", programId);

    console.log("[POST /api/programs/:programId/exercises] All programs check - error:", checkError, "data:", allPrograms);

    // Then check ownership - verify the program exists and belongs to this user
    const ownership = allPrograms?.find((p) => p.user_id === userId);

    console.log("[POST /api/programs/:programId/exercises] ownership check - ownership:", ownership, "expected userId:", userId);

    if (!ownership) {
      console.log("[POST /api/programs/:programId/exercises] Program not found or access denied");
      return NextResponse.json({ error: "Program not found or access denied" }, { status: 404 });
    }

    const { data: existing, error: countError } = await supabase
      .from("exercises")
      .select("rank")
      .eq("program_id", programId)
      .eq("day_of_week", dayOfWeek)
      .order("rank", { ascending: false })
      .limit(1);

    if (countError) {
      console.log("[POST /api/programs/:programId/exercises] Count error:", countError);
      return NextResponse.json({ error: countError.message }, { status: 500 });
    }

    const rank = existing?.[0]?.rank != null ? Number(existing[0].rank) + 1 : 0;

    const { data, error } = await supabase
      .from("exercises")
      .insert({
        program_id: programId,
        day_of_week: dayOfWeek,
        rank,
        name: name.trim(),
        exercise_type_id: exerciseTypeId ?? null,
        duration_seconds: safeDurationSeconds,
        sets: safeSets,
        rest_seconds: safeRestSeconds,
        weight_kg: weightKg ?? null,
        notes: notes?.trim() || null,
      })
      .select("id, day_of_week, rank, name, duration_seconds, sets, rest_seconds, weight_kg, notes, exercise_type_id")
      .single();

    if (error) {
      console.log("[POST /api/programs/:programId/exercises] Insert error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    console.log("[POST /api/programs/:programId/exercises] Exercise created:", data.id);

    return NextResponse.json(
      {
        id: data.id,
        dayOfWeek: data.day_of_week,
        rank: data.rank,
        name: data.name,
        exerciseTypeId: data.exercise_type_id ?? null,
        durationSec: data.duration_seconds,
        sets: data.sets,
        restSec: data.rest_seconds,
        weightKg: data.weight_kg,
        notes: data.notes || undefined,
      },
      { status: 201 }
    );
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error("[POST /api/programs/:programId/exercises] Exception:", errorMsg, error);
    return NextResponse.json({ error: "Failed to create exercise" }, { status: 500 });
  }
}
