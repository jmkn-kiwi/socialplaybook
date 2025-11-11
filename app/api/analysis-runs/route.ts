// app/api/analysis-runs/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase";

type CreateBody = {
  businessId?: string;
  demoBusinessName?: string; // optional: auto-create a business if none provided
  city?: string;
};

function toISODate(d: Date): string {
  return d.toISOString().slice(0, 10); // YYYY-MM-DD
}

export async function POST(req: NextRequest) {
  const supabase = getSupabaseServerClient();
  const body = (await req.json().catch(() => ({}))) as CreateBody;

  // 1) Ensure a business exists
  let businessId = body.businessId;

  try {
    if (!businessId) {
      const name = body.demoBusinessName ?? "Demo Deli";
      const { data: biz, error: bizErr } = await supabase
        .from("businesses")
        .insert({
          name,
          category: "restaurant",
          city: body.city ?? "Your City",
          goals: ["foot_traffic", "online_orders"],
        })
        .select("*")
        .single();

      if (bizErr) {
        return NextResponse.json(
          { ok: false, stage: "create_business", error: bizErr.message },
          { status: 500 }
        );
      }
      businessId = biz.id;
    } else {
      // sanity check the provided business
      const { data: existing, error: checkErr } = await supabase
        .from("businesses")
        .select("id")
        .eq("id", businessId)
        .single();

      if (checkErr || !existing) {
        return NextResponse.json(
          { ok: false, stage: "check_business", error: checkErr?.message ?? "Business not found" },
          { status: 400 }
        );
      }
    }

    // 2) Create a fake analysis summary (normally computed from posts)
    const fakeSummary = {
      top_pillars: [
        { name: "BTS kitchen prep", lift_vs_baseline: 2.3 },
        { name: "Staff personalities", lift_vs_baseline: 1.8 },
        { name: "UGC reposts", lift_vs_baseline: 1.6 },
      ],
      best_formats: { reels: "2.7x", carousels: "1.4x", static: "0.6x" },
      cadence: { competitors_median_posts_per_week: 5, client_posts_per_week: 2 },
      underused_by_client: ["UGC", "poll stories", "limited-time offers"],
    };

    const params = { window_days: 60, platforms: ["instagram"] };

    const { data: run, error: runErr } = await supabase
      .from("analysis_runs")
      .insert({
        business_id: businessId,
        params,
        summary: fakeSummary,
      })
      .select("*")
      .single();

    if (runErr || !run) {
      return NextResponse.json(
        { ok: false, stage: "create_analysis_run", error: runErr?.message },
        { status: 500 }
      );
    }

    // 3) Create a 7-day content plan anchored to today
    const start = new Date();
    const end = new Date();
    end.setDate(start.getDate() + 6);

    const planSummary = {
      narrative: "Focus on short Reels showing close-up prep + friendly staff moments.",
      pillars: ["BTS", "Staff", "UGC", "Offer"],
      weekly_cadence: { reels: 3, stories: 2, static: 1 },
    };

    const { data: plan, error: planErr } = await supabase
      .from("content_plans")
      .insert({
        business_id: businessId,
        analysis_run_id: run.id,
        period_start: toISODate(start),
        period_end: toISODate(end),
        summary: planSummary,
      })
      .select("*")
      .single();

    if (planErr || !plan) {
      return NextResponse.json(
        { ok: false, stage: "create_content_plan", error: planErr?.message },
        { status: 500 }
      );
    }

    // 4) Generate 7 plan items (1 per day)
    const items = [];
    const dailyTemplates = [
      {
        platform: "instagram",
        format: "reel",
        pillar: "BTS",
        idea_title: "Close-up: Hand-stretched bread",
        idea_description:
          "15s montage of dough → oven → steam release. Text-on-screen explains why your bread hits different.",
        suggested_hook: "“This is why our sandwiches hit different.”",
        caption_prompt:
          "Write a playful, 1-sentence caption highlighting fresh-baked bread with a subtle CTA to visit today.",
      },
      {
        platform: "instagram",
        format: "story",
        pillar: "Offer",
        idea_title: "Poll: Spicy or Mild?",
        idea_description: "Two-story poll for this week’s special sauce.",
        suggested_hook: "“Help us pick this week’s special”",
        caption_prompt: "Draft a short, friendly story copy inviting people to vote.",
      },
      {
        platform: "instagram",
        format: "reel",
        pillar: "Staff",
        idea_title: "Meet the Team: 10s intros",
        idea_description:
          "Quick cuts of 3 team members sharing a fun fact. End on smiles & logo.",
        suggested_hook: "“Meet the folks behind the counter”",
        caption_prompt: "Write a wholesome caption introducing staff with 2 emojis.",
      },
      {
        platform: "instagram",
        format: "post",
        pillar: "UGC",
        idea_title: "Customer Repost: Sandwich close-up",
        idea_description:
          "DM permission, repost their best shot; tag them and thank them.",
        suggested_hook: "“POV: First bite = bliss”",
        caption_prompt: "Write a thank-you caption crediting the customer and inviting others to tag you.",
      },
      {
        platform: "instagram",
        format: "reel",
        pillar: "BTS",
        idea_title: "Sauce drizzle slow-mo",
        idea_description:
          "7–10s macro slow-mo of signature sauce drizzle; text-on-screen naming the sauce.",
        suggested_hook: "“Don’t watch hungry.”",
        caption_prompt: "Write a cheeky caption naming the sauce and inviting taste tests.",
      },
      {
        platform: "instagram",
        format: "story",
        pillar: "Community",
        idea_title: "Neighborhood shoutout",
        idea_description:
          "Story tagging a nearby small biz you love; say why you love them.",
        suggested_hook: "“Love thy neighbor.”",
        caption_prompt: "Write a 1-sentence supportive note to a nearby business.",
      },
      {
        platform: "instagram",
        format: "carousel",
        pillar: "Menu",
        idea_title: "Top 3 sandwiches this week",
        idea_description:
          "3 slides with appetizing pics, short description and price; final slide CTA.",
        suggested_hook: "“What are you ordering first?”",
        caption_prompt:
          "Write a short carousel caption listing 3 items with an inviting question.",
      },
    ];

    for (let i = 0; i < 7; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      const t = dailyTemplates[i % dailyTemplates.length];

      items.push({
        content_plan_id: plan.id,
        post_date: toISODate(d),
        platform: t.platform,
        format: t.format,
        pillar: t.pillar,
        idea_title: t.idea_title,
        idea_description: t.idea_description,
        suggested_hook: t.suggested_hook,
        caption_prompt: t.caption_prompt,
      });
    }

    const { data: insertedItems, error: itemsErr } = await supabase
      .from("plan_items")
      .insert(items)
      .select("*");

    if (itemsErr) {
      return NextResponse.json(
        { ok: false, stage: "insert_plan_items", error: itemsErr.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      businessId,
      analysisRunId: run.id,
      contentPlanId: plan.id,
      items: insertedItems,
    });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, stage: "unknown", error: err?.message ?? String(err) },
      { status: 500 }
    );
  }
}
