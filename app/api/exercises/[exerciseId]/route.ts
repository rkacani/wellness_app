import { NextResponse } from "next/server";
import { getSupabaseService } from "@/src/lib/supabase-server";

type Params = { params: Promise<{ exerciseId: string }> };

async function canAccessExercise(supabase: ReturnType<typeof getSupabaseService>, exerciseId: string, userId: string) {
  const { data: exercise, error: exerciseError } = await supabase
    .from("exercises")
    .select("id, program_id")
    .eq("id", exerciseId)
    .single();

  if (exerciseError || !exercise) {
    return false;
  }

  const { data: owner, error: ownerError } = await supabase
    .from("week_programs")
    .select("id")
    .eq("id", exercise.program_id)
    .eq("user_id", userId)
    .single();

  return !ownerError && !!owner;
}

export async function PATCH(req: Request, { params }: Params) {
  try {
    const { exerciseId } = await params;
    const body = await req.json();
    const userId = body?.userId as string | undefined;

    if (!userId) {
      return NextResponse.json({ error: "userId is required" }, { status: 400 });
    }

    const supabase = getSupabaseService();
    const allowed = await canAccessExercise(supabase, exerciseId, userId);

    if (!allowed) {
      return NextResponse.json({ error: "Exercise not found" }, { status: 404 });
    }

    const updatePayload: Record<string, string | number | null> = {};
    if (typeof body.name === "string") updatePayload.name = body.name.trim();
    if (typeof body.dayOfWeek === "string") updatePayload.day_of_week = body.dayOfWeek;
    if (typeof body.rank === "number") updatePayload.rank = Math.floor(body.rank);
    if (typeof body.durationSeconds === "number") updatePayload.duration_seconds = Math.floor(body.durationSeconds);
    if (typeof body.sets === "number") updatePayload.sets = Math.floor(body.sets);
    if (typeof body.restSeconds === "number") updatePayload.rest_seconds = Math.floor(body.restSeconds);
    if (typeof body.weightKg === "number") updatePayload.weight_kg = body.weightKg;
    if (body.weightKg === null) updatePayload.weight_kg = null;
    if (typeof body.notes === "string") updatePayload.notes = body.notes.trim() || null;

    const { data, error } = await supabase
      .from("exercises")
      .update(updatePayload)
      .eq("id", exerciseId)
      .select("id, day_of_week, rank, name, duration_seconds, sets, rest_seconds, weight_kg, notes")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(
      {
        id: data.id,
        dayOfWeek: data.day_of_week,
        rank: data.rank,
        name: data.name,
        durationSec: data.duration_seconds,
        sets: data.sets,
        restSec: data.rest_seconds,
        weightKg: data.weight_kg,
        notes: data.notes || undefined,
      },
      { status: 200 }
    );
  } catch {
    return NextResponse.json({ error: "Failed to update exercise" }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: Params) {
  try {
    const { exerciseId } = await params;
    const body = await req.json();
    const userId = body?.userId as string | undefined;

    if (!userId) {
      return NextResponse.json({ error: "userId is required" }, { status: 400 });
    }

    const supabase = getSupabaseService();
    const allowed = await canAccessExercise(supabase, exerciseId, userId);

    if (!allowed) {
      return NextResponse.json({ error: "Exercise not found" }, { status: 404 });
    }

    const { error } = await supabase.from("exercises").delete().eq("id", exerciseId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch {
    return NextResponse.json({ error: "Failed to delete exercise" }, { status: 500 });
  }
}
