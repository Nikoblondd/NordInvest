"use client";

import { useEffect, useState } from "react";
import { DK, GB } from "country-flag-icons/react/3x2";
import { currentLang, setLang, type Lang } from "@/lib/i18n/engine";
import { clsx } from "@/lib/clsx";

function choose(next: Lang) {
  if (next === currentLang()) return;
  setLang(next);
  if (next === "en") {
    // Translate in place, no reload.
    const d = document.documentElement;
    d.setAttribute("data-lang", "en");
    d.lang = "en";
    window.dispatchEvent(new Event("nordinvest-lang"));
  } else {
    // Back to Danish: reload so every text is the original.
    location.reload();
  }
}

const Flag = ({ lang }: { lang: Lang }) =>
  lang === "da" ? (
    <DK aria-hidden className="h-3.5 w-[21px] shrink-0 rounded-[2px] shadow-[0_0_0_1px_rgba(15,23,42,0.12)]" />
  ) : (
    <GB aria-hidden className="h-3.5 w-[21px] shrink-0 rounded-[2px] shadow-[0_0_0_1px_rgba(15,23,42,0.12)]" />
  );

/**
 * Language switch. Desktop: both flags side by side. Phones: one button that
 * shows the language you switch to. It stays in the top bar on every screen.
 * Its own labels are fixed (never run through the translator).
 */
// Off until the English dictionary is built; ?lang=en works meanwhile.
const TOGGLE_LIVE = true;

export function LangToggle() {
  const [lang, setLangState] = useState<Lang>("da");
  useEffect(() => setLangState(currentLang()), []);
  if (!TOGGLE_LIVE) return null;

  const pick = (l: Lang) => {
    setLangState(l);
    choose(l);
  };
  const other: Lang = lang === "da" ? "en" : "da";

  return (
    <div data-no-i18n translate="no">
      {/* Phones and tablets */}
      <button
        type="button"
        onClick={() => pick(other)}
        aria-label={other === "en" ? "Switch to English" : "Skift til dansk"}
        className="inline-flex h-9 items-center gap-1.5 rounded-full border border-slate-200 bg-white px-2.5 text-[13px] font-semibold text-slate-700 transition-colors hover:border-slate-300 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 md:hidden"
      >
        <Flag lang={other} />
        {other === "en" ? "EN" : "DA"}
      </button>

      {/* Desktop */}
      <div role="group" aria-label="Sprog / Language" className="hidden items-center rounded-full border border-slate-200 bg-white p-0.5 md:inline-flex">
        {(["da", "en"] as Lang[]).map((l) => (
          <button
            key={l}
            type="button"
            onClick={() => pick(l)}
            aria-pressed={lang === l}
            aria-label={l === "da" ? "Dansk" : "English"}
            className={clsx(
              "inline-flex h-7 items-center gap-1.5 rounded-full px-2.5 text-[12px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600",
              lang === l ? "bg-slate-900 text-white" : "text-slate-500 hover:text-slate-900",
            )}
          >
            <Flag lang={l} />
            {l.toUpperCase()}
          </button>
        ))}
      </div>
    </div>
  );
}
