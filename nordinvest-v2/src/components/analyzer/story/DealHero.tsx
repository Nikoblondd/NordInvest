"use client";

import { useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { AlertTriangle, ArrowUpRight, Expand } from "lucide-react";
import { clsx } from "@/lib/clsx";
import { Lightbox } from "@/components/analyzer/PropertyGallery";
import { type Tone, toneRing, toneText } from "./tone";

export type HeroMetric = {
  label: string;
  value: string;
  unit?: string;
  tone: Tone;
};

const toneWord: Record<Tone, string> = { good: "godt", warn: "middel", bad: "svagt", neutral: "" };

/**
 * The verdict, as the cover of the deal. A full-width dark band: the headline
 * and score on the left, the listing's own photo on the right (the one image in
 * the system that gets a drop shadow, like a product on a table), then the four
 * numbers everything else leads to, divided by hairlines instead of boxes.
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
  const reduce = useReducedMotion();
  const photo = images[0];

  return (
    <section
      id="overblik"
      className="scroll-mt-32 bg-[#0a0e16] px-4 pb-12 pt-10 text-white sm:px-6 sm:pb-16 sm:pt-14"
      aria-labelledby="overblik-h"
    >
      <div className="mx-auto max-w-[1080px]">
        <div className={clsx("grid items-center gap-8 lg:gap-12", photo ? "lg:grid-cols-[minmax(0,1fr)_minmax(0,440px)]" : "md:grid-cols-[minmax(0,1fr)_auto]")}>
          <motion.div
            className="min-w-0"
            initial={reduce ? false : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          >
            {address && (
              <p className="text-[15px] font-medium text-white/60" translate="no">
                {address}
              </p>
            )}
            <div className="mt-2 flex items-center gap-5 sm:gap-7">
              <h2
                id="overblik-h"
                className="min-w-0 text-[44px] font-semibold leading-[1.02] tracking-[-0.035em] [text-wrap:balance] sm:text-[64px]"
              >
                {headline}
              </h2>
              <div className={clsx(!photo && "md:hidden")}>
                <ScoreRing score={score} rating={rating} tone={tone} />
              </div>
            </div>
            <p className="mt-4 max-w-xl text-[17px] leading-relaxed text-white/75">{verdict}</p>
            {notes.map((n) => (
              <p key={n} className="mt-3 flex max-w-xl items-start gap-2 text-[15px] leading-snug text-amber-200">
                <AlertTriangle aria-hidden size={16} strokeWidth={1.8} className="mt-0.5 shrink-0" />
                {n}
              </p>
            ))}
            <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-[15px]">
              {listingUrl && (
                <a
                  href={listingUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 font-medium text-[#6aa8ff] hover:underline focus-visible:rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6aa8ff]"
                >
                  Se opslaget på {sourceLabel}
                  <ArrowUpRight aria-hidden size={15} strokeWidth={2} />
                </a>
              )}
              {kindLabel && <span className="text-white/50">{kindLabel}</span>}
            </div>
          </motion.div>

          {!photo && (
            <div className="hidden md:block">
              <ScoreRing score={score} rating={rating} tone={tone} large />
            </div>
          )}
          {photo && (
            <motion.button
              type="button"
              onClick={() => setLightboxAt(0)}
              className="group relative block aspect-[4/3] w-full overflow-hidden rounded-2xl bg-white/5 shadow-[0_24px_60px_-20px_rgba(0,0,0,0.7)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6aa8ff] focus-visible:ring-offset-4 focus-visible:ring-offset-[#0a0e16]"
              initial={reduce ? false : { opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.7, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
              aria-label={`Se alle ${images.length} billeder af boligen`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={photo}
                alt={address ? `Foto af ${address}` : "Foto af boligen"}
                width={880}
                height={660}
                fetchPriority="high"
                className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.03]"
              />
              <span className="absolute bottom-3 right-3 inline-flex items-center gap-1.5 rounded-full bg-black/55 px-3 py-1.5 text-[13px] font-medium text-white backdrop-blur-md">
                <Expand aria-hidden size={13} strokeWidth={2} />
                {images.length} billeder
              </span>
            </motion.button>
          )}
        </div>

        <dl className="mt-10 grid grid-cols-2 gap-y-6 border-t border-white/10 pt-6 sm:mt-12 md:grid-cols-4">
          {metrics.map((m, i) => (
            <div
              key={m.label}
              className={clsx("min-w-0 pr-4", i % 2 === 1 && "border-l border-white/10 pl-4", i >= 2 && "md:border-l md:border-white/10 md:pl-6", i === 1 && "md:pl-6")}
            >
              <dt className="text-[13px] font-medium text-white/55">{m.label}</dt>
              <dd className="mt-1.5 flex items-baseline gap-1 whitespace-nowrap">
                <span className={clsx("text-[26px] font-semibold tabular-nums tracking-[-0.025em] sm:text-[34px]", toneText[m.tone])}>
                  {m.value}
                </span>
                {m.unit && <span className="text-[15px] font-medium text-white/45">{m.unit}</span>}
                {toneWord[m.tone] && <span className="sr-only">({toneWord[m.tone]})</span>}
              </dd>
            </div>
          ))}
        </dl>

        {probability && (
          <p className="mt-6 text-[15px] text-white/60">
            <span className="font-semibold text-white">{probability.pct}&nbsp;%</span> sandsynlighed for positivt cash flow,
            regnet på {probability.runs.toLocaleString("da-DK")} scenarier med forskellig leje, rente og tomgang.
          </p>
        )}
      </div>

      {lightboxAt !== null && (
        <Lightbox images={images} startIdx={lightboxAt} onClose={() => setLightboxAt(null)} address={address} />
      )}
    </section>
  );
}

function ScoreRing({ score, rating, tone, large }: { score: number; rating: string; tone: Tone; large?: boolean }) {
  const reduce = useReducedMotion();
  const clamped = Math.max(0, Math.min(100, score));
  return (
    <div className={clsx("relative shrink-0", large ? "h-[200px] w-[200px] lg:h-[232px] lg:w-[232px]" : "h-[84px] w-[84px] sm:h-[104px] sm:w-[104px]")} role="img" aria-label={`Score ${score} af 100: ${rating}`}>
      <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90" aria-hidden>
        <circle cx="60" cy="60" r="54" fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth={large ? 4 : 6} />
        <motion.circle
          cx="60"
          cy="60"
          r="54"
          fill="none"
          strokeWidth={large ? 4 : 6}
          strokeLinecap="round"
          className={toneRing[tone]}
          initial={reduce ? false : { pathLength: 0 }}
          animate={{ pathLength: clamped / 100 }}
          transition={{ duration: 1.1, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
        />
      </svg>
      <div aria-hidden className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={clsx("font-semibold leading-none tabular-nums tracking-[-0.04em]", large ? "text-[72px] lg:text-[84px]" : "text-[30px] sm:text-[38px]")}>{score}</span>
        <span className={clsx("mt-1 font-semibold", large ? "text-[15px]" : "text-[11px] sm:text-xs", toneText[tone])}>
          {large ? `${rating} · ud af 100` : rating}
        </span>
      </div>
    </div>
  );
}
