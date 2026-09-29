"use client";

import { useEffect, useState } from "react";
import { DK, GB } from "country-flag-icons/react/3x2";
import { currentLang, setLang, type Lang } from "@/lib/i18n/engine";
import { clsx } from "@/lib/clsx";

function chooseLang(next: Lang) {
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

const Flag = ({ lang, className = "h-3.5 w-[21px]" }: { lang: Lang; className?: string }) =>
  lang === "da" ? (
    <DK aria-hidden className={`${className} shrink-0 rounded-[2px] shadow-[0_0_0_1px_rgba(15,23,42,0.15)]`} />
  ) : (
    <GB aria-hidden className={`${className} shrink-0 rounded-[2px] shadow-[0_0_0_1px_rgba(15,23,42,0.15)]`} />
  );

/**
 * Language switch in the top bar. Phones: just the flag of the language you
 * switch to, small enough that the logo always keeps its room. Desktop: both
 * flags side by side. Its own labels are never run through the translator.
 */
export function LangToggle() {
  const [lang, setLangState] = useState<Lang>("da");
  useEffect(() => setLangState(currentLang()), []);

  const pick = (l: Lang) => {
    setLangState(l);
    chooseLang(l);
  };
  const other: Lang = lang === "da" ? "en" : "da";

  return (
    <div data-no-i18n translate="no" className="shrink-0">
      {/* Phones and tablets */}
      <button
        type="button"
        onClick={() => pick(other)}
        aria-label={other === "en" ? "Switch to English" : "Skift til dansk"}
        title={other === "en" ? "English" : "Dansk"}
        className="grid h-9 w-9 place-items-center rounded-full max-[379px]:w-8 transition-colors hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 active:bg-slate-200 md:hidden"
      >
        <Flag lang={other} className="h-[15px] w-[22px]" />
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
