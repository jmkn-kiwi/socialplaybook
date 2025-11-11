// app/api/db-check/route.ts
import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase";

export async function GET() {
  try {
    const supabase = getSupabaseServerClient();

    // 1) insert a test row
    const { data: inserted, error: insertError } = await supabase
      .from("health_checks")
      .insert({ note: "Ping from Next.js API" })
      .select("*")
      .single();

    if (insertError) {
      return NextResponse.json(
        { ok: false, stage: "insert", error: insertError.message },
        { status: 500 }
      );
    }

    // 2) read back the last 5 rows (newest first)
    const { data: recent, error: selectError } = await supabase
      .from("health_checks")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(5);

    if (selectError) {
      return NextResponse.json(
        { ok: false, stage: "select", error: selectError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true, inserted, recent });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, stage: "unknown", error: err?.message ?? String(err) },
      { status: 500 }
    );
  }
}
