// app/api/content-plans/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  const supabase = getSupabaseServerClient();
  const { searchParams } = new URL(req.url);
  const businessId = searchParams.get("businessId");
  if (!businessId) {
    return NextResponse.json({ ok: false, error: "Missing businessId" }, { status: 400 });
  }

  const { data: plan, error: planErr } = await supabase
    .from("content_plans")
    .select("*")
    .eq("business_id", businessId)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (planErr || !plan) {
    return NextResponse.json({ ok: false, error: planErr?.message ?? "No plan" }, { status: 404 });
  }

  const { data: items, error: itemsErr } = await supabase
    .from("plan_items")
    .select("*")
    .eq("content_plan_id", plan.id)
    .order("post_date", { ascending: true });

  if (itemsErr) {
    return NextResponse.json({ ok: false, error: itemsErr.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, plan, items });
}
