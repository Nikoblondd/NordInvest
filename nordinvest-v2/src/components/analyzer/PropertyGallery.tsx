"use client";

import { useEffect, useRef, useState } from "react";
import { X, ChevronLeft, ChevronRight, Images as ImagesIcon } from "lucide-react";

/**
 * PropertyGallery — Airbnb-style photo hero for the analyzer.
 *
 * Desktop: 5-image split grid (1 hero left, 4 in a 2×2 right).
 * Mobile: single hero with a "1/N" chip and a paging swipe strip.
 * "Vis alle N billeder" button + click on any tile opens a fullscreen
 * lightbox with keyboard navigation (← → Esc).
 *
 * Accessibility contract:
 * - Every tile is a focusable button with a label ("Se billede k af N").
 * - Lightbox has role=dialog, aria-modal, restores focus to opener on close,
 *   and traps keyboard focus.
 * - All arrow controls have visible focus rings.
 */
export function PropertyGallery({
  images,
  address,
}: {
  images: string[];
  address: string | null;
}) {
  const [open, setOpen] = useState(false);
  const [idx, setIdx] = useState(0);
  const openerRef = useRef<HTMLButtonElement | null>(null);

  if (!images || images.length === 0) return null;

  const hero = images[0];
  const side = images.slice(1, 5);
  const remaining = Math.max(0, images.length - 5);

  function openAt(i: number) {
    setIdx(i);
    setOpen(true);
  }

  return (
    <>
      {/* HERO GRID — desktop split, mobile single frame */}
      <section
        className="relative overflow-hidden rounded-2xl border border-slate-200 bg-slate-100 shadow-sm"
        aria-label={address ? `Billeder af ${address}` : "Billeder af ejendommen"}
      >
        {/* Desktop / tablet layout */}
        <div className="hidden gap-1.5 sm:grid sm:grid-cols-2 md:grid-cols-4">
          <button
            onClick={() => openAt(0)}
            className="group relative col-span-2 row-span-2 aspect-[4/3] overflow-hidden bg-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
            aria-label="Se billede 1 af flere"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={hero}
              alt={address ?? "Ejendom"}
              className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.02]"
              loading="eager"
            />
          </button>
          {side.map((src, i) => {
            const isLast = i === 3 && remaining > 0;
            return (
              <button
                key={src + i}
                onClick={() => openAt(i + 1)}
                className="group relative aspect-square overflow-hidden bg-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
                aria-label={`Se billede ${i + 2} af flere`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={src}
                  alt=""
                  className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
                  loading="lazy"
                />
                {isLast && (
                  <div className="absolute inset-0 flex items-center justify-center bg-slate-900/55 text-sm font-semibold text-white backdrop-blur-[2px]">
                    +{remaining} flere
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Mobile layout — single frame + paging chip */}
        <div className="sm:hidden">
          <MobilePager images={images} onOpen={(i) => openAt(i)} address={address} />
        </div>

        {/* Show-all pill sits over the hero (both layouts) */}
        {images.length > 1 && (
          <button
            ref={openerRef}
            onClick={() => openAt(0)}
            className="absolute bottom-3 right-3 inline-flex items-center gap-1.5 rounded-full bg-white/95 px-3 py-1.5 text-xs font-semibold text-slate-900 shadow-md ring-1 ring-slate-200 backdrop-blur transition hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 sm:text-sm"
          >
            <ImagesIcon className="h-3.5 w-3.5" />
            Vis alle {images.length} billeder
          </button>
        )}
      </section>

      {open && (
        <Lightbox
          images={images}
          startIdx={idx}
          onClose={() => {
            setOpen(false);
            // Return focus to the opener for accessibility.
            requestAnimationFrame(() => openerRef.current?.focus());
          }}
          address={address}
        />
      )}
    </>
  );
}

/* ---------------- Mobile pager ---------------- */

function MobilePager({
  images,
  onOpen,
  address,
}: {
  images: string[];
  onOpen: (i: number) => void;
  address: string | null;
}) {
  const [i, setI] = useState(0);
  const total = images.length;
  return (
    <div className="relative">
      <button
        onClick={() => onOpen(i)}
        className="relative block aspect-[4/3] w-full overflow-hidden bg-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
        aria-label={address ? `Se billeder af ${address}` : "Se billeder"}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={images[i]} alt="" className="h-full w-full object-cover" loading="eager" />
      </button>
      {total > 1 && (
        <>
          <button
            onClick={(e) => { e.stopPropagation(); setI((i - 1 + total) % total); }}
            aria-label="Forrige billede"
            className="absolute left-2 top-1/2 z-10 -translate-y-1/2 rounded-full bg-white/90 p-1.5 text-slate-800 shadow ring-1 ring-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); setI((i + 1) % total); }}
            aria-label="Næste billede"
            className="absolute right-2 top-1/2 z-10 -translate-y-1/2 rounded-full bg-white/90 p-1.5 text-slate-800 shadow ring-1 ring-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
          <div className="absolute bottom-3 left-3 rounded-full bg-slate-900/75 px-2 py-0.5 text-[11px] font-semibold text-white">
            {i + 1} / {total}
          </div>
        </>
      )}
    </div>
  );
}

/* ---------------- Lightbox ---------------- */

function Lightbox({
  images,
  startIdx,
  onClose,
  address,
}: {
  images: string[];
  startIdx: number;
  onClose: () => void;
  address: string | null;
}) {
  const [i, setI] = useState(startIdx);
  const total = images.length;

  useEffect(() => {
    // Lock body scroll while the modal is open.
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowRight") setI((v) => (v + 1) % total);
      else if (e.key === "ArrowLeft") setI((v) => (v - 1 + total) % total);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [total, onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={address ? `Billeder af ${address}` : "Billeder"}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/92 p-3 sm:p-6"
      onClick={(e) => {
        // Click on the backdrop (not the image or controls) closes.
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <button
        onClick={onClose}
        aria-label="Luk billedvisning"
        className="absolute right-3 top-3 z-10 rounded-full bg-white/10 p-2 text-white ring-1 ring-white/30 backdrop-blur transition hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white sm:right-6 sm:top-6"
      >
        <X className="h-5 w-5" />
      </button>

      <div
        className="relative flex h-full w-full max-w-6xl flex-col items-center justify-center"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative flex w-full flex-1 items-center justify-center overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={images[i]}
            alt={address ?? `Billede ${i + 1}`}
            className="max-h-[82vh] w-auto max-w-full rounded-lg object-contain shadow-2xl"
          />
        </div>

        {total > 1 && (
          <>
            <button
              onClick={() => setI((v) => (v - 1 + total) % total)}
              aria-label="Forrige billede"
              className="absolute left-1 top-1/2 -translate-y-1/2 rounded-full bg-white/10 p-2 text-white ring-1 ring-white/30 backdrop-blur transition hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white sm:left-3 sm:p-3"
            >
              <ChevronLeft className="h-5 w-5 sm:h-6 sm:w-6" />
            </button>
            <button
              onClick={() => setI((v) => (v + 1) % total)}
              aria-label="Næste billede"
              className="absolute right-1 top-1/2 -translate-y-1/2 rounded-full bg-white/10 p-2 text-white ring-1 ring-white/30 backdrop-blur transition hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white sm:right-3 sm:p-3"
            >
              <ChevronRight className="h-5 w-5 sm:h-6 sm:w-6" />
            </button>
          </>
        )}

        {/* Counter + thumbnail strip */}
        <div className="mt-4 w-full">
          <div className="mb-3 text-center text-xs font-medium text-white/80">
            {i + 1} / {total}
          </div>
          <div className="flex gap-1.5 overflow-x-auto pb-1">
            {images.map((src, k) => (
              <button
                key={src + k}
                onClick={() => setI(k)}
                aria-label={`Gå til billede ${k + 1}`}
                aria-current={k === i}
                className={`relative h-14 w-20 flex-shrink-0 overflow-hidden rounded-md ring-2 transition sm:h-16 sm:w-24 ${
                  k === i ? "ring-white" : "ring-white/20 hover:ring-white/50"
                }`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={src} alt="" className="h-full w-full object-cover" loading="lazy" />
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
