import { NextResponse } from "next/server";
import { getSupabaseService } from "@/src/lib/supabase-server";

type Params = { params: Promise<{ habitId: string }> };

async function canAccessHabit(supabase: ReturnType<typeof getSupabaseService>, habitId: string, userId: string) {
  const { data, error } = await supabase
    .from("habits")
    .select("id")
    .eq("id", habitId)
    .eq("user_id", userId)
    .single();

  return !error && !!data;
}

export async function PATCH(req: Request, { params }: Params) {
  try {
    const { habitId } = await params;
    const body = await req.json();
    const userId = body?.userId as string | undefined;

    if (!userId) {
      return NextResponse.json({ error: "userId is required" }, { status: 400 });
    }

    const supabase = getSupabaseService();
    const allowed = await canAccessHabit(supabase, habitId, userId);

    if (!allowed) {
      return NextResponse.json({ error: "Habit not found" }, { status: 404 });
    }

    const updatePayload: Record<string, string | null> = {};
    if (typeof body.name === "string") updatePayload.name = body.name.trim();
    if (typeof body.completedAt === "string") updatePayload.completed_at = body.completedAt;
    if (body.completedAt === null) updatePayload.completed_at = null;
    if (typeof body.completionDate === "string" && typeof body.markComplete === "boolean") {
      updatePayload.completed_at = body.markComplete ? body.completionDate : null;
    }

    const completionDate =
      typeof body.completionDate === "string" && typeof body.markComplete === "boolean"
        ? body.completionDate
        : body.completedAt;
    const markComplete = typeof body.markComplete === "boolean" ? body.markComplete : typeof body.completedAt === "string";

    if (typeof completionDate === "string" && markComplete) {
      const { error: completionError } = await supabase
        .from("habit_completions")
        .insert({ habit_id: habitId, user_id: userId, completed_at: completionDate });

      if (completionError) {
        return NextResponse.json({ error: completionError.message }, { status: 500 });
      }
    } else if (completionDate === null || (typeof body.completionDate === "string" && !markComplete)) {
      const { error: completionError } = await supabase
        .from("habit_completions")
        .delete()
        .eq("habit_id", habitId)
        .eq("user_id", userId);

      if (completionError) {
        return NextResponse.json({ error: completionError.message }, { status: 500 });
      }
    }

    const { data, error } = await supabase
      .from("habits")
      .update(updatePayload)
      .eq("id", habitId)
      .select("id, name, completed_at, created_at")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(
      {
        id: data.id,
        name: data.name,
        completedAt: data.completed_at,
        createdAt: data.created_at,
      },
      { status: 200 }
    );
  } catch {
    return NextResponse.json({ error: "Failed to update habit" }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: Params) {
  try {
    const { habitId } = await params;
    const body = await req.json();
    const userId = body?.userId as string | undefined;

    if (!userId) {
      return NextResponse.json({ error: "userId is required" }, { status: 400 });
    }

    const supabase = getSupabaseService();
    const allowed = await canAccessHabit(supabase, habitId, userId);

    if (!allowed) {
      return NextResponse.json({ error: "Habit not found" }, { status: 404 });
    }

    const { error } = await supabase.from("habits").delete().eq("id", habitId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch {
    return NextResponse.json({ error: "Failed to delete habit" }, { status: 500 });
  }
}
