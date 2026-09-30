"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, Search } from "lucide-react";

type Country = { code: string; name: string; flag: string; dial: string };

// Denmark first (default), then Nordics + common European/other markets.
const COUNTRIES: Country[] = [
  { code: "DK", name: "Danmark", flag: "🇩🇰", dial: "+45" },
  { code: "SE", name: "Sverige", flag: "🇸🇪", dial: "+46" },
  { code: "NO", name: "Norge", flag: "🇳🇴", dial: "+47" },
  { code: "FI", name: "Finland", flag: "🇫🇮", dial: "+358" },
  { code: "IS", name: "Island", flag: "🇮🇸", dial: "+354" },
  { code: "FO", name: "Færøerne", flag: "🇫🇴", dial: "+298" },
  { code: "DE", name: "Tyskland", flag: "🇩🇪", dial: "+49" },
  { code: "GB", name: "Storbritannien", flag: "🇬🇧", dial: "+44" },
  { code: "NL", name: "Holland", flag: "🇳🇱", dial: "+31" },
  { code: "BE", name: "Belgien", flag: "🇧🇪", dial: "+32" },
  { code: "FR", name: "Frankrig", flag: "🇫🇷", dial: "+33" },
  { code: "ES", name: "Spanien", flag: "🇪🇸", dial: "+34" },
  { code: "PT", name: "Portugal", flag: "🇵🇹", dial: "+351" },
  { code: "IT", name: "Italien", flag: "🇮🇹", dial: "+39" },
  { code: "CH", name: "Schweiz", flag: "🇨🇭", dial: "+41" },
  { code: "AT", name: "Østrig", flag: "🇦🇹", dial: "+43" },
  { code: "PL", name: "Polen", flag: "🇵🇱", dial: "+48" },
  { code: "IE", name: "Irland", flag: "🇮🇪", dial: "+353" },
  { code: "US", name: "USA", flag: "🇺🇸", dial: "+1" },
  { code: "AE", name: "UAE", flag: "🇦🇪", dial: "+971" },
];

const DEFAULT = COUNTRIES[0];

// Split a stored value like "+45 12 34 56" into { country, national }.
function parse(value: string): { country: Country; national: string } {
  const v = (value ?? "").trim();
  if (v.startsWith("+")) {
    // longest dial code that matches wins (+358 before +3…)
    const match = [...COUNTRIES]
      .sort((a, b) => b.dial.length - a.dial.length)
      .find((c) => v.startsWith(c.dial));
    if (match) return { country: match, national: v.slice(match.dial.length).trim() };
  }
  return { country: DEFAULT, national: v };
}

export function PhoneInput({
  value,
  onChange,
  required,
  id,
}: {
  value: string;
  onChange: (full: string) => void;
  required?: boolean;
  id?: string;
}) {
  const initial = useMemo(() => parse(value), []); // eslint-disable-line react-hooks/exhaustive-deps
  const [country, setCountry] = useState<Country>(initial.country);
  const [national, setNational] = useState(initial.national);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const wrapRef = useRef<HTMLDivElement | null>(null);

  const emit = (c: Country, n: string) => {
    const digits = n.replace(/[^\d ]/g, "").trim();
    onChange(digits ? `${c.dial} ${digits}` : "");
  };

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const filtered = COUNTRIES.filter(
    (c) =>
      c.name.toLowerCase().includes(query.toLowerCase()) ||
      c.dial.includes(query) ||
      c.code.toLowerCase().includes(query.toLowerCase()),
  );

  return (
    <div ref={wrapRef} className="relative">
      <div className="flex items-stretch rounded-xl border border-slate-200 bg-white focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-label="Vælg land"
          className="flex shrink-0 items-center gap-1.5 rounded-l-xl px-3 py-2.5 text-sm text-slate-700 hover:bg-slate-50"
        >
          <span className="text-lg leading-none">{country.flag}</span>
          <span className="font-medium tnum">{country.dial}</span>
          <ChevronDown size={15} className="text-slate-400" />
        </button>
        <div className="w-px self-stretch bg-slate-200" />
        <input
          id={id}
          type="tel"
          inputMode="tel"
          required={required}
          value={national}
          onChange={(e) => {
            setNational(e.target.value);
            emit(country, e.target.value);
          }}
          placeholder="12 34 56 78"
          autoComplete="tel-national"
          className="w-full min-w-0 rounded-r-xl bg-transparent px-3 py-2.5 text-slate-900 outline-none placeholder:text-slate-400"
        />
      </div>

      {open && (
        <div className="absolute left-0 right-0 top-full z-50 mt-2 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl shadow-slate-900/10">
          <div className="flex items-center gap-2 border-b border-slate-100 px-3 py-2">
            <Search size={15} className="shrink-0 text-slate-400" />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Søg land…"
              className="w-full bg-transparent py-1 text-sm outline-none placeholder:text-slate-400"
            />
          </div>
          <ul className="max-h-60 overflow-y-auto py-1">
            {filtered.map((c) => (
              <li key={c.code}>
                <button
                  type="button"
                  onClick={() => {
                    setCountry(c);
                    emit(c, national);
                    setOpen(false);
                    setQuery("");
                  }}
                  className={`flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm hover:bg-slate-50 ${
                    c.code === country.code ? "bg-blue-50/60" : ""
                  }`}
                >
                  <span className="text-lg leading-none">{c.flag}</span>
                  <span className="flex-1 text-slate-700">{c.name}</span>
                  <span className="tnum text-slate-400">{c.dial}</span>
                </button>
              </li>
            ))}
            {filtered.length === 0 && (
              <li className="px-3 py-4 text-center text-sm text-slate-400">Intet land fundet</li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
