"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";

/** Pick a kommune and a theme, see the live widget, copy the iframe code. */
export function WidgetBuilder({ cities }: { cities: { slug: string; name: string; in: string }[] }) {
  const [slug, setSlug] = useState("viborg");
  const [dark, setDark] = useState(false);
  const [copied, setCopied] = useState(false);
  const c = cities.find((x) => x.slug === slug) ?? cities[0];
  const src = `https://nordinvest.io/embed/deals/${c.slug}${dark ? "?tema=mork" : ""}`;
  const code = `<iframe src="${src}" title="Månedens bedste køb ${c.in}" width="100%" height="390" style="border:0;max-width:640px" loading="lazy"></iframe>`;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2500);
    } catch {
      window.prompt("Kopiér koden", code);
    }
  };

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
      <div className="space-y-5">
        <div>
          <label htmlFor="w-city" className="text-[14px] font-semibold text-slate-900">Kommune</label>
          <select
            id="w-city"
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            className="mt-1.5 block min-h-12 w-full rounded-xl border border-slate-300 bg-white px-3 text-[16px] text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
          >
            {cities.map((x) => (
              <option key={x.slug} value={x.slug}>{x.name}</option>
            ))}
          </select>
        </div>
        <fieldset>
          <legend className="text-[14px] font-semibold text-slate-900">Farve</legend>
          <div className="mt-1.5 grid grid-cols-2 gap-2">
            {[false, true].map((d) => (
              <button
                key={String(d)}
                type="button"
                aria-pressed={dark === d}
                onClick={() => setDark(d)}
                className={`min-h-11 rounded-xl border text-[15px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${dark === d ? "border-slate-900 bg-slate-900 text-white" : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"}`}
              >
                {d ? "Mørk" : "Lys"}
              </button>
            ))}
          </div>
        </fieldset>
        <div>
          <div className="text-[14px] font-semibold text-slate-900">Kode til jeres side</div>
          <pre className="mt-1.5 overflow-x-auto whitespace-pre-wrap break-all rounded-xl bg-slate-900 p-4 text-[13px] leading-relaxed text-slate-100">{code}</pre>
          <button
            type="button"
            onClick={copy}
            className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-full bg-blue-600 px-5 text-[15px] font-semibold text-white hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
          >
            {copied ? <Check aria-hidden size={16} /> : <Copy aria-hidden size={16} />}
            {copied ? "Kopieret" : "Kopiér koden"}
          </button>
        </div>
      </div>
      <div>
        <div className="text-[14px] font-semibold text-slate-900">Sådan ser den ud</div>
        <iframe key={src} src={src} title={`Månedens bedste køb ${c.in}`} width="100%" height={390} className="mt-1.5 w-full rounded-2xl border-0 bg-white" loading="lazy" />
      </div>
    </div>
  );
}
