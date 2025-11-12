"use client";
import { useEffect, useMemo, useState } from "react";

type Biz = { id: string; name: string; city: string | null; created_at: string };
type PlanItem = {
  id: string; post_date: string; platform: string; format: string;
  pillar: string | null; idea_title: string | null; idea_description: string | null;
  suggested_hook: string | null; caption_prompt: string | null;
};

export default function PlanPage() {
  const [businesses, setBusinesses] = useState<Biz[]>([]);
  const [bizId, setBizId] = useState<string>("");
  const [items, setItems] = useState<PlanItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [genLoading, setGenLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  // load businesses on mount
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/businesses");
        const data = await res.json();
        if (data.ok) {
          setBusinesses(data.businesses);
          // restore last selection
          const saved = localStorage.getItem("selectedBizId");
          if (saved && data.businesses.some((b: Biz) => b.id === saved)) {
            setBizId(saved);
            void loadPlan(saved);
          }
        } else {
          setErr(data.error || "Failed loading businesses");
        }
      } catch (e: any) {
        setErr(e.message);
      }
    })();
  }, []);

  async function loadPlan(targetBizId: string) {
    try {
      setLoading(true); setErr(null); setMsg(null);
      const res = await fetch(`/api/content-plans?businessId=${targetBizId}`);
      const data = await res.json();
      if (!data.ok) {
        setItems([]);
        setErr(data.error ?? "No plan found. Try generating one.");
        return;
      }
      setItems(data.items);
      setMsg(`Loaded ${data.items.length} items`);
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function generatePlan() {
    if (!bizId) { setErr("Pick a business first"); return; }
    try {
      setGenLoading(true); setErr(null); setMsg(null);
      const body = JSON.stringify({ businessId: bizId });
      // our POST accepts demo params; we’ll add businessId support now:
      const res = await fetch("/api/analysis-runs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Generate failed");
      setMsg("New 7-day plan created");
      await loadPlan(bizId);
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setGenLoading(false);
    }
  }

  function onSelectBiz(id: string) {
    setBizId(id);
    localStorage.setItem("selectedBizId", id);
    void loadPlan(id);
  }

  const selectedBiz = useMemo(
    () => businesses.find(b => b.id === bizId),
    [businesses, bizId]
  );

  return (
    <div className="max-w-3xl mx-auto p-5 space-y-4">
      <h1 className="text-2xl font-semibold">Content Plan</h1>

      {/* Business picker */}
      <div className="flex gap-2">
        <select
          className="border rounded px-3 py-2 w-full"
          value={bizId}
          onChange={(e) => onSelectBiz(e.target.value)}
        >
          <option value="">Select a business…</option>
          {businesses.map(b => (
            <option key={b.id} value={b.id}>
              {b.name}{b.city ? ` — ${b.city}` : ""}
            </option>
          ))}
        </select>
        <button
          className="rounded px-4 py-2 bg-black text-white disabled:opacity-50"
          onClick={generatePlan}
          disabled={!bizId || genLoading}
        >
          {genLoading ? "Generating…" : "Generate 7-Day"}
        </button>
      </div>

      {selectedBiz && (
        <div className="text-sm text-gray-600">
          Selected: <b>{selectedBiz.name}</b>{selectedBiz.city ? `, ${selectedBiz.city}` : ""}
        </div>
      )}

      {msg && <div className="text-green-700 text-sm">{msg}</div>}
      {err && <div className="text-red-600 text-sm">{err}</div>}

      {/* Items */}
      <div className="grid gap-3">
        {items.map(it => (
          <div key={it.id} className="border rounded-lg p-4">
            <div className="text-sm text-gray-500">{it.post_date}</div>
            <div className="font-medium">
              {it.platform.toUpperCase()} • {it.format}{it.pillar ? ` • ${it.pillar}` : ""}
            </div>
            {it.idea_title && <div className="mt-1">{it.idea_title}</div>}
            {it.idea_description && <div className="text-sm text-gray-700">{it.idea_description}</div>}
            {it.suggested_hook && <div className="mt-2 italic">Hook: {it.suggested_hook}</div>}
            {it.caption_prompt && <div className="mt-1 text-sm">Caption prompt: {it.caption_prompt}</div>}
          </div>
        ))}
        {!loading && items.length === 0 && bizId && (
          <div className="text-sm text-gray-600">
            No plan yet — click <b>Generate 7-Day</b>.
          </div>
        )}
      </div>
    </div>
  );
}
