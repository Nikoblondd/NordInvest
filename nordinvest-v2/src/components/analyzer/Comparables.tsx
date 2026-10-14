"use client";

import { useEffect, useState } from "react";
import { Loader2, ArrowUpRight, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { clsx } from "@/lib/clsx";
import type { ComparablesResult } from "@/lib/comparables";

const kr = (n: number) =>
  `${new Intl.NumberFormat("da-DK", { maximumFractionDigits: 0 }).format(Math.round(n))} kr`;
const krM2 = (n: number) =>
  `${new Intl.NumberFormat("da-DK", { maximumFractionDigits: 0 }).format(Math.round(n))} kr/m²`;

type VerdictTone = {
  label: string;
  bg: string;
  text: string;
  ring: string;
  Icon: typeof TrendingUp;
};

const VERDICT: Record<"under" | "at" | "over" | "far_over", VerdictTone> = {
  under: {
    label: "Under markedet",
    bg: "bg-emerald-50",
    text: "text-emerald-800",
    ring: "ring-emerald-200",
    Icon: TrendingDown,
  },
  at: {
    label: "På markedet",
    bg: "bg-slate-100",
    text: "text-slate-700",
    ring: "ring-slate-200",
    Icon: Minus,
  },
  over: {
    label: "Over markedet",
    bg: "bg-amber-50",
    text: "text-amber-800",
    ring: "ring-amber-200",
    Icon: TrendingUp,
  },
  far_over: {
    label: "Langt over markedet",
    bg: "bg-rose-50",
    text: "text-rose-800",
    ring: "ring-rose-200",
    Icon: TrendingUp,
  },
};

/**
 * Comparables — benchmarks the asking price against similar active Boligsiden
 * listings in the same zip. The single-highest-value UI for a buyer: "am I
 * paying a premium vs what's on the market right now?" Fetches on mount when
 * we have the four inputs; degrades silently on empty samples.
 */
export function Comparables({
  zip,
  type,
  areaM2,
  askingPrice,
}: {
  zip: string;
  type: string;
  areaM2: number;
  askingPrice: number;
}) {
  const [state, setState] = useState<{
    status: "idle" | "loading" | "ok" | "empty" | "fail";
    data?: Extract<ComparablesResult, { ok: true }>;
  }>({ status: "idle" });

  useEffect(() => {
    if (!zip || !areaM2 || !askingPrice) return;
    let cancelled = false;
    setState({ status: "loading" });
    const url = `/api/comparables?zip=${encodeURIComponent(zip)}&type=${encodeURIComponent(
      type,
    )}&area=${Math.round(areaM2)}&price=${Math.round(askingPrice)}`;
    fetch(url)
      .then((r) => r.json())
      .then((j: ComparablesResult) => {
        if (cancelled) return;
        if (j.ok) setState({ status: "ok", data: j });
        else setState({ status: j.reason === "no_matches" ? "empty" : "fail" });
      })
      .catch(() => !cancelled && setState({ status: "fail" }));
    return () => {
      cancelled = true;
    };
  }, [zip, type, areaM2, askingPrice]);

  if (state.status === "idle") return null;

  if (state.status === "loading") {
    // Same height as the loaded card (measured: ~1,015 px on phones, ~675 px
    // wider), so nothing below it jumps when the comparables arrive (CLS).
    return (
      <section aria-busy="true" className="min-h-[1010px] rounded-2xl border border-slate-200/80 bg-white p-5 sm:min-h-[670px] sm:p-8">
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <Loader2 className="h-4 w-4 animate-spin" />
          Henter sammenlignelige boliger fra Boligsiden…
        </div>
        <div aria-hidden className="mt-6 space-y-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-14 animate-pulse rounded-xl bg-slate-100 motion-reduce:animate-none" />
          ))}
        </div>
      </section>
    );
  }

  if (state.status === "empty") {
    return (
      <section className="rounded-2xl border border-slate-200/80 bg-white p-5 sm:p-8">
        <h3 className="text-sm font-semibold text-slate-900">Sammenlignelige boliger</h3>
        <p className="mt-2 text-sm text-slate-500">
          Der er ikke nok sammenlignelige boliger til salg i {zip} lige nu. Listen opdateres løbende.
        </p>
      </section>
    );
  }

  if (state.status === "fail" || !state.data) {
    return null;
  }

  const d = state.data;
  const tone = VERDICT[d.verdict];
  const arrow = d.priceDeltaPct >= 0 ? "+" : "−"; // a real minus; the numbers below are shown unsigned

  return (
    <section className="rounded-2xl border border-slate-200/80 bg-white p-5 sm:p-8">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-[17px] font-semibold text-slate-900">
            Sammenlignelige boliger
          </h3>
          <p className="mt-1 text-xs text-slate-500">
            {d.sampleSize} aktive udbud i {zip} · samme boligtype · ±30 % af arealet
          </p>
        </div>
        <span
          className={clsx(
            "inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ring-1",
            tone.bg,
            tone.text,
            tone.ring,
          )}
        >
          <tone.Icon className="h-3.5 w-3.5" />
          {tone.label}
        </span>
      </div>

      {/* Number bar — asking vs sample median */}
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl bg-slate-50 p-3 ring-1 ring-slate-200">
          <div className="text-xs text-slate-500">Denne bolig</div>
          <div className="mt-1 text-lg font-semibold text-slate-900">
            {krM2(d.askingPricePerM2)}
          </div>
          <div className="text-xs text-slate-500">{kr(d.input.askingPrice)}</div>
        </div>
        <div className="rounded-xl bg-slate-50 p-3 ring-1 ring-slate-200">
          <div className="text-xs text-slate-500">Median i området</div>
          <div className="mt-1 text-lg font-semibold text-slate-900">
            {krM2(d.medianPricePerM2)}
          </div>
          <div className="text-xs text-slate-500">
            IQR {krM2(d.q1PricePerM2)} – {krM2(d.q3PricePerM2)}
          </div>
        </div>
        <div
          className={clsx(
            "rounded-xl p-3 ring-1",
            tone.bg,
            tone.ring,
          )}
        >
          <div className={clsx("text-xs", tone.text)}>Forskel til median</div>
          <div className={clsx("mt-1 text-lg font-semibold", tone.text)}>
            {arrow}
            {Math.abs(d.priceDeltaPct).toLocaleString("da-DK", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}&nbsp;%
          </div>
          <div className={clsx("text-xs", tone.text)}>
            {arrow}
            {kr(Math.abs((d.askingPricePerM2 - d.medianPricePerM2) * d.input.area))} total
          </div>
        </div>
      </div>

      {/* Closest 6 comparables — shown as a compact list, each linking to
          Boligsiden so the user can dig deeper. */}
      <div className="mt-5">
        <div className="mb-2 text-[13px] font-semibold text-slate-500">
          Nærmeste sammenlignelige
        </div>
        <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200">
          {d.comparables.map((c, i) => (
            <li key={`${c.url}-${i}`} className="flex items-start justify-between gap-3 px-3.5 py-3">
              <div className="min-w-0">
                <a
                  href={c.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 truncate text-sm font-medium text-slate-900 hover:text-slate-700"
                >
                  <span className="truncate">{c.address}</span>
                  <ArrowUpRight className="h-3.5 w-3.5 flex-shrink-0 text-slate-400" />
                </a>
                <div className="mt-0.5 text-xs leading-snug text-slate-500">
                  {kr(c.price)} · {c.zipCode} {c.city}
                  {c.rooms ? ` · ${c.rooms} vær` : ""}
                  {c.yearBuilt ? ` · opført ${c.yearBuilt}` : ""}
                  {c.daysOnMarket != null ? ` · ${c.daysOnMarket} dage til salg` : ""}
                </div>
              </div>
              <div className="shrink-0 text-right">
                <div className="whitespace-nowrap text-sm font-semibold tabular-nums text-slate-900">{krM2(c.pricePerM2)}</div>
                <div className="whitespace-nowrap text-xs tabular-nums text-slate-500">{c.area} m²</div>
              </div>
            </li>
          ))}
        </ul>
      </div>

      <p className="mt-3 text-xs text-slate-500">
        Kilde: Boligsiden aktive udbud. Median og IQR beregnes på hele stikprøven, ikke kun de viste 6.
      </p>
    </section>
  );
}
