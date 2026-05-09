import { NextResponse } from "next/server";
import { getSupabaseService } from "@/src/lib/supabase-server";

export async function GET() {
  try {
    const supabase = getSupabaseService();
    const { data, error } = await supabase
      .from("exercise_type")
      .select("id, name, media_url")
      .order("name", { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data ?? [], { status: 200 });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}
