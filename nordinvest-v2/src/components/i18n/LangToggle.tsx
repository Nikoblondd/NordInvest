"use client";

import { useEffect, useState } from "react";
import { DK, GB } from "country-flag-icons/react/3x2";
import { currentLang, setLang, type Lang } from "@/lib/i18n/engine";

export function chooseLang(next: Lang) {
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

/** The active language, read after mount (the server always renders Danish). */
export function useLang(): [Lang, (l: Lang) => void] {
  const [lang, setLangState] = useState<Lang>("da");
  useEffect(() => {
    setLangState(currentLang());
    const on = () => setLangState(currentLang());
    window.addEventListener("nordinvest-lang", on);
    return () => window.removeEventListener("nordinvest-lang", on);
  }, []);
  return [
    lang,
    (l: Lang) => {
      setLangState(l);
      chooseLang(l);
    },
  ];
}

export const Flag = ({ lang, className = "h-3.5 w-[21px]" }: { lang: Lang; className?: string }) =>
  lang === "da" ? (
    <DK aria-hidden className={`${className} shrink-0 rounded-[2px] shadow-[0_0_0_1px_rgba(15,23,42,0.12)]`} />
  ) : (
    <GB aria-hidden className={`${className} shrink-0 rounded-[2px] shadow-[0_0_0_1px_rgba(15,23,42,0.12)]`} />
  );

/**
 * Quiet language links. The top bar holds no flags (it has to fit a phone);
 * desktop gets a small text link, the phone menu a full row. The landing page
 * has its own, louder switch (SplitFlapLang). Labels are never translated.
 */
export function LangToggle({ variant = "bar" }: { variant?: "bar" | "menu" }) {
  const [lang, pick] = useLang();
  const other: Lang = lang === "da" ? "en" : "da";
  const label = other === "en" ? "English" : "Dansk";

  if (variant === "menu") {
    return (
      <button
        type="button"
        data-no-i18n
        translate="no"
        onClick={() => pick(other)}
        className="flex items-center gap-2.5 text-left text-base font-medium text-slate-700"
      >
        <Flag lang={other} />
        {other === "en" ? "Read in English" : "Læs på dansk"}
      </button>
    );
  }

  return (
    <button
      type="button"
      data-no-i18n
      translate="no"
      onClick={() => pick(other)}
      aria-label={other === "en" ? "Switch to English" : "Skift til dansk"}
      className="hidden rounded-md px-1.5 py-1 text-sm font-medium text-slate-500 transition-colors hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 md:inline-flex"
    >
      {label}
    </button>
  );
}
