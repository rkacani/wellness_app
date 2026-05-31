import { NextResponse } from "next/server";
import { getSupabaseService } from "@/src/lib/supabase-server";

type HabitRow = {
  id: string;
  name: string;
  completed_at: string | null;
  created_at: string;
};

type HabitCompletionRow = {
  habit_id: string;
  completed_at: string;
};

export async function GET(req: Request) {
  try {
    const userId = new URL(req.url).searchParams.get("userId");

    if (!userId) {
      return NextResponse.json({ error: "Missing userId" }, { status: 400 });
    }

    const supabase = getSupabaseService();
    const [{ data, error }, completionsResult] = await Promise.all([
      supabase
        .from("habits")
        .select("id, name, completed_at, created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: true }),
      supabase
        .from("habit_completions")
        .select("habit_id, completed_at")
        .eq("user_id", userId)
        .order("completed_at", { ascending: false }),
    ]);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const completions = (completionsResult.data || []) as HabitCompletionRow[];
    const completionCounts = completions.reduce<Record<string, number>>((acc, item) => {
      acc[item.habit_id] = (acc[item.habit_id] || 0) + 1;
      return acc;
    }, {});

    const payload = (data || []).map((habit: HabitRow) => ({
      id: habit.id,
      name: habit.name,
      completedAt: habit.completed_at,
      createdAt: habit.created_at,
      completionCount: completionCounts[habit.id] || 0,
      completionDates: completions
        .filter((item) => item.habit_id === habit.id)
        .map((item) => item.completed_at),
    }));

    return NextResponse.json(payload, { status: 200 });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: `Failed to load habits: ${errorMsg}` }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const userId = body?.userId as string | undefined;
    const name = body?.name as string | undefined;
    if (!userId || !name?.trim()) {
      return NextResponse.json({ error: "userId and name are required" }, { status: 400 });
    }

    const supabase = getSupabaseService();
    const { data, error } = await supabase
      .from("habits")
      .insert({ user_id: userId, name: name.trim() })
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
        completionCount: 0,
        completionDates: [],
      },
      { status: 201 }
    );
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: `Failed to create habit: ${errorMsg}` }, { status: 500 });
  }
}
