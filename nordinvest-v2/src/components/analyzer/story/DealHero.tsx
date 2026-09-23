"use client";

import { useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { ExternalLink, Images as ImagesIcon, MapPin, AlertTriangle } from "lucide-react";
import { clsx } from "@/lib/clsx";
import { Lightbox } from "@/components/analyzer/PropertyGallery";
import { type Tone, toneDot, toneRing, toneText } from "./tone";

export type HeroMetric = {
  label: string;
  value: string;
  unit?: string;
  tone: Tone;
};

/**
 * The verdict, presented like the cover of the deal: the property's own photo
 * full-bleed, a heavy scrim, one headline, an animated score ring and the four
 * numbers everything else leads to. This is the "wow" moment — the rest of the
 * page is the evidence behind it.
 */
export function DealHero({
  images,
  address,
  score,
  rating,
  headline,
  verdict,
  tone,
  notes,
  metrics,
  probability,
  listingUrl,
  sourceLabel,
  kindLabel,
}: {
  images: string[];
  address: string | null;
  score: number;
  rating: string;
  headline: string;
  verdict: string;
  tone: Tone;
  notes: string[];
  metrics: HeroMetric[];
  probability: { pct: number; runs: number } | null;
  listingUrl: string | null;
  sourceLabel: string;
  kindLabel: string | null;
}) {
  const [lightboxAt, setLightboxAt] = useState<number | null>(null);
  const hero = images[0];

  return (
    <section
      id="overblik"
      className="relative scroll-mt-36 overflow-hidden rounded-3xl bg-slate-950 text-white shadow-[0_30px_60px_-24px_rgba(2,6,23,0.55),0_2px_6px_rgba(2,6,23,0.2)]"
      aria-label="Dommen over handlen"
    >
      {/* Photo layer, or a textured navy surface when the listing had no photos */}
      {hero ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={hero}
          alt={address ? `Foto af ${address}` : "Foto af ejendommen"}
          className="absolute inset-0 h-full w-full object-cover"
          loading="eager"
        />
      ) : (
        <div
          aria-hidden
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(circle at 85% 0%, rgba(37,99,235,0.35), transparent 45%), linear-gradient(135deg, #0b1220 0%, #0f172a 55%, #111b31 100%)",
          }}
        >
          <div
            className="absolute inset-0 opacity-[0.07]"
            style={{
              backgroundImage:
                "linear-gradient(rgba(255,255,255,.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.6) 1px, transparent 1px)",
              backgroundSize: "30px 30px",
            }}
          />
        </div>
      )}
      {/* Scrims — bottom-heavy so text always reads, left-heavy for the headline column */}
      <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/80 to-slate-950/10" />
      <div aria-hidden className="absolute inset-0 bg-gradient-to-r from-slate-950/70 via-slate-950/10 to-transparent" />

      <div className="relative flex min-h-[520px] flex-col justify-between gap-8 p-4 sm:min-h-[480px] sm:p-7 lg:p-8">
        {/* Top row — where it came from + photo access */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            {listingUrl && (
              <a
                href={listingUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold text-white ring-1 ring-inset ring-white/20 backdrop-blur-md transition hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
              >
                Opslaget på {sourceLabel}
                <ExternalLink size={12} strokeWidth={1.8} />
              </a>
            )}
            {kindLabel && (
              <span className="inline-flex items-center rounded-full bg-white/10 px-3 py-1.5 text-xs font-medium text-white/80 ring-1 ring-inset ring-white/15 backdrop-blur-md">
                {kindLabel}
              </span>
            )}
          </div>
          {images.length > 0 && (
            <button
              onClick={() => setLightboxAt(0)}
              className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-slate-900 shadow-btn transition hover:bg-slate-100 active:translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900"
            >
              <ImagesIcon size={13} strokeWidth={1.8} />
              {images.length} billeder
            </button>
          )}
        </div>

        {/* Verdict block */}
        <div className="space-y-6">
          <div className="flex items-end justify-between gap-4">
            <div className="min-w-0 max-w-2xl">
              {address && (
                <div className="flex min-w-0 items-start gap-1.5 text-sm text-white/70">
                  <MapPin size={14} strokeWidth={1.8} className="mt-0.5 shrink-0" />
                  <span className="min-w-0 sm:truncate">{address}</span>
                </div>
              )}
              <h2 className="mt-2 font-display text-4xl font-bold leading-[1.02] tracking-[-0.03em] [text-wrap:balance] sm:text-5xl lg:text-6xl">
                {headline}
              </h2>
              <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-white/80 sm:text-base">{verdict}</p>
              {notes.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {notes.map((n) => (
                    <span
                      key={n}
                      className="inline-flex items-start gap-1.5 rounded-xl bg-amber-400/15 px-2.5 py-1.5 text-xs font-medium leading-snug text-amber-100 ring-1 ring-inset ring-amber-300/30"
                    >
                      <AlertTriangle size={13} strokeWidth={1.8} className="mt-px shrink-0" />
                      {n}
                    </span>
                  ))}
                </div>
              )}
            </div>
            <ScoreRing score={score} rating={rating} tone={tone} />
          </div>

          {/* The four numbers — glass chips over the photo */}
          {/* 2×2 whenever the results column is narrow (phones, and the
              two-column lg layout); a 4-up strip when there's room. */}
          <div className="grid grid-cols-2 gap-2 sm:gap-3 md:grid-cols-4 lg:grid-cols-2 xl:grid-cols-4">
            {metrics.map((m) => (
              <div
                key={m.label}
                className="min-w-0 rounded-2xl bg-white/[0.08] p-3 ring-1 ring-inset ring-white/15 backdrop-blur-md sm:p-4"
              >
                <div className="flex items-center gap-1.5 text-[11px] font-medium text-white/65 sm:text-xs">
                  <span className={clsx("h-1.5 w-1.5 shrink-0 rounded-full", toneDot[m.tone])} />
                  <span className="truncate">{m.label}</span>
                </div>
                <div className="mt-1.5 flex items-baseline gap-1 whitespace-nowrap">
                  <span className="font-display text-2xl font-semibold tabular-nums tracking-[-0.02em] sm:text-[28px]">
                    {m.value}
                  </span>
                  {m.unit && <span className="text-xs font-medium text-white/55">{m.unit}</span>}
                </div>
              </div>
            ))}
          </div>

          {probability && (
            <div className="flex items-center gap-3 text-xs text-white/65">
              <div className="h-1.5 w-28 shrink-0 overflow-hidden rounded-full bg-white/15 sm:w-40">
                <div
                  className={clsx("h-full rounded-full", toneDot[probability.pct >= 60 ? "good" : probability.pct >= 30 ? "warn" : "bad"])}
                  style={{ width: `${Math.max(3, probability.pct)}%` }}
                />
              </div>
              <span>
                <b className="font-semibold text-white">{probability.pct} %</b> chance for positivt cash flow på tværs af{" "}
                {probability.runs.toLocaleString("da-DK")} scenarier
              </span>
            </div>
          )}
        </div>
      </div>

      {lightboxAt !== null && (
        <Lightbox images={images} startIdx={lightboxAt} onClose={() => setLightboxAt(null)} address={address} />
      )}
    </section>
  );
}

function ScoreRing({ score, rating, tone }: { score: number; rating: string; tone: Tone }) {
  const reduce = useReducedMotion();
  const clamped = Math.max(0, Math.min(100, score));
  return (
    <div className="relative h-28 w-28 shrink-0 sm:h-40 sm:w-40" role="img" aria-label={`Score ${score} af 100 — ${rating}`}>
      <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
        <circle cx="60" cy="60" r="52" fill="rgba(2,6,23,0.35)" stroke="rgba(255,255,255,0.14)" strokeWidth="8" />
        <motion.circle
          cx="60"
          cy="60"
          r="52"
          fill="none"
          strokeWidth="8"
          strokeLinecap="round"
          className={toneRing[tone]}
          initial={reduce ? false : { pathLength: 0 }}
          animate={{ pathLength: clamped / 100 }}
          transition={{ duration: 1.1, ease: [0.2, 0.7, 0.2, 1] }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-display text-4xl font-bold leading-none tabular-nums tracking-[-0.03em] sm:text-6xl">{score}</span>
        <span className={clsx("mt-1 text-[10px] font-semibold uppercase tracking-[0.14em] sm:text-xs", toneText[tone])}>
          {rating}
        </span>
      </div>
    </div>
  );
}
