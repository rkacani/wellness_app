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

    if (!userId || !dayOfWeek || !name?.trim()) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    if (!Number.isFinite(durationSeconds) || !Number.isFinite(sets) || !Number.isFinite(restSeconds)) {
      return NextResponse.json({ error: "Invalid numeric values" }, { status: 400 });
    }

    const safeDurationSeconds = Math.floor(durationSeconds ?? 0);
    const safeSets = Math.floor(sets ?? 0);
    const safeRestSeconds = Math.floor(restSeconds ?? 0);

    const supabase = getSupabaseService();

    const { data: ownership, error: ownershipError } = await supabase
      .from("week_programs")
      .select("id")
      .eq("id", programId)
      .eq("user_id", userId)
      .single();

    if (ownershipError || !ownership) {
      return NextResponse.json({ error: "Program not found" }, { status: 404 });
    }

    const { data: existing, error: countError } = await supabase
      .from("exercises")
      .select("rank")
      .eq("program_id", programId)
      .eq("day_of_week", dayOfWeek)
      .order("rank", { ascending: false })
      .limit(1);

    if (countError) {
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
        duration_seconds: safeDurationSeconds,
        sets: safeSets,
        rest_seconds: safeRestSeconds,
        weight_kg: weightKg ?? null,
        notes: notes?.trim() || null,
      })
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
      { status: 201 }
    );
  } catch {
    return NextResponse.json({ error: "Failed to create exercise" }, { status: 500 });
  }
}
