"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Flag, useLang } from "./LangToggle";
import type { Lang } from "@/lib/i18n/engine";

/*
 * The landing page's language switch: a small split-flap departure board, the
 * kind that hangs in Kastrup. It rattles into place when the page opens, again
 * on hover, and when tapped it flips to the other language before the page
 * follows. Everything here is fixed text; the translator never touches it.
 */

const WIDTH = 7; // "ENGLISH"
const GLYPHS = "ABCDEFGHIJKLMNOPRSTUVWXYZÆØÅ";
const word = (l: Lang) => (l === "en" ? "ENGLISH" : "DANSK").padEnd(WIDTH, " ");

export function SplitFlapLang() {
  const [lang, pick] = useLang();
  const target = lang === "da" ? "en" : "da";
  const [tiles, setTiles] = useState<string[]>(() => word("en").split(""));
  const [flipping, setFlipping] = useState<boolean[]>(() => Array(WIDTH).fill(false));
  const timers = useRef<number[]>([]);
  const reduced = useRef(false);

  const clear = () => {
    timers.current.forEach((t) => window.clearTimeout(t));
    timers.current = [];
  };

  // Each tile shows a few random letters, then lands on its own letter; later
  // tiles run a little longer, so the word settles from left to right.
  const rattle = useCallback((to: string, done?: () => void) => {
    clear();
    if (reduced.current) {
      setTiles(to.split(""));
      done?.();
      return;
    }
    const letters = to.split("");
    letters.forEach((ch, i) => {
      const steps = 4 + i * 2;
      for (let s = 0; s <= steps; s++) {
        timers.current.push(
          window.setTimeout(() => {
            const last = s === steps;
            const shown = last ? ch : ch === " " && s > steps - 2 ? " " : GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
            setTiles((t) => t.map((c, j) => (j === i ? shown : c)));
            setFlipping((f) => f.map((v, j) => (j === i ? !last : v)));
          }, s * 55),
        );
      }
    });
    if (done) timers.current.push(window.setTimeout(done, (4 + (WIDTH - 1) * 2) * 55 + 260));
  }, []);

  useEffect(() => {
    reduced.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    return clear;
  }, []);

  // Show the language you can switch to, rattling into place on arrival.
  useEffect(() => {
    rattle(word(target));
  }, [target, rattle]);

  // One more rattle, then the page follows.
  const go = () => rattle(word(target), () => pick(target));

  return (
    <div data-no-i18n translate="no" className="mb-6 flex flex-col items-start gap-2 sm:mb-7 sm:items-center">
      <span className="text-[13px] font-medium text-slate-500">
        {target === "en" ? "Not from Denmark?" : "Foretrækker du dansk?"}
      </span>
      <button
        type="button"
        onClick={go}
        onMouseEnter={() => rattle(word(target))}
        aria-label={target === "en" ? "Switch the site to English" : "Skift siden til dansk"}
        className="group inline-flex items-center gap-2 rounded-2xl bg-[#0b1b33] p-2 pr-3 shadow-[0_14px_30px_-14px_rgba(11,27,51,0.65),inset_0_1px_0_rgba(255,255,255,0.08)] ring-1 ring-black/40 transition-transform duration-150 hover:-translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-[#f4f6f9] active:scale-[0.98]"
        style={{ touchAction: "manipulation" }}
      >
        <span className="grid h-[30px] w-[30px] place-items-center rounded-md bg-[#13274a] ring-1 ring-white/5">
          <Flag lang={target} className="h-[13px] w-[19px]" />
        </span>
        <span aria-hidden className="flex gap-[3px]">
          {tiles.map((c, i) => (
            <span
              key={i}
              className={`relative grid h-[30px] w-[21px] place-items-center overflow-hidden rounded-[4px] bg-[linear-gradient(to_bottom,#1c3563_0%,#1c3563_50%,#162c54_50%,#162c54_100%)] font-mono text-[15px] font-bold leading-none text-white shadow-[inset_0_-1px_0_rgba(0,0,0,0.35)] sm:h-[34px] sm:w-[24px] sm:text-[17px] ${
                flipping[i] ? "flap" : ""
              }`}
            >
              {c === " " ? "" : c}
              <span className="pointer-events-none absolute inset-x-0 top-1/2 h-px -translate-y-px bg-black/50" />
            </span>
          ))}
        </span>
        <svg aria-hidden viewBox="0 0 16 16" className="ml-0.5 h-4 w-4 text-blue-300 transition-transform duration-200 group-hover:translate-x-0.5">
          <path d="M3 8h9M8.5 4.5 12 8l-3.5 3.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
    </div>
  );
}
