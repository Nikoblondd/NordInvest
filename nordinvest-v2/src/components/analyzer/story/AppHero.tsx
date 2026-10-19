"use client";

import { useState } from "react";
import { AlertTriangle, ArrowUpRight, Expand } from "lucide-react";
import { clsx } from "@/lib/clsx";
import { Lightbox } from "@/components/analyzer/PropertyGallery";
import { HOME_ILLUSTRATION } from "@/components/app/PropertyImage";
import type { HeroMetric } from "./DealHero";
import type { Tone } from "./tone";

/*
 * The verdict inside the app: one light card with the listing photo, the
 * answer in a sentence, the score and the four numbers that decide the deal.
 * Everything deeper sits in the tabs below it.
 */

const RING: Record<Tone, string> = { good: "stroke-emerald-500", warn: "stroke-amber-500", bad: "stroke-rose-500", neutral: "stroke-slate-400" };
const TEXT: Record<Tone, string> = { good: "text-emerald-700", warn: "text-amber-700", bad: "text-rose-600", neutral: "text-slate-900" };
const CHIP: Record<Tone, string> = { good: "bg-emerald-50 text-emerald-800 ring-emerald-200", warn: "bg-amber-50 text-amber-900 ring-amber-200", bad: "bg-rose-50 text-rose-700 ring-rose-200", neutral: "bg-slate-100 text-slate-700 ring-slate-200" };

export function AppHero({ images: all, address, score, headline, verdict, tone, notes, metrics, probability, listingUrl, sourceLabel, kindLabel }: {
  images: string[]; address: string | null; score: number; headline: string; verdict: string; tone: Tone; notes: string[];
  metrics: HeroMetric[]; probability: { pct: number; runs: number } | null; listingUrl: string | null; sourceLabel: string; kindLabel: string | null;
}) {
  const [failed, setFailed] = useState<string[]>([]);
  const [lightbox, setLightbox] = useState<number | null>(null);
  const images = all.filter((s) => !failed.includes(s));
  const photo = images[0];
  const [street, ...rest] = (address ?? "Din analyse").split(",");
  const c = 2 * Math.PI * 30;

  return (
    <section id="overblik" className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
      <div className="grid grid-cols-1 md:grid-cols-[260px_minmax(0,1fr)] lg:grid-cols-[300px_minmax(0,1fr)]">
        <div className="relative aspect-[16/10] bg-slate-100 md:aspect-auto md:min-h-[240px]">
          {photo ? (
            <button type="button" onClick={() => setLightbox(0)} className="group absolute inset-0" aria-label="Se billederne">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={photo} alt={address ?? ""} onError={() => setFailed((f) => [...f, photo])} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.02]" />
              {images.length > 1 && <span className="absolute bottom-3 left-3 inline-flex items-center gap-1.5 rounded-full bg-black/55 px-2.5 py-1 text-[12px] font-semibold text-white backdrop-blur"><Expand size={12} /> {images.length} billeder</span>}
            </button>
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={HOME_ILLUSTRATION} alt="" className="absolute inset-0 h-full w-full bg-white object-contain p-6" />
          )}
        </div>
        <div className="min-w-0 p-5 sm:p-6">
          <div className="flex flex-wrap items-center gap-2 text-[13px]">
            {kindLabel && <span className="rounded-md bg-slate-100 px-2 py-0.5 font-semibold text-slate-700">{kindLabel}</span>}
            {listingUrl && <a href={listingUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-0.5 font-medium text-blue-700 hover:underline">Annoncen på {sourceLabel} <ArrowUpRight size={13} /></a>}
          </div>
          <h1 className="mt-2 text-[22px] font-semibold leading-tight tracking-[-0.02em] text-slate-900 [text-wrap:balance] sm:text-[26px]">{street}</h1>
          {rest.length > 0 && <p className="text-[14px] text-slate-500">{rest.join(",").trim()}</p>}
          <div className="mt-4 flex items-start gap-4">
            <svg width="72" height="72" viewBox="0 0 72 72" className="shrink-0" aria-label={`Score ${score} af 100`}>
              <circle cx="36" cy="36" r="30" fill="none" className="stroke-slate-100" strokeWidth="6" />
              <circle cx="36" cy="36" r="30" fill="none" className={RING[tone]} strokeWidth="6" strokeLinecap="round" strokeDasharray={`${(c * Math.max(0, Math.min(100, score))) / 100} ${c}`} transform="rotate(-90 36 36)" />
              <text x="36" y="40" textAnchor="middle" fontSize="20" fontWeight="700" className="fill-slate-900">{score}</text>
            </svg>
            <div className="min-w-0">
              <p className={clsx("text-[20px] font-semibold leading-tight tracking-[-0.01em]", TEXT[tone])}>{headline}</p>
              <p className="mt-1 text-[15px] leading-relaxed text-slate-600">{verdict}</p>
            </div>
          </div>
          {notes.length > 0 && (
            <ul className="mt-3 space-y-1">
              {notes.map((n) => <li key={n} className="flex items-start gap-1.5 text-[13px] font-medium text-amber-800"><AlertTriangle size={14} className="mt-[2px] shrink-0" />{n}</li>)}
            </ul>
          )}
        </div>
      </div>
      <div className="grid grid-cols-2 border-t border-slate-100 lg:grid-cols-4">
        {metrics.map((m, i) => (
          <div key={m.label} className={clsx("min-w-0 p-4 sm:p-5", i % 2 === 1 && "border-l border-slate-100", i >= 2 && "border-t border-slate-100 lg:border-t-0", i === 2 && "lg:border-l")}>
            <p className="truncate text-[13px] font-medium text-slate-500">{m.label}</p>
            <p className={clsx("mt-1 text-[24px] font-semibold leading-none tabular-nums tracking-[-0.02em]", TEXT[m.tone])}>{m.value}{m.unit && <span className="ml-1 text-[13px] font-medium text-slate-500">{m.unit}</span>}</p>
            {m.note && <p className="mt-1.5 text-[12px] leading-snug text-slate-500">{m.note}</p>}
          </div>
        ))}
      </div>
      {probability && (
        <p className="border-t border-slate-100 px-5 py-3 text-[13px] text-slate-600">
          <span className={clsx("mr-1.5 rounded-md px-1.5 py-0.5 font-semibold ring-1", CHIP[probability.pct >= 60 ? "good" : probability.pct >= 35 ? "warn" : "bad"])}>{probability.pct} %</span>
          sandsynlighed for positivt cash flow, regnet på {probability.runs.toLocaleString("da-DK")} scenarier med forskellig leje, rente og tomgang.
        </p>
      )}
      {lightbox !== null && <Lightbox images={images} startIdx={lightbox} onClose={() => setLightbox(null)} address={address} />}
    </section>
  );
}
