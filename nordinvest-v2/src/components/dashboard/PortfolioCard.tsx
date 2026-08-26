"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { pct, krMd, num } from "@/lib/analysis";
import { clsx } from "@/lib/clsx";

type Row = {
  id: string;
  investment_score: number | null;
  verdict: string | null;
  property_url: string | null;
  created_at: string;
  property_data: { address?: string } | null;
  analysis_result: { capRate?: number; cashFlow?: number; dscr?: number; irr?: number } | null;
};

export function PortfolioCard({ row }: { row: Row }) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);
  const score = row.investment_score ?? 0;
  const tone = score >= 65 ? "text-emerald-600" : score >= 45 ? "text-blue-600" : "text-rose-500";
  const ar = row.analysis_result ?? {};
  const title = row.property_data?.address || row.property_url || "Ejendom";
  const date = new Date(row.created_at).toLocaleDateString("da-DK", { day: "numeric", month: "short", year: "numeric" });

  const remove = async () => {
    const supabase = createClient();
    if (!supabase) return;
    setDeleting(true);
    await supabase.from("analyses").delete().eq("id", row.id);
    router.refresh();
  };

  return (
    <div className="group relative flex flex-col rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-lg">
      <button
        onClick={remove}
        disabled={deleting}
        aria-label="Fjern"
        className="absolute right-4 top-4 text-slate-300 opacity-0 transition-all hover:text-rose-500 group-hover:opacity-100"
      >
        {deleting ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
      </button>

      <div className="flex items-start justify-between gap-3">
        <div className={clsx("text-4xl font-bold tnum", tone)}>
          {score}
          <span className="text-lg text-slate-300">/100</span>
        </div>
      </div>
      <div className="mt-1 truncate text-sm font-medium text-slate-900">{title}</div>
      {row.verdict && <p className="mt-1 line-clamp-2 text-xs text-slate-500">{row.verdict}</p>}

      <div className="mt-4 grid grid-cols-2 gap-3 border-t border-slate-100 pt-4 text-sm">
        <Stat label="Cap rate" value={ar.capRate != null ? pct(ar.capRate) : "–"} />
        <Stat label="Cash flow" value={ar.cashFlow != null ? krMd(ar.cashFlow) : "–"} tone={ar.cashFlow != null && ar.cashFlow < 0 ? "text-rose-500" : "text-slate-900"} />
        <Stat label="DSCR" value={ar.dscr != null ? num(ar.dscr) : "–"} />
        <Stat label="IRR" value={ar.irr != null ? pct(ar.irr) : "–"} />
      </div>
      <div className="mt-4 text-[11px] text-slate-400">Gemt {date}</div>
    </div>
  );
}

function Stat({ label, value, tone = "text-slate-900" }: { label: string; value: string; tone?: string }) {
  return (
    <div>
      <div className="text-[11px] uppercase tracking-wide text-slate-400">{label}</div>
      <div className={clsx("font-semibold tnum", tone)}>{value}</div>
    </div>
  );
}
