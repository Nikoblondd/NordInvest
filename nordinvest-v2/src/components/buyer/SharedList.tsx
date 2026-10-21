"use client";
/* eslint-disable @next/next/no-img-element -- listing photos come from the portals' own image CDN */

import { useEffect, useMemo, useRef, useState } from "react";
import { Heart, Loader2, MapPin } from "lucide-react";
import { BuyerMap, type MapHandle } from "./BuyerMap";
import { HomePanel } from "./HomeDetail";
import { BoligkrydsMark } from "./Brand";
import { mio, useImages, VerdictPill } from "./ui";
import { COLS } from "@/lib/buyer/cols";
import { STAGES, EMPTY_STATE, type Area, type Household, type Stage } from "@/lib/buyer/state";
import type { BuyerHome } from "@/lib/buyer/market";
import { MUNICIPALITIES } from "@/lib/kommuner";

/*
 * A list someone shared from Boligkryds: their saved homes on the map and the
 * places they searched. Read-only, no login. Tapping a home shows the same
 * analysis as on the map.
 */

const KOMMUNE_NAME = new Map(MUNICIPALITIES.map((m) => [m.slug, m.name]));
type Dict = { type: string[]; kommune: (string | null)[]; verdict: BuyerHome["verdict"][] };

export function SharedList({ name, saved, areas, view }: { name: string | null; saved: { id: string; stage: Stage | null; price: number }[]; areas: Area[]; view: { lat: number; lon: number; zoom: number } | null }) {
  const [homes, setHomes] = useState<BuyerHome[] | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [household, setHousehold] = useState<Household>(EMPTY_STATE.household);
  const [desktop, setDesktop] = useState(true);
  const map = useRef<MapHandle>(null);
  useEffect(() => { const m = matchMedia("(min-width: 1024px)"); setDesktop(m.matches); const on = () => setDesktop(m.matches); m.addEventListener("change", on); return () => m.removeEventListener("change", on); }, []);

  useEffect(() => {
    fetch("/api/boligkoeb/homes").then((r) => r.json()).then((j) => {
      if (!j.ok) return setHomes([]);
      const ix = Object.fromEntries((j.cols as string[]).map((c, i) => [c, i])) as Record<(typeof COLS)[number], number>;
      const want = new Set(saved.map((s) => s.id.replace(/^boligsiden:/, "")));
      const d = j.dict as Dict, base = Date.parse(j.baseline);
      const list: BuyerHome[] = (j.rows as unknown[][]).filter((r) => want.has(r[ix.id] as string)).map((r) => ({
        id: `boligsiden:${r[ix.id]}`, lat: r[ix.lat] as number, lon: r[ix.lon] as number, price: r[ix.price] as number, area: r[ix.area] as number,
        rooms: r[ix.rooms] as number | null, year: r[ix.year] as number | null, energy: r[ix.energy] as string | null, type: d.type[r[ix.type] as number],
        zip: r[ix.zip] as number, kommune: d.kommune[r[ix.kommune] as number], address: r[ix.address] as string, ppm: r[ix.ppm] as number,
        expPpm: r[ix.expPpm] as number, deltaPct: r[ix.deltaPct] as number, rank: r[ix.rank] as number, score: r[ix.score] as number, verdict: d.verdict[r[ix.verdict] as number],
        cutPct: r[ix.cutPct] as number, firstSeen: new Date(base + (r[ix.firstSeen] as number) * 60000).toISOString(), knownStart: r[ix.knownStart] === 1, suspect: r[ix.suspect] === 1,
      }));
      setHomes(list);
      if (list.length) setTimeout(() => map.current?.fitTo(list), 500);
    }).catch(() => setHomes([]));
  }, [saved]);

  const stageOf = useMemo(() => new Map(saved.map((s) => [s.id, s.stage])), [saved]);
  const images = useImages((homes ?? []).slice(0, 40).map((h) => h.id));
  const sel = homes?.find((h) => h.id === selected) ?? null;
  const title = name ? `${name}s boliger` : "Delte boliger";

  const panel = sel && (
    <HomePanel home={sel} household={household} onHousehold={setHousehold} onToggleSave={() => { location.href = `/?bolig=${encodeURIComponent(sel.id)}`; }} onUpdate={() => {}}
      onClose={() => setSelected(null)} onSelect={(id) => setSelected(id)} onShowPlans={() => map.current?.flyTo(sel.lat, sel.lon, 14)} kommuneName={sel.kommune ? KOMMUNE_NAME.get(sel.kommune) ?? null : null} />
  );

  const list = (
    <div className="flex h-full flex-col">
      <div className="border-b border-slate-100 px-5 py-4">
        <div className="flex items-center gap-2"><BoligkrydsMark size={26} /><span className="text-[14px] font-semibold text-slate-500">Boligkryds</span></div>
        <h1 className="mt-3 text-[24px] font-semibold leading-tight tracking-[-0.02em]">{title}</h1>
        <p className="mt-1 text-[14px] text-slate-500">{saved.length} {saved.length === 1 ? "bolig" : "boliger"}{name ? `, delt af ${name}` : ""}. Tryk på en bolig for at se, om den er et godt køb.</p>
        {areas.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {areas.map((a) => (
              <button key={a.label} type="button" onClick={() => map.current?.fitTo([{ lat: a.bounds[1], lon: a.bounds[0] }, { lat: a.bounds[3], lon: a.bounds[2] }])}
                className="inline-flex min-h-[34px] items-center gap-1 rounded-full bg-slate-100 px-3 text-[13px] font-semibold text-slate-700 hover:bg-slate-200"><MapPin size={13} /> {a.label}</button>
            ))}
          </div>
        )}
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
        {!homes ? <p className="flex items-center gap-2 p-4 text-[14px] text-slate-500"><Loader2 size={16} className="animate-spin" /> Henter boligerne …</p> : !homes.length ? <p className="p-4 text-[15px] text-slate-500">Boligerne på listen er ikke til salg længere.</p> : (
          <ul className="space-y-2.5">
            {homes.map((h) => {
              const st = stageOf.get(h.id);
              return (
                <li key={h.id}>
                  <button type="button" onClick={() => { setSelected(h.id); map.current?.flyTo(h.lat, h.lon, 14); }} className="flex w-full gap-3 rounded-2xl p-2.5 text-left ring-1 ring-slate-200 hover:shadow-[0_6px_20px_rgba(15,23,42,0.1)]">
                    <span className="h-[84px] w-[104px] shrink-0 overflow-hidden rounded-xl bg-slate-100">{images.get(h.id) && <img src={images.get(h.id)!} alt="" className="h-full w-full object-cover" />}</span>
                    <span className="min-w-0 flex-1 py-0.5">
                      <span className="block text-[17px] font-semibold tabular-nums">{mio(h.price)}</span>
                      <span className="block truncate text-[14px] text-slate-700">{h.address.split(",")[0]}</span>
                      <span className="mt-1.5 flex flex-wrap items-center gap-1.5"><VerdictPill v={h.verdict} />{st && <span className="rounded-full bg-slate-900 px-2 py-0.5 text-[11px] font-semibold text-white">{STAGES.find((x) => x.id === st)?.label}</span>}</span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
        <a href="/" className="mt-4 flex min-h-[48px] items-center justify-center gap-2 rounded-full bg-emerald-600 text-[15px] font-semibold text-white"><Heart size={17} /> Lav din egen liste</a>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 flex flex-col bg-white lg:flex-row">
      <div className="relative h-[42vh] min-h-0 lg:h-auto lg:flex-1">
        <BuyerMap ref={map} homes={homes ?? []} savedIds={new Set()} selectedId={selected} initialView={view} showPlans={false} onSelect={setSelected} onMove={() => {}} />
      </div>
      <aside className="min-h-0 flex-1 border-t border-slate-200 lg:w-[420px] lg:flex-none lg:border-l lg:border-t-0 xl:w-[440px]">{desktop && panel ? panel : list}</aside>
      {!desktop && panel && <div className="fixed inset-x-0 bottom-0 top-10 z-[60] overflow-hidden rounded-t-3xl bg-white shadow-[0_-12px_40px_rgba(15,23,42,0.25)]">{panel}</div>}
    </div>
  );
}
