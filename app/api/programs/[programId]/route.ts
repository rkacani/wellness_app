import { NextResponse } from "next/server";
import { getSupabaseService } from "@/src/lib/supabase-server";

type Params = { params: Promise<{ programId: string }> };

export async function PATCH(req: Request, { params }: Params) {
  try {
    const { programId } = await params;
    const body = await req.json();
    const userId = body?.userId as string | undefined;
    const name = body?.name as string | undefined;

    if (!userId || !name?.trim()) {
      return NextResponse.json({ error: "userId and name are required" }, { status: 400 });
    }

    const supabase = getSupabaseService();
    const { data, error } = await supabase
      .from("week_programs")
      .update({ name: name.trim() })
      .eq("id", programId)
      .eq("user_id", userId)
      .select("id, name")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data, { status: 200 });
  } catch {
    return NextResponse.json({ error: "Failed to update program" }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: Params) {
  try {
    const { programId } = await params;
    const body = await req.json();
    const userId = body?.userId as string | undefined;

    if (!userId) {
      return NextResponse.json({ error: "userId is required" }, { status: 400 });
    }

    const supabase = getSupabaseService();
    const { error } = await supabase
      .from("week_programs")
      .delete()
      .eq("id", programId)
      .eq("user_id", userId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch {
    return NextResponse.json({ error: "Failed to delete program" }, { status: 500 });
  }
}
