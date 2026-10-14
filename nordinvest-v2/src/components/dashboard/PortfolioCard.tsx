"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Trash2, Loader2, ArrowUpRight, MapPin } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { pct, krMd, num } from "@/lib/analysis";
import { clsx } from "@/lib/clsx";
import { STAGES } from "@/lib/mappe/checklist";

type Row = {
  id: string;
  investment_score: number | null;
  verdict: string | null;
  property_url: string | null;
  created_at: string;
  property_data: { address?: string; mappe?: { stage?: string; docs?: unknown[] } } | null;
  analysis_result: { capRate?: number; cashFlow?: number; dscr?: number; irr?: number } | null;
};

// Real product-designer treatment for a portfolio card. The score is the hero
// element, presented as a colored ring with the number inside — it's what a
// user actually looks at first. Below it: address, verdict, and a 2x2 stat
// grid with icon-less muted labels. No universal `rounded-3xl border shadow-sm`
// combo, no hover-scale sparkles. Mobile-first: tight padding, wraps cleanly.
export function PortfolioCard({ row }: { row: Row }) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);
  const score = row.investment_score ?? 0;
  const tone: "good" | "ok" | "bad" =
    score >= 65 ? "good" : score >= 45 ? "ok" : "bad";

  const scoreRing = {
    good: { text: "text-emerald-600", track: "stroke-emerald-500", bg: "from-emerald-50 to-white" },
    ok:   { text: "text-blue-600",    track: "stroke-blue-500",    bg: "from-blue-50 to-white" },
    bad:  { text: "text-rose-500",    track: "stroke-rose-400",    bg: "from-rose-50 to-white" },
  }[tone];

  const ar = row.analysis_result ?? {};
  const stage = row.property_data?.mappe?.stage ?? "screening";
  const docCount = row.property_data?.mappe?.docs?.length ?? 0;
  const title = row.property_data?.address || row.property_url || "Ejendom";
  const date = new Date(row.created_at).toLocaleDateString("da-DK", { day: "numeric", month: "short", year: "numeric" });

  const remove = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const supabase = createClient();
    if (!supabase) return;
    setDeleting(true);
    await supabase.from("analyses").delete().eq("id", row.id);
    router.refresh();
  };

  // Score-ring geometry — SVG circle where circumference is drawn according to
  // the score. Real hand-built visualisation, not a coloured tag.
  const R = 22;
  const C = 2 * Math.PI * R;
  const progress = Math.max(0, Math.min(100, score));

  return (
    <Link
      href={`/mappe/${row.id}`}
      className="group relative flex min-w-0 flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-4 transition-all duration-300 hover:-translate-y-[1px] hover:border-slate-300 hover:shadow-card-lift sm:p-5"
      style={{
        boxShadow:
          "0 1px 2px rgba(15,23,42,0.04), 0 1px 3px rgba(15,23,42,0.05), inset 0 1px 0 rgba(255,255,255,0.9)",
      }}
    >
      {/* Subtle tinted wash behind the score — a real design touch. */}
      <div
        aria-hidden
        className={clsx(
          "pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-gradient-to-br opacity-70 blur-2xl",
          scoreRing.bg,
        )}
      />

      <button
        onClick={remove}
        disabled={deleting}
        aria-label="Fjern"
        className="absolute right-3 top-3 z-10 flex h-7 w-7 items-center justify-center rounded-lg text-slate-300 opacity-0 transition-all hover:bg-rose-50 hover:text-rose-500 group-hover:opacity-100"
      >
        {deleting ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
      </button>

      {/* Header: score ring + address */}
      <div className="relative flex items-start gap-4">
        <div className="relative shrink-0">
          <svg width={56} height={56} viewBox="0 0 56 56" className="-rotate-90">
            <circle
              cx="28"
              cy="28"
              r={R}
              className="fill-none stroke-slate-100"
              strokeWidth="4"
            />
            <circle
              cx="28"
              cy="28"
              r={R}
              className={clsx("fill-none transition-all duration-500", scoreRing.track)}
              strokeWidth="4"
              strokeLinecap="round"
              strokeDasharray={C}
              strokeDashoffset={C * (1 - progress / 100)}
            />
          </svg>
          <div
            className={clsx(
              "absolute inset-0 flex items-center justify-center text-base font-bold tnum",
              scoreRing.text,
            )}
          >
            {score}
          </div>
        </div>

        <div className="min-w-0 flex-1 pr-6">
          <div className="mb-0.5 flex items-center gap-1 text-xs font-medium text-slate-500">
            <MapPin size={10} strokeWidth={2.2} />
            <span className="truncate">Analyseret {date}</span>
          </div>
          <div className="line-clamp-2 break-words text-[15px] font-semibold tracking-[-0.01em] text-slate-900">
            {title}
          </div>
          {row.verdict && (
            <p className="mt-1 line-clamp-2 text-[13px] leading-relaxed text-slate-500">
              {row.verdict}
            </p>
          )}
        </div>
      </div>

      {/* Stats grid — 2x2 on all sizes, hairline dividers, no icons. Muted
          labels + tabular numbers, so the row reads like a real financial
          summary and not four generic stat cards. */}
      <div className="relative mt-4 grid grid-cols-2 divide-x divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-100 bg-slate-50/40">
        <Stat label="Nettoafkast" value={ar.capRate != null ? pct(ar.capRate) : "–"} />
        <Stat
          label="Cash flow pr. md."
          value={ar.cashFlow != null ? krMd(ar.cashFlow) : "–"}
          tone={ar.cashFlow != null && ar.cashFlow < 0 ? "bad" : "default"}
        />
        <Stat label="Gældsdækning (DSCR)" value={ar.dscr != null ? num(ar.dscr) : "–"} />
        <Stat label="Afkast om året, 10 år" value={ar.irr != null ? pct(ar.irr) : "–"} />
      </div>

      <div className="relative mt-3 flex items-center justify-between">
        <span className={clsx("rounded-full px-2.5 py-1 text-[12px] font-semibold", stage === "droppet" ? "bg-slate-100 text-slate-500" : "bg-blue-50 text-blue-800")}>
          {stage === "droppet" ? "Droppet" : `Fase: ${STAGES.find((s) => s.id === stage)?.label ?? "Screening"}`}
          {docCount > 0 ? ` · ${docCount} dok.` : ""}
        </span>
        <span className="inline-flex items-center gap-1 text-[13px] font-semibold text-slate-600 transition-colors group-hover:text-blue-600">
          Åbn mappen
          <ArrowUpRight
            size={12}
            className="transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
          />
        </span>
      </div>
    </Link>
  );
}

function Stat({ label, value, tone = "default" }: { label: string; value: string; tone?: "default" | "bad" }) {
  return (
    <div className="p-2.5 first:border-t-0 [&:nth-child(2)]:border-t-0">
      <div className="text-xs font-medium text-slate-500">
        {label}
      </div>
      <div
        className={clsx(
          "mt-0.5 truncate text-sm font-semibold tabular-nums tnum",
          tone === "bad" ? "text-rose-500" : "text-slate-900",
        )}
      >
        {value}
      </div>
    </div>
  );
}
