"use client";

import { useState } from "react";
import Link from "next/link";
import { Bell, BellRing, ExternalLink, Trash2, TrendingDown, TrendingUp, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { clsx } from "@/lib/clsx";
import { type Watch, STATUS_LABEL, krFull, priceDelta, sparklinePath } from "@/lib/vagt";

function Sparkline({ w }: { w: Watch }) {
  const pts = w.price_history ?? [];
  // Compact sparkline sized for mobile — 88x28 keeps room for the price beside
  // it even on the tightest phone widths.
  const path = sparklinePath(pts, 88, 28);
  if (!path) return null;
  const down = (w.current_price ?? 0) <= (w.baseline_price ?? Infinity);
  const stroke = down ? "#059669" : "#f59e0b";
  return (
    <svg width={88} height={28} viewBox="0 0 88 28" className="overflow-visible">
      <path d={path} fill="none" stroke={stroke} strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function Card({ w, onRemove }: { w: Watch; onRemove: (id: string) => void }) {
  const [removing, setRemoving] = useState(false);
  const delta = priceDelta(w.baseline_price, w.current_price);
  const statusTone =
    w.status === "price_drop" ? "bg-emerald-50 text-emerald-700 ring-emerald-100"
    : w.status === "price_rise" ? "bg-amber-50 text-amber-700 ring-amber-100"
    : w.status === "sold" ? "bg-slate-100 text-slate-600 ring-slate-200"
    : w.status === "error" ? "bg-rose-50 text-rose-600 ring-rose-100"
    : "bg-slate-50 text-slate-600 ring-slate-200";

  const remove = async () => {
    const supabase = createClient();
    if (!supabase) return;
    setRemoving(true);
    const { error } = await supabase.from("watches").delete().eq("id", w.id);
    if (!error) onRemove(w.id);
    else setRemoving(false);
  };

  const checked = w.last_checked_at
    ? new Date(w.last_checked_at).toLocaleDateString("da-DK", { day: "numeric", month: "short" })
    : "endnu ikke tjekket";

  return (
    <div
      className={clsx(
        "relative flex min-w-0 flex-col overflow-hidden rounded-2xl border bg-white p-4 transition-all duration-300 hover:-translate-y-[1px] hover:shadow-card-lift sm:p-5",
        w.has_alert ? "border-emerald-300/70 ring-1 ring-emerald-100" : "border-slate-200/80",
      )}
      style={{
        boxShadow:
          "0 1px 2px rgba(15,23,42,0.04), 0 1px 3px rgba(15,23,42,0.05), inset 0 1px 0 rgba(255,255,255,0.9)",
      }}
    >
      <div className="flex items-start justify-between gap-2 min-w-0">
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold text-slate-900">{w.address || "Ejendom"}</div>
          <div className="mt-0.5 truncate text-xs text-slate-500">Tjekket {checked}</div>
        </div>
        <span className={clsx("shrink-0 rounded-md px-1.5 py-0.5 text-xs font-semibold ring-1 ring-inset", statusTone)}>
          {STATUS_LABEL[w.status]}
        </span>
      </div>

      <div className="mt-3 flex items-end justify-between gap-2 min-w-0">
        <div className="min-w-0">
          <div className="truncate text-xl font-semibold tracking-[-0.02em] text-slate-900 tnum sm:text-2xl">{krFull(w.current_price)}</div>
          {delta && delta.dir !== "flat" && (
            <div className={clsx("mt-0.5 flex items-center gap-1 text-xs font-semibold tnum sm:text-xs",
              delta.dir === "down" ? "text-emerald-600" : "text-amber-600")}>
              {delta.dir === "down" ? <TrendingDown size={12} /> : <TrendingUp size={12} />}
              <span className="truncate">{delta.text} <span className="font-normal text-slate-400">siden start</span></span>
            </div>
          )}
        </div>
        <div className="shrink-0 opacity-90"><Sparkline w={w} /></div>
      </div>

      {w.current_score != null && (
        <div className="mt-3 inline-flex w-fit items-center gap-1.5 rounded-md bg-slate-50 px-2 py-0.5 text-xs font-semibold text-slate-600 ring-1 ring-inset ring-slate-200">
          Score {w.current_score}/100
          {w.baseline_score != null && w.current_score !== w.baseline_score && (
            <span className={w.current_score > w.baseline_score ? "text-emerald-600" : "text-rose-500"}>
              ({w.current_score > w.baseline_score ? "+" : ""}{w.current_score - w.baseline_score})
            </span>
          )}
        </div>
      )}

      {w.has_alert && w.last_alert && (
        <div className="mt-3 flex items-start gap-2 rounded-lg bg-emerald-50 px-2.5 py-2 text-xs leading-snug text-emerald-800 ring-1 ring-inset ring-emerald-100 sm:text-xs">
          <BellRing size={13} className="mt-0.5 shrink-0" /> {w.last_alert}
        </div>
      )}

      {/* Action row — wraps naturally on phone. Stop is an icon-only ghost
          button aligned to the right, so it never crowds the primary CTA. */}
      <div className="mt-4 flex flex-wrap items-center gap-1.5 border-t border-slate-100 pt-3">
        <Link href={`/app/analyser?url=${encodeURIComponent(w.listing_url)}`}
          className="rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white shadow-btn ring-1 ring-inset ring-white/10 transition-colors hover:bg-slate-800 sm:text-xs">
          Analysér igen
        </Link>
        <a href={w.listing_url} target="_blank" rel="noopener noreferrer"
          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition-colors hover:border-slate-300 hover:bg-slate-50 sm:text-xs">
          <ExternalLink size={11} /> Annonce
        </a>
        <button
          onClick={remove}
          disabled={removing}
          aria-label="Stop vagt"
          title="Stop vagt"
          className="ml-auto inline-flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-600 disabled:opacity-50"
        >
          {removing ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
        </button>
      </div>
    </div>
  );
}

export function VagtPanel({ initial }: { initial: Watch[] }) {
  const [watches, setWatches] = useState<Watch[]>(initial);
  const remove = (id: string) => setWatches((ws) => ws.filter((w) => w.id !== id));
  const alerts = watches.filter((w) => w.has_alert).length;

  return (
    <section className="mt-8 sm:mt-10">
      <div className="flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-lg font-bold sm:text-xl">
          <Bell size={17} className="text-blue-600" /> Vagt
          {alerts > 0 && (
            <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700">
              {alerts} {alerts === 1 ? "ny" : "nye"}
            </span>
          )}
        </h2>
        <span className="shrink-0 text-xs text-slate-400 sm:text-sm">
          {watches.length} {watches.length === 1 ? "bolig" : "boliger"}
        </span>
      </div>

      {watches.length === 0 ? (
        <div className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-center sm:p-8">
          <p className="text-sm text-slate-600">
            Ingen boliger under overvågning endnu. Analysér en annonce og tryk <b>&ldquo;Overvåg for prisændringer&rdquo;</b> —
            så tjekker vi prisen dagligt og siger til, når en handel bliver interessant.
          </p>
        </div>
      ) : (
        <div className="mt-4 grid gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
          {watches.map((w) => (
            <Card key={w.id} w={w} onRemove={remove} />
          ))}
        </div>
      )}
    </section>
  );
}
