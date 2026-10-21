"use client";
/* eslint-disable @next/next/no-img-element -- listing photos come from the portals' own image CDN */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { Bell, Building2, ChevronDown, Heart, LayoutDashboard, List, Loader2, LocateFixed, Map as MapIcon, Search, SlidersHorizontal, X } from "lucide-react";
import { BuyerMap, VERDICT_COLOR, type MapHandle } from "./BuyerMap";
import { HomeDetail } from "./HomeDetail";
import { kr, mio, pct, MailToggle, useImages, VerdictPill } from "./ui";
import { Dashboard } from "./Dashboard";
import { COLS } from "@/lib/buyer/cols";
import type { BuyerHome } from "@/lib/buyer/market";
import { compare, matches, TYPE_CHIPS } from "@/lib/buyer/filter";
import { EMPTY_FILTERS, EMPTY_STATE, SORTS, dkDay, type BuyerState, type Filters, type SavedHome } from "@/lib/buyer/state";
import { MUNICIPALITIES } from "@/lib/kommuner";
import { ZIP_NAME } from "@/lib/postnumre";

/*
 * NordInvest for boligkøbere. The map is the product: every home for sale,
 * green for a good buy, yellow for middle, red for expensive. Everything a
 * buyer does is one tap from the map: filter, hover, open a home, save it.
 */

type Tab = "kort" | "liste" | "gemte" | "overblik";
type View = { lat: number; lon: number; zoom: number; bounds: [number, number, number, number] };
const KOMMUNE_NAME = new Map(MUNICIPALITIES.map((m) => [m.slug, m.name]));
const PAGE = 30;

type Dict = { type: string[]; kommune: (string | null)[]; verdict: BuyerHome["verdict"][] };
function toHomes(cols: readonly string[], rows: unknown[][], dict: Dict, baseline: string): BuyerHome[] {
  const ix = Object.fromEntries(cols.map((c, i) => [c, i])) as Record<(typeof COLS)[number], number>;
  const base = Date.parse(baseline);
  return rows.map((r) => {
    const raw = r[ix.id] as string;
    return {
      id: raw.includes(":") ? raw : `boligsiden:${raw}`, lat: r[ix.lat] as number, lon: r[ix.lon] as number, price: r[ix.price] as number, area: r[ix.area] as number,
      rooms: r[ix.rooms] as number | null, year: r[ix.year] as number | null, energy: r[ix.energy] as string | null, type: dict.type[r[ix.type] as number],
      zip: r[ix.zip] as number, kommune: dict.kommune[r[ix.kommune] as number], address: r[ix.address] as string, ppm: r[ix.ppm] as number,
      expPpm: r[ix.expPpm] as number, deltaPct: r[ix.deltaPct] as number, rank: r[ix.rank] as number, score: r[ix.score] as number, verdict: dict.verdict[r[ix.verdict] as number],
      cutPct: r[ix.cutPct] as number, firstSeen: new Date(base + (r[ix.firstSeen] as number) * 60000).toISOString(), knownStart: r[ix.knownStart] === 1, suspect: r[ix.suspect] === 1,
    };
  });
}

export function BuyerApp() {
  const [homes, setHomes] = useState<BuyerHome[] | null>(null);
  const [loadErr, setLoadErr] = useState(false);
  const [state, setState] = useState<BuyerState | null>(null);
  const [account, setAccount] = useState<{ email: string; name: string | null } | null>(null);
  const [view, setView] = useState<View | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [detail, setDetail] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("kort");
  const [filterOpen, setFilterOpen] = useState(false);
  const [showPlans, setShowPlans] = useState(true);
  const [plansState, setPlansState] = useState<"off" | "zoom" | "loading" | "ready">("zoom");
  const [shown, setShown] = useState(PAGE);
  const [greeting, setGreeting] = useState<{ fresh: BuyerHome[]; drops: { h: BuyerHome; from: number }[]; since: string } | null>(null);
  const [freshIds, setFreshIds] = useState<Set<string> | null>(null);
  const [tourStep, setTourStep] = useState<number | null>(null);
  const [focusPassword, setFocusPassword] = useState(false);
  /** Set when an admin looks at the app as someone else (?som=): nothing is saved. */
  const [preview, setPreview] = useState<string | null>(null);
  const mapRef = useRef<MapHandle>(null);
  const isDesktop = useMedia("(min-width: 1024px)");

  // Load the market and the person's state together.
  useEffect(() => {
    fetch("/api/boligkoeb/homes").then((r) => r.json()).then((j) => { if (j.ok) setHomes(toHomes(j.cols, j.rows, j.dict, j.baseline)); else setLoadErr(true); }).catch(() => setLoadErr(true));
    const q = new URLSearchParams(location.search);
    const som = q.get("som");
    fetch(`/api/boligkoeb/state${som ? `?som=${encodeURIComponent(som)}` : ""}`).then((r) => r.json()).then((j) => {
      setState(j.ok ? { ...EMPTY_STATE, ...j.state } : EMPTY_STATE);
      if (j.ok) setAccount({ email: j.email, name: j.name });
      if (j.preview) setPreview(j.preview.name);
    }).catch(() => setState(EMPTY_STATE));
    if (q.get("bolig")) { setSelected(q.get("bolig")); setDetail(q.get("bolig")); }
    if (q.get("panel") === "indstillinger") setTab("overblik");
    if (q.get("konto") === "adgangskode") { setTab("overblik"); setFocusPassword(true); }
    if (q.toString()) history.replaceState(null, "", som ? `/boligkoeb?som=${encodeURIComponent(som)}` : "/boligkoeb");
  }, []);

  // Once both are in: welcome back (new homes since last visit, cheaper saved homes) or the first-time tour.
  const started = useRef(false);
  useEffect(() => {
    if (!homes || !state || started.current) return;
    started.current = true;
    const today = dkDay();
    const prev = state.lastVisit;
    const byId = new Map(homes.map((h) => [h.id, h]));
    if (prev && dkDay(new Date(prev)) !== today && state.greetedOn !== today) {
      const b = state.view?.bounds;
      const fresh = homes
        .filter((h) => h.knownStart && h.firstSeen > prev && (!b || (h.lon >= b[0] && h.lat >= b[1] && h.lon <= b[2] && h.lat <= b[3])) && matches(h, { ...state.filters, onlyNew: false }))
        .sort(compare("bedste"));
      const drops = state.saved.map((s) => ({ h: byId.get(s.id), from: s.lastPrice ?? s.price })).filter((x): x is { h: BuyerHome; from: number } => !!x.h && x.h.price < x.from);
      if (fresh.length || drops.length) setGreeting({ fresh, drops, since: prev });
    } else if (!state.tourDone) {
      setTourStep(0);
    }
    setState((s) => (s ? { ...s, lastVisit: new Date().toISOString(), greetedOn: today } : s));
    const sel = new URLSearchParams(location.search).get("bolig") ?? selected;
    const h = sel ? byId.get(sel) : null;
    if (h) setTimeout(() => mapRef.current?.flyTo(h.lat, h.lon, 14.5), 400);
  }, [homes, state]); // eslint-disable-line react-hooks/exhaustive-deps

  // Save the state a moment after it changes.
  const loaded = useRef(false);
  useEffect(() => {
    if (!state || preview) return;
    if (!loaded.current) { loaded.current = true; return; }
    const t = setTimeout(() => { void fetch("/api/boligkoeb/state", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(state) }); }, 1200);
    return () => clearTimeout(t);
  }, [state, preview]);

  const filters = state?.filters ?? EMPTY_FILTERS;
  const setFilters = useCallback((f: Partial<Filters>) => { setState((s) => (s ? { ...s, filters: { ...s.filters, ...f } } : s)); setShown(PAGE); setFreshIds(null); }, []);
  const savedIds = useMemo(() => new Set((state?.saved ?? []).map((s) => s.id)), [state?.saved]);

  const filtered = useMemo(() => {
    if (!homes) return [];
    if (freshIds) return homes.filter((h) => freshIds.has(h.id));
    return homes.filter((h) => matches(h, filters));
  }, [homes, filters, freshIds]);

  const inView = useMemo(() => {
    // Before the map has reported its view, use the one saved from last time.
    const b = view?.bounds ?? state?.view?.bounds;
    const list = b ? filtered.filter((h) => h.lon >= b[0] && h.lat >= b[1] && h.lon <= b[2] && h.lat <= b[3]) : filtered;
    return [...list].sort(compare(filters.sort));
  }, [filtered, view, state?.view, filters.sort]);
  const goodInView = useMemo(() => inView.filter((h) => h.verdict === "godt").length, [inView]);

  const byId = useMemo(() => new Map((homes ?? []).map((h) => [h.id, h])), [homes]);
  const selectedHome = selected ? byId.get(selected) ?? null : null;
  const detailHome = detail ? byId.get(detail) ?? null : null;

  const select = useCallback((id: string | null) => { setSelected(id); if (!id) setDetail(null); else if (isDesktop) setDetail(null); }, [isDesktop]);
  const open = (id: string, fly = false) => {
    setSelected(id); setDetail(id);
    const h = byId.get(id);
    if (fly && h) mapRef.current?.flyTo(h.lat, h.lon, Math.max(14, view?.zoom ?? 14));
  };

  const toggleSave = (h: BuyerHome) => setState((s) => {
    if (!s) return s;
    const has = s.saved.some((x) => x.id === h.id);
    const saved: SavedHome[] = has ? s.saved.filter((x) => x.id !== h.id) : [{ id: h.id, savedAt: new Date().toISOString(), price: h.price, address: h.address, alert: true }, ...s.saved];
    return { ...s, saved };
  });

  const onMove = useCallback((v: View) => { setView(v); setShown(PAGE); setState((s) => (s ? { ...s, view: { lat: v.lat, lon: v.lon, zoom: v.zoom, bounds: v.bounds } } : s)); }, []);

  const activeCount = (filters.types.length ? 1 : 0) + (filters.priceMin != null || filters.priceMax != null ? 1 : 0) + (filters.areaMin != null ? 1 : 0) + (filters.roomsMin != null ? 1 : 0) + (filters.verdicts.length ? 1 : 0);

  const bottomNav = (onDashboard: boolean) => (
    <nav aria-label="Boligkort" data-tour={onDashboard ? undefined : "nav"} className={`${onDashboard ? "fixed lg:hidden" : "absolute lg:bottom-4 lg:justify-end lg:p-0 lg:pr-4"} inset-x-0 bottom-0 z-30 flex justify-center p-3`}>
      <div className="flex w-full max-w-md items-stretch justify-around rounded-[22px] bg-white/95 p-1.5 shadow-[0_8px_30px_rgba(15,23,42,0.18)] ring-1 ring-slate-200/70 backdrop-blur lg:w-auto lg:gap-1">
        <NavBtn on={tab === "kort"} onClick={() => setTab("kort")} icon={<MapIcon size={20} />} label="Kort" />
        {!isDesktop && <NavBtn on={tab === "liste"} onClick={() => setTab("liste")} icon={<List size={20} />} label="Liste" />}
        <NavBtn on={tab === "gemte"} onClick={() => setTab("gemte")} icon={<Heart size={20} />} label="Gemte" badge={state?.saved.length || undefined} />
        <NavBtn on={tab === "overblik"} onClick={() => setTab("overblik")} icon={<LayoutDashboard size={20} />} label="Overblik" />
      </div>
    </nav>
  );
  const showIds = (ids: string[]) => { setFreshIds(new Set(ids)); setTab("kort"); const pts = ids.map((i) => byId.get(i)).filter((h): h is BuyerHome => !!h); if (pts.length) setTimeout(() => mapRef.current?.fitTo(pts), 50); };

  if (loadErr) return <Centered><p className="text-[16px] text-slate-700">Boligerne kunne ikke hentes. Genindlæs siden om lidt.</p></Centered>;

  return (
    <div className="fixed inset-0 flex overflow-hidden bg-white text-slate-900 antialiased">
      <div className="relative min-w-0 flex-1" data-tour="map">
        {state && (
          <BuyerMap ref={mapRef} homes={filtered} savedIds={savedIds} selectedId={selected} initialView={state.view} showPlans={showPlans}
            onSelect={select} onMove={onMove} onPlansState={setPlansState} />
        )}
        {!homes && <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/60 backdrop-blur-[2px]"><div className="flex items-center gap-2.5 rounded-full bg-white px-5 py-3 text-[15px] font-medium shadow-lg ring-1 ring-slate-200"><Loader2 size={18} className="animate-spin text-blue-600" /> Henter alle boliger til salg …</div></div>}

        {/* Top controls */}
        <div className="pointer-events-none absolute inset-x-0 top-0 z-20 p-3 sm:p-4">
          <div className="flex items-start gap-2">
            <a href="/boligkoeb" className="pointer-events-auto hidden h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white shadow-[0_4px_16px_rgba(15,23,42,0.14)] ring-1 ring-slate-200/70 sm:flex" aria-label="NordInvest boligkort">
              <Image src="/nordinvest-logo.png" alt="" width={28} height={28} className="object-contain mix-blend-multiply" />
            </a>
            <div className="pointer-events-auto min-w-0 flex-1 sm:max-w-[400px]" data-tour="search">
              <SearchBox homes={homes ?? []} onPlace={(pts) => mapRef.current?.fitTo(pts)} onHome={(h) => open(h.id, true)} />
            </div>
            <button type="button" data-tour="filters" onClick={() => setFilterOpen(true)} className={`pointer-events-auto flex h-12 shrink-0 items-center gap-2 rounded-full px-4 text-[15px] font-semibold shadow-[0_4px_16px_rgba(15,23,42,0.14)] ring-1 ${activeCount ? "bg-slate-900 text-white ring-slate-900" : "bg-white text-slate-800 ring-slate-200/70"}`}>
              <SlidersHorizontal size={17} /> <span className="hidden sm:inline">Filtre</span>{activeCount > 0 && <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-white px-1 text-[12px] text-slate-900">{activeCount}</span>}
            </button>
          </div>
          <div className="pointer-events-auto -mx-3 mt-2 flex gap-2 overflow-x-auto px-3 pb-1 [scrollbar-width:none] sm:mx-0 sm:px-0">
            <Chip on={filters.verdicts.length === 1 && filters.verdicts[0] === "godt"} onClick={() => setFilters({ verdicts: filters.verdicts.length === 1 && filters.verdicts[0] === "godt" ? [] : ["godt"] })} dot={VERDICT_COLOR.godt}>Kun gode køb</Chip>
            <Chip on={filters.onlyCut} onClick={() => setFilters({ onlyCut: !filters.onlyCut })}>Sat ned i pris</Chip>
            <Chip on={filters.onlyNew} onClick={() => setFilters({ onlyNew: !filters.onlyNew })}>Nye denne uge</Chip>
            {TYPE_CHIPS.slice(0, 4).map((c) => <Chip key={c.id} on={filters.types.includes(c.id)} onClick={() => setFilters({ types: filters.types.includes(c.id) ? filters.types.filter((t) => t !== c.id) : [...filters.types, c.id] })}>{c.label}</Chip>)}
            <Chip on={showPlans} onClick={() => setShowPlans(!showPlans)} dot="#7c3aed">Byggeprojekter</Chip>
          </div>
          {freshIds && (
            <div className="pointer-events-auto mt-2 inline-flex items-center gap-2 rounded-full bg-blue-600 py-1.5 pl-4 pr-1.5 text-[14px] font-semibold text-white shadow-lg">
              Viser {freshIds.size} nye boliger <button type="button" onClick={() => setFreshIds(null)} className="flex h-7 w-7 items-center justify-center rounded-full bg-white/20" aria-label="Vis alle boliger igen"><X size={14} /></button>
            </div>
          )}
        </div>

        {/* Right-side map buttons */}
        <div className="absolute right-3 top-[132px] z-20 flex flex-col gap-2 sm:right-4">
          <MapButton label="Find mig" onClick={() => navigator.geolocation?.getCurrentPosition((p) => mapRef.current?.flyTo(p.coords.latitude, p.coords.longitude, 13.5), () => alert("Vi kunne ikke finde din placering."))}><LocateFixed size={19} /></MapButton>
        </div>

        {/* Count + legend */}
        <div className="pointer-events-none absolute bottom-[92px] left-3 z-20 sm:left-4 lg:bottom-6">
          <div className="pointer-events-auto rounded-2xl bg-white/95 px-4 py-2.5 shadow-[0_4px_16px_rgba(15,23,42,0.14)] ring-1 ring-slate-200/70 backdrop-blur">
            <p className="text-[14px] font-semibold tabular-nums text-slate-900">{homes ? `${inView.length.toLocaleString("da-DK")} boliger her` : "…"}{homes && goodInView > 0 && <span className="font-medium text-emerald-700"> · {goodInView.toLocaleString("da-DK")} gode køb</span>}</p>
            <div className="mt-1 flex items-center gap-3 text-[12px] text-slate-600">
              {(["godt", "middel", "dyrt"] as const).map((v) => <span key={v} className="flex items-center gap-1 whitespace-nowrap"><span className="h-2.5 w-2.5 rounded-full ring-2 ring-white" style={{ background: VERDICT_COLOR[v] }} />{v === "godt" ? "Godt køb" : v === "middel" ? "Middel" : "Dyr"}</span>)}
              {showPlans && <span className="hidden items-center gap-1 whitespace-nowrap sm:flex"><span className="h-2.5 w-3 rounded-sm border border-dashed border-violet-600 bg-violet-200" />{plansState === "zoom" ? "Zoom ind: byggeprojekter" : plansState === "loading" ? "Henter …" : "Byggeprojekt"}</span>}
            </div>
          </div>
        </div>

        {/* Phone: the tapped home, one more tap opens it */}
        {!isDesktop && selectedHome && !detail && tab === "kort" && (
          <div className="absolute inset-x-3 bottom-[88px] z-30">
            <HomeCard h={selectedHome} saved={savedIds.has(selectedHome.id)} onOpen={() => setDetail(selectedHome.id)} onSave={() => toggleSave(selectedHome)} onClose={() => setSelected(null)} raised />
          </div>
        )}

        {/* Bottom navigation, floating like the map's own controls */}
        {bottomNav(false)}
      </div>

      {/* Desktop side panel: the homes in view, or the open home */}
      {isDesktop && (
        <aside className="relative flex w-[420px] shrink-0 flex-col border-l border-slate-200 bg-white xl:w-[460px]" data-tour="list">
          {detailHome && state ? (
            <HomeDetail home={detailHome} saved={savedIds.has(detailHome.id)} household={state.household} onHousehold={(hh) => setState((s) => (s ? { ...s, household: hh } : s))}
              onToggleSave={() => toggleSave(detailHome)} onClose={() => setDetail(null)} onSelect={(id) => open(id, true)}
              onShowPlans={() => { setShowPlans(true); mapRef.current?.flyTo(detailHome.lat, detailHome.lon, 14); }} kommuneName={detailHome.kommune ? KOMMUNE_NAME.get(detailHome.kommune) ?? null : null} />
          ) : (
            <ListPanel list={inView} shown={shown} more={() => setShown((n) => n + PAGE)} sort={filters.sort} onSort={(s) => setFilters({ sort: s })}
              selected={selectedHome} savedIds={savedIds} onOpen={(id) => open(id)} onSave={toggleSave} loading={!homes} />
          )}
        </aside>
      )}

      {/* Phone: list, and the open home, full screen */}
      {!isDesktop && tab === "liste" && (
        <Sheet onClose={() => setTab("kort")} title={`${inView.length.toLocaleString("da-DK")} boliger i kortudsnittet`}>
          <ListPanel list={inView} shown={shown} more={() => setShown((n) => n + PAGE)} sort={filters.sort} onSort={(s) => setFilters({ sort: s })}
            selected={null} savedIds={savedIds} onOpen={(id) => open(id)} onSave={toggleSave} loading={!homes} bare />
        </Sheet>
      )}
      {!isDesktop && detailHome && state && (
        <div className="fixed inset-0 z-[60] bg-white">
          <HomeDetail home={detailHome} saved={savedIds.has(detailHome.id)} household={state.household} onHousehold={(hh) => setState((s) => (s ? { ...s, household: hh } : s))}
            onToggleSave={() => toggleSave(detailHome)} onClose={() => setDetail(null)} onSelect={(id) => open(id, true)}
            onShowPlans={() => { setShowPlans(true); setDetail(null); setTab("kort"); mapRef.current?.flyTo(detailHome.lat, detailHome.lon, 14); }} kommuneName={detailHome.kommune ? KOMMUNE_NAME.get(detailHome.kommune) ?? null : null} />
        </div>
      )}

      {tab === "gemte" && state && (
        <Sheet onClose={() => setTab("kort")} title="Gemte boliger" wide>
          <SavedView saved={state.saved} byId={byId} onOpen={(id) => { setTab("kort"); open(id, true); }}
            onChange={(saved) => setState((s) => (s ? { ...s, saved } : s))} mail={state.mail} onMail={(mail) => setState((s) => (s ? { ...s, mail } : s))} />
        </Sheet>
      )}
      {tab === "overblik" && state && (
        <Dashboard state={state} inView={inView} byId={byId} center={view ? { lat: view.lat, lon: view.lon } : state.view} account={account} preview={!!preview} focusPassword={focusPassword}
          onHousehold={(hh) => setState((s) => (s ? { ...s, household: hh } : s))} onSaved={(saved) => setState((s) => (s ? { ...s, saved } : s))}
          onMail={(mail) => setState((s) => (s ? { ...s, mail } : s))} onOpen={(id) => { setTab("kort"); open(id, true); }} onMap={() => setTab("kort")}
          onShowIds={showIds} onBudget={(max) => { setFilters({ priceMax: max }); setTab("kort"); }}
          onGood={() => { setFilters({ verdicts: ["godt"] }); setTab("kort"); }} onPlans={() => { setShowPlans(true); setTab("kort"); if (view && view.zoom < 12.5) mapRef.current?.flyTo(view.lat, view.lon, 13); }}
          onTour={() => { setTab("kort"); setTourStep(0); }} nav={bottomNav(true)} />
      )}
      {preview && (
        <div className="fixed left-1/2 top-3 z-[90] flex max-w-[calc(100%-24px)] -translate-x-1/2 items-center gap-3 rounded-full bg-amber-400 py-1.5 pl-4 pr-1.5 text-[14px] font-semibold text-amber-950 shadow-lg">
          <span className="truncate">Du ser appen som {preview}. Intet gemmes.</span>
          <a href="/app/admin/medlemmer" className="shrink-0 rounded-full bg-amber-950 px-3 py-1.5 text-[13px] text-white">Afslut</a>
        </div>
      )}

      {filterOpen && <FilterSheet filters={filters} count={(f) => { const b = view?.bounds; return (homes ?? []).filter((h) => (!b || (h.lon >= b[0] && h.lat >= b[1] && h.lon <= b[2] && h.lat <= b[3])) && matches(h, f)).length; }} onApply={(f) => { setFilters(f); setFilterOpen(false); }} onClose={() => setFilterOpen(false)} />}

      {greeting && (
        <Greeting g={greeting} onClose={() => setGreeting(null)}
          onShow={() => { const ids = new Set(greeting.fresh.map((h) => h.id)); setFreshIds(ids); setGreeting(null); setTab("kort"); mapRef.current?.fitTo(greeting.fresh); }}
          onOpen={(id) => { setGreeting(null); open(id, true); }} />
      )}
      {tourStep != null && <Tour step={tourStep} isDesktop={isDesktop} onStep={setTourStep} onDone={() => { setTourStep(null); setState((s) => (s ? { ...s, tourDone: true } : s)); }} />}
    </div>
  );
}

/* ───────────────────────── pieces ───────────────────────── */

function useMedia(q: string) {
  const [m, setM] = useState(true);
  useEffect(() => { const mm = window.matchMedia(q); setM(mm.matches); const on = () => setM(mm.matches); mm.addEventListener("change", on); return () => mm.removeEventListener("change", on); }, [q]);
  return m;
}

const Centered = ({ children }: { children: React.ReactNode }) => <div className="fixed inset-0 flex items-center justify-center bg-white p-6 text-center">{children}</div>;

function Chip({ on, onClick, children, dot }: { on: boolean; onClick: () => void; children: React.ReactNode; dot?: string }) {
  return (
    <button type="button" aria-pressed={on} onClick={onClick} className={`flex h-10 shrink-0 items-center gap-2 whitespace-nowrap rounded-full px-4 text-[14px] font-semibold shadow-[0_2px_10px_rgba(15,23,42,0.12)] ring-1 transition-colors ${on ? "bg-slate-900 text-white ring-slate-900" : "bg-white text-slate-700 ring-slate-200/70 hover:text-slate-900"}`}>
      {dot && <span className="h-2.5 w-2.5 rounded-full ring-2 ring-white/80" style={{ background: dot }} />}{children}
    </button>
  );
}

const MapButton = ({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) => (
  <button type="button" aria-label={label} title={label} onClick={onClick} className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-slate-700 shadow-[0_4px_16px_rgba(15,23,42,0.14)] ring-1 ring-slate-200/70 hover:text-slate-900">{children}</button>
);

function NavBtn({ on, onClick, icon, label, badge }: { on: boolean; onClick: () => void; icon: React.ReactNode; label: string; badge?: number }) {
  return (
    <button type="button" onClick={onClick} aria-current={on ? "page" : undefined} className={`relative flex min-h-[54px] min-w-[68px] flex-1 flex-col items-center justify-center gap-0.5 rounded-2xl px-3 text-[12px] font-semibold transition-colors lg:flex-none lg:min-w-[84px] ${on ? "bg-blue-600 text-white" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"}`}>
      {icon}{label}
      {badge ? <span className={`absolute right-2.5 top-1.5 min-w-[18px] rounded-full px-1 text-[11px] leading-[18px] ${on ? "bg-white text-blue-700" : "bg-rose-500 text-white"}`}>{badge}</span> : null}
    </button>
  );
}

function Sheet({ title, onClose, children, wide }: { title: string; onClose: () => void; children: React.ReactNode; wide?: boolean }) {
  useEffect(() => { const k = (e: KeyboardEvent) => e.key === "Escape" && onClose(); addEventListener("keydown", k); return () => removeEventListener("keydown", k); }, [onClose]);
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/30 lg:items-center lg:p-6" onClick={onClose}>
      <div role="dialog" aria-modal aria-label={title} onClick={(e) => e.stopPropagation()} className={`flex h-[100dvh] w-full flex-col bg-white lg:h-auto lg:max-h-[88vh] lg:rounded-3xl lg:shadow-2xl ${wide ? "lg:max-w-[760px]" : "lg:max-w-[520px]"}`}>
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3">
          <h2 className="text-[18px] font-semibold tracking-[-0.01em]">{title}</h2>
          <button type="button" onClick={onClose} className="flex h-10 w-10 items-center justify-center rounded-full text-slate-600 hover:bg-slate-100" aria-label="Luk"><X size={20} /></button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">{children}</div>
      </div>
    </div>
  );
}

/* Search: towns, kommuner and addresses of homes for sale. */
function SearchBox({ homes, onPlace, onHome }: { homes: BuyerHome[]; onPlace: (pts: { lat: number; lon: number }[]) => void; onHome: (h: BuyerHome) => void }) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState("");
  const towns = useMemo(() => {
    const m = new Map<string, number[]>();
    for (const [z, name] of Object.entries(ZIP_NAME)) { const a = m.get(name); if (a) a.push(Number(z)); else m.set(name, [Number(z)]); }
    return Array.from(m, ([name, zips]) => ({ name, zips }));
  }, []);
  const s = q.trim().toLowerCase();
  const hits = useMemo(() => {
    if (s.length < 2) return [];
    const isZip = /^\d{3,4}$/.test(s);
    const t = towns.filter((x) => (isZip ? x.zips.some((z) => String(z).startsWith(s)) : x.name.toLowerCase().startsWith(s))).slice(0, 4).map((x) => ({ kind: "by" as const, label: x.name, sub: x.zips.length === 1 ? String(x.zips[0]) : `${x.zips[0]}-${x.zips[x.zips.length - 1]}`, zips: x.zips }));
    const k = MUNICIPALITIES.filter((m) => m.name.toLowerCase().startsWith(s)).slice(0, 2).map((m) => ({ kind: "kommune" as const, label: `${m.name} Kommune`, sub: "Kommune", slug: m.slug }));
    const a = s.length >= 3 && !isZip ? homes.filter((h) => h.address.toLowerCase().includes(s)).slice(0, 5).map((h) => ({ kind: "bolig" as const, label: h.address.split(",")[0], sub: `${mio(h.price)} · ${h.area} m²`, h })) : [];
    return [...k, ...t, ...a];
  }, [s, towns, homes]);
  const pick = (x: (typeof hits)[number]) => {
    setOpen(false); setNote("");
    if (x.kind === "bolig") { setQ(x.label); onHome(x.h); return; }
    const pts = x.kind === "by" ? homes.filter((h) => x.zips.includes(h.zip)) : homes.filter((h) => h.kommune === x.slug);
    setQ(x.label);
    if (pts.length) onPlace(pts); else setNote(`Ingen boliger til salg i ${x.label} lige nu.`);
  };
  return (
    <div className="relative">
      <div className="flex h-12 items-center gap-2 rounded-full bg-white px-4 shadow-[0_4px_16px_rgba(15,23,42,0.14)] ring-1 ring-slate-200/70 focus-within:ring-2 focus-within:ring-blue-500">
        <Search size={18} className="shrink-0 text-slate-400" />
        <input value={q} onChange={(e) => { setQ(e.target.value); setOpen(true); setNote(""); }} onFocus={() => setOpen(true)} onKeyDown={(e) => { if (e.key === "Enter" && hits[0]) pick(hits[0]); if (e.key === "Escape") setOpen(false); }}
          placeholder="Søg by, postnummer eller adresse" aria-label="Søg by, postnummer eller adresse" className="min-w-0 flex-1 bg-transparent text-[16px] text-slate-900 placeholder:text-slate-400 focus:outline-none" />
        {q && <button type="button" onClick={() => { setQ(""); setNote(""); }} aria-label="Ryd søgning" className="text-slate-400 hover:text-slate-700"><X size={16} /></button>}
      </div>
      {open && hits.length > 0 && (
        <ul role="listbox" className="absolute inset-x-0 top-[54px] z-40 overflow-hidden rounded-2xl bg-white py-1.5 shadow-[0_12px_40px_rgba(15,23,42,0.2)] ring-1 ring-slate-200">
          {hits.map((x, i) => (
            <li key={x.kind + x.label + i}>
              <button type="button" role="option" aria-selected={i === 0} onMouseDown={(e) => e.preventDefault()} onClick={() => pick(x)} className="flex min-h-[48px] w-full items-center gap-3 px-4 text-left hover:bg-slate-50">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500">{x.kind === "bolig" ? <Building2 size={15} /> : <MapIcon size={15} />}</span>
                <span className="min-w-0"><span className="block truncate text-[15px] font-medium text-slate-900">{x.label}</span><span className="block text-[12px] text-slate-500">{x.sub}</span></span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {note && <p className="absolute left-2 top-[54px] rounded-lg bg-white px-3 py-2 text-[13px] text-slate-600 shadow ring-1 ring-slate-200">{note}</p>}
    </div>
  );
}

function ListPanel({ list, shown, more, sort, onSort, selected, savedIds, onOpen, onSave, onHover, loading, bare }: {
  list: BuyerHome[]; shown: number; more: () => void; sort: Filters["sort"]; onSort: (s: Filters["sort"]) => void; selected: BuyerHome | null;
  savedIds: Set<string>; onOpen: (id: string) => void; onSave: (h: BuyerHome) => void; onHover?: (id: string | null) => void; loading: boolean; bare?: boolean;
}) {
  const visible = list.slice(0, shown);
  const images = useImages([...(selected ? [selected.id] : []), ...visible.map((h) => h.id)]);
  return (
    <div className={`flex min-h-0 flex-col ${bare ? "" : "h-full"}`}>
      <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-3">
        {!bare && <p className="text-[15px] font-semibold tabular-nums text-slate-900">{loading ? "Henter boliger …" : `${list.length.toLocaleString("da-DK")} boliger i kortudsnittet`}</p>}
        <label className={`relative flex items-center ${bare ? "w-full" : ""}`}>
          <span className="sr-only">Sortér efter</span>
          <select value={sort} onChange={(e) => onSort(e.target.value as Filters["sort"])} className="h-10 w-full appearance-none rounded-full border border-slate-200 bg-white pl-4 pr-9 text-[14px] font-semibold text-slate-800 focus:border-blue-500 focus:outline-none">
            {SORTS.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
          </select>
          <ChevronDown size={16} className="pointer-events-none absolute right-3 text-slate-500" />
        </label>
      </div>
      <div className={`${bare ? "" : "min-h-0 flex-1 overflow-y-auto overscroll-contain"} px-3 pb-28 pt-3 lg:pb-6`}>
        {selected && (
          <div className="mb-3">
            <p className="px-2 pb-1.5 text-[12px] font-semibold uppercase tracking-[0.06em] text-blue-700">Valgt på kortet</p>
            <HomeCard h={selected} img={images.get(selected.id)} saved={savedIds.has(selected.id)} onOpen={() => onOpen(selected.id)} onSave={() => onSave(selected)} highlight />
          </div>
        )}
        {!loading && list.length === 0 && (
          <div className="px-4 py-12 text-center">
            <p className="text-[16px] font-semibold text-slate-800">Ingen boliger her med dine filtre</p>
            <p className="mt-1 text-[14px] text-slate-500">Zoom ud, flyt kortet eller løsn et filter.</p>
          </div>
        )}
        <ul className="space-y-2.5">
          {visible.map((h) => (
            <li key={h.id} onMouseEnter={() => onHover?.(h.id)}>
              <HomeCard h={h} img={images.get(h.id)} saved={savedIds.has(h.id)} onOpen={() => onOpen(h.id)} onSave={() => onSave(h)} />
            </li>
          ))}
        </ul>
        {list.length > shown && <button type="button" onClick={more} className="mt-3 flex min-h-[48px] w-full items-center justify-center rounded-xl border border-slate-200 text-[15px] font-semibold text-slate-700 hover:border-slate-300">Vis flere ({(list.length - shown).toLocaleString("da-DK")} tilbage)</button>}
      </div>
    </div>
  );
}

function HomeCard({ h, img, saved, onOpen, onSave, onClose, highlight, raised }: { h: BuyerHome; img?: string | null; saved: boolean; onOpen: () => void; onSave: () => void; onClose?: () => void; highlight?: boolean; raised?: boolean }) {
  const images = useImages(img === undefined ? [h.id] : []);
  const src = img ?? images.get(h.id) ?? null;
  return (
    <div className={`group relative flex gap-3 rounded-2xl bg-white p-2.5 transition-shadow ${raised ? "shadow-[0_10px_40px_rgba(15,23,42,0.25)] ring-1 ring-slate-200" : highlight ? "ring-2 ring-blue-500" : "ring-1 ring-slate-200 hover:shadow-[0_6px_20px_rgba(15,23,42,0.1)]"}`}>
      <button type="button" onClick={onOpen} className="absolute inset-0 rounded-2xl" aria-label={`Åbn ${h.address}`} />
      <div className="relative h-[92px] w-[112px] shrink-0 overflow-hidden rounded-xl bg-slate-100">
        {src ? <img src={src} alt="" loading="lazy" className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center text-slate-300"><Building2 size={24} /></div>}
        {h.cutPct > 0 && <span className="absolute left-1.5 top-1.5 rounded-md bg-emerald-600 px-1.5 py-0.5 text-[11px] font-semibold text-white">−{pct(h.cutPct)}</span>}
      </div>
      <div className="pointer-events-none min-w-0 flex-1 py-0.5">
        <div className="flex items-start justify-between gap-2">
          <p className="text-[17px] font-semibold tabular-nums tracking-[-0.01em] text-slate-900">{mio(h.price)}</p>
        </div>
        <p className="truncate text-[14px] text-slate-700">{h.address.split(",")[0]}</p>
        <p className="truncate text-[13px] text-slate-500">{h.address.split(",").slice(1).join(",").trim()}</p>
        <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1">
          <VerdictPill v={h.verdict} />
          <span className="text-[12px] tabular-nums text-slate-500">{h.area} m²{h.rooms ? ` · ${h.rooms} vær.` : ""} · {h.deltaPct > 0 ? "+" : ""}{pct(h.deltaPct)}</span>
        </div>
      </div>
      <div className="relative flex flex-col items-end justify-between">
        <button type="button" onClick={onSave} aria-pressed={saved} aria-label={saved ? "Fjern fra gemte" : "Gem boligen"} className={`flex h-10 w-10 items-center justify-center rounded-full ${saved ? "text-rose-500" : "text-slate-400 hover:text-rose-500"}`}><Heart size={20} fill={saved ? "currentColor" : "none"} /></button>
        {onClose && <button type="button" onClick={onClose} aria-label="Luk" className="flex h-9 w-9 items-center justify-center rounded-full text-slate-400 hover:text-slate-700"><X size={17} /></button>}
      </div>
    </div>
  );
}

const PRICE_MAX = [1_500_000, 2_000_000, 3_000_000, 4_000_000, 5_000_000, 7_500_000, 10_000_000];
const AREA_MIN = [40, 60, 80, 100, 130, 160];

function FilterSheet({ filters, count, onApply, onClose }: { filters: Filters; count: (f: Filters) => number; onApply: (f: Filters) => void; onClose: () => void }) {
  const [f, setF] = useState(filters);
  const n = useMemo(() => count(f), [f, count]);
  const toggle = <T,>(arr: T[], v: T) => (arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);
  const pill = (on: boolean) => `min-h-[44px] rounded-full border px-4 text-[15px] font-medium transition-colors ${on ? "border-slate-900 bg-slate-900 text-white" : "border-slate-300 bg-white text-slate-700 hover:border-slate-400"}`;
  const H = ({ children }: { children: React.ReactNode }) => <h3 className="mb-2.5 text-[15px] font-semibold text-slate-900">{children}</h3>;
  return (
    <Sheet title="Filtre" onClose={onClose}>
      <div className="space-y-7 px-5 py-5">
        <div><H>Vurdering</H><div className="flex flex-wrap gap-2">{(["godt", "middel", "dyrt"] as const).map((v) => <button key={v} type="button" aria-pressed={f.verdicts.includes(v)} onClick={() => setF({ ...f, verdicts: toggle(f.verdicts, v) })} className={`${pill(f.verdicts.includes(v))} inline-flex items-center gap-2`}><span className="h-2.5 w-2.5 rounded-full" style={{ background: VERDICT_COLOR[v] }} />{v === "godt" ? "Godt køb" : v === "middel" ? "Middel" : "Dyr"}</button>)}</div></div>
        <div><H>Boligtype</H><div className="flex flex-wrap gap-2">{TYPE_CHIPS.map((c) => <button key={c.id} type="button" aria-pressed={f.types.includes(c.id)} onClick={() => setF({ ...f, types: toggle(f.types, c.id) })} className={pill(f.types.includes(c.id))}>{c.label}</button>)}</div></div>
        <div><H>Pris op til</H><div className="flex flex-wrap gap-2">{PRICE_MAX.map((p) => <button key={p} type="button" aria-pressed={f.priceMax === p} onClick={() => setF({ ...f, priceMax: f.priceMax === p ? null : p })} className={pill(f.priceMax === p)}>{mio(p).replace(" kr", "")}</button>)}</div>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <NumField label="Fra (kr)" v={f.priceMin} set={(v) => setF({ ...f, priceMin: v })} />
            <NumField label="Til (kr)" v={f.priceMax} set={(v) => setF({ ...f, priceMax: v })} />
          </div>
        </div>
        <div><H>Mindst</H><div className="flex flex-wrap gap-2">{AREA_MIN.map((a) => <button key={a} type="button" aria-pressed={f.areaMin === a} onClick={() => setF({ ...f, areaMin: f.areaMin === a ? null : a })} className={pill(f.areaMin === a)}>{a} m²</button>)}</div></div>
        <div><H>Værelser</H><div className="flex flex-wrap gap-2">{[1, 2, 3, 4, 5].map((r) => <button key={r} type="button" aria-pressed={f.roomsMin === r} onClick={() => setF({ ...f, roomsMin: f.roomsMin === r ? null : r })} className={pill(f.roomsMin === r)}>{r}+</button>)}</div></div>
        <div><H>Andet</H><div className="flex flex-wrap gap-2">
          <button type="button" aria-pressed={f.onlyCut} onClick={() => setF({ ...f, onlyCut: !f.onlyCut })} className={pill(f.onlyCut)}>Sat ned i pris</button>
          <button type="button" aria-pressed={f.onlyNew} onClick={() => setF({ ...f, onlyNew: !f.onlyNew })} className={pill(f.onlyNew)}>Nye denne uge</button>
        </div></div>
      </div>
      <div className="sticky bottom-0 flex items-center gap-3 border-t border-slate-100 bg-white px-5 py-3">
        <button type="button" onClick={() => setF({ ...EMPTY_FILTERS, sort: f.sort })} className="min-h-[48px] px-2 text-[15px] font-semibold text-slate-600 underline-offset-2 hover:underline">Nulstil</button>
        <button type="button" onClick={() => onApply(f)} className="min-h-[48px] flex-1 rounded-full bg-blue-600 text-[16px] font-semibold text-white hover:bg-blue-500">Vis {n.toLocaleString("da-DK")} boliger her</button>
      </div>
    </Sheet>
  );
}

function NumField({ label, v, set }: { label: string; v: number | null; set: (v: number | null) => void }) {
  return (
    <label className="block"><span className="text-[13px] text-slate-500">{label}</span>
      <input inputMode="numeric" value={v == null ? "" : v.toLocaleString("da-DK")} onChange={(e) => { const d = e.target.value.replace(/\D/g, ""); set(d ? Number(d) : null); }} className="mt-1 h-11 w-full rounded-lg border border-slate-300 px-3 text-[16px] tabular-nums focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-100" />
    </label>
  );
}

function SavedView({ saved, byId, onOpen, onChange, mail, onMail }: { saved: SavedHome[]; byId: Map<string, BuyerHome>; onOpen: (id: string) => void; onChange: (s: SavedHome[]) => void; mail: BuyerState["mail"]; onMail: (m: BuyerState["mail"]) => void }) {
  const images = useImages(saved.map((s) => s.id));
  if (!saved.length) return (
    <div className="px-6 py-14 text-center">
      <Heart size={32} className="mx-auto text-slate-300" />
      <p className="mt-3 text-[17px] font-semibold">Ingen gemte boliger endnu</p>
      <p className="mx-auto mt-1 max-w-sm text-[15px] text-slate-500">Tryk på hjertet på en bolig for at gemme den. Så får du besked, hvis prisen falder, eller den bliver solgt.</p>
    </div>
  );
  return (
    <div className="px-4 py-4 sm:px-5">
      <MailToggle label="Mail mig ved prisfald og salg" on={mail.priceDrops} onChange={(v) => onMail({ ...mail, priceDrops: v })} />
      <ul className="mt-4 space-y-2.5">
        {saved.map((s) => {
          const h = byId.get(s.id);
          const diff = h ? h.price - s.price : 0;
          return (
            <li key={s.id} className="flex items-center gap-3 rounded-2xl p-2.5 ring-1 ring-slate-200">
              <button type="button" disabled={!h} onClick={() => onOpen(s.id)} className="flex min-w-0 flex-1 items-center gap-3 text-left disabled:cursor-default">
                <span className="h-16 w-20 shrink-0 overflow-hidden rounded-lg bg-slate-100">{images.get(s.id) && <img src={images.get(s.id)!} alt="" className="h-full w-full object-cover" />}</span>
                <span className="min-w-0">
                  <span className="block truncate text-[15px] font-semibold text-slate-900">{s.address.split(",")[0]}</span>
                  {h ? (
                    <span className="block text-[14px] tabular-nums text-slate-600">{mio(h.price)}{diff !== 0 && <span className={diff < 0 ? "font-semibold text-emerald-700" : "text-rose-700"}> {diff < 0 ? "−" : "+"}{kr(Math.abs(diff))} siden du gemte</span>}</span>
                  ) : <span className="block text-[14px] font-medium text-slate-500">Ikke længere til salg</span>}
                  {h && <span className="mt-1 inline-block"><VerdictPill v={h.verdict} /></span>}
                </span>
              </button>
              <div className="flex flex-col items-center gap-1">
                <button type="button" onClick={() => onChange(saved.map((x) => (x.id === s.id ? { ...x, alert: !x.alert } : x)))} aria-pressed={s.alert} aria-label={s.alert ? "Slå besked fra" : "Slå besked til"} title={s.alert ? "Du får besked" : "Ingen besked"} className={`flex h-10 w-10 items-center justify-center rounded-full ${s.alert ? "bg-blue-50 text-blue-700" : "text-slate-400 hover:bg-slate-100"}`}><Bell size={18} /></button>
                <button type="button" onClick={() => onChange(saved.filter((x) => x.id !== s.id))} aria-label="Fjern fra gemte" className="flex h-10 w-10 items-center justify-center rounded-full text-rose-500 hover:bg-rose-50"><Heart size={18} fill="currentColor" /></button>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function Greeting({ g, onClose, onShow, onOpen }: { g: { fresh: BuyerHome[]; drops: { h: BuyerHome; from: number }[]; since: string }; onClose: () => void; onShow: () => void; onOpen: (id: string) => void }) {
  const images = useImages(g.fresh.slice(0, 3).map((h) => h.id));
  const days = Math.max(1, Math.round((Date.now() - Date.parse(g.since)) / 86400_000));
  const when = days <= 1 ? "siden i går" : `de seneste ${days} dage`;
  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center bg-slate-900/40 p-3 sm:items-center" onClick={onClose}>
      <div role="dialog" aria-modal aria-label="Nyt siden sidst" onClick={(e) => e.stopPropagation()} className="w-full max-w-[460px] rounded-3xl bg-white p-6 shadow-2xl">
        <p className="text-[13px] font-semibold uppercase tracking-[0.08em] text-blue-700">Velkommen tilbage</p>
        <h2 className="mt-1.5 text-[24px] font-semibold leading-tight tracking-[-0.02em]">
          {g.fresh.length ? `${g.fresh.length === 1 ? "1 ny bolig" : `${g.fresh.length} nye boliger`} ${when}` : `Prisfald ${when}`}
        </h2>
        <p className="mt-1.5 text-[15px] text-slate-600">{g.fresh.length ? "I området du kiggede på, med dine filtre." : ""}{g.drops.length ? ` ${g.drops.length === 1 ? "En af dine gemte boliger" : `${g.drops.length} af dine gemte boliger`} er sat ned.` : ""}</p>
        <ul className="mt-4 space-y-2">
          {g.drops.slice(0, 2).map(({ h, from }) => (
            <li key={h.id}><button type="button" onClick={() => onOpen(h.id)} className="flex w-full items-center justify-between gap-3 rounded-xl bg-emerald-50 px-3.5 py-3 text-left"><span className="truncate text-[15px] font-medium">{h.address.split(",")[0]}</span><span className="text-[14px] font-semibold tabular-nums text-emerald-700">−{kr(from - h.price)}</span></button></li>
          ))}
          {g.fresh.slice(0, 3).map((h) => (
            <li key={h.id}><button type="button" onClick={() => onOpen(h.id)} className="flex w-full items-center gap-3 rounded-xl p-2 text-left ring-1 ring-slate-200 hover:bg-slate-50">
              <span className="h-14 w-16 shrink-0 overflow-hidden rounded-lg bg-slate-100">{images.get(h.id) && <img src={images.get(h.id)!} alt="" className="h-full w-full object-cover" />}</span>
              <span className="min-w-0 flex-1"><span className="block truncate text-[15px] font-semibold">{mio(h.price)}</span><span className="block truncate text-[13px] text-slate-500">{h.address.split(",")[0]} · {h.area} m²</span></span>
              <VerdictPill v={h.verdict} />
            </button></li>
          ))}
        </ul>
        <div className="mt-5 flex gap-2">
          {g.fresh.length > 0 && <button type="button" onClick={onShow} className="min-h-[48px] flex-1 rounded-full bg-blue-600 text-[15px] font-semibold text-white hover:bg-blue-500">Vis {g.fresh.length === 1 ? "den" : "dem"} på kortet</button>}
          <button type="button" onClick={onClose} className="min-h-[48px] rounded-full px-5 text-[15px] font-semibold text-slate-600 hover:bg-slate-100">Senere</button>
        </div>
      </div>
    </div>
  );
}

const TOUR = [
  { target: "map", title: "Alle boliger til salg, på ét kort", text: "Hver prik er en bolig. Grøn er et godt køb, gul er middel, og rød er dyr i forhold til lignende boliger i området. Zoom med to fingre eller musens hjul." },
  { target: "map", title: "Hold over eller tryk på en prik", text: "Så ser du pris, størrelse og vurdering med det samme. Tryk igen for hele analysen: pris mod området, hvad du kan låne, friværdi og byggeprojekter i nærheden." },
  { target: "search", title: "Søg dig frem", text: "Skriv en by, et postnummer eller en adresse, så flytter kortet derhen." },
  { target: "filters", title: "Filtrér og sortér", text: "Vælg pris, boligtype, størrelse og vurdering. Listen sorteres efter bedste køb, pris eller prisfald. Vi husker dine filtre til næste gang." },
  { target: "nav", title: "Gem og få besked", text: "Tryk på hjertet for at gemme en bolig. Vi giver besked, hvis prisen falder, og når du kommer tilbage, viser vi de nye boliger siden sidst." },
];

function Tour({ step, isDesktop, onStep, onDone }: { step: number; isDesktop: boolean; onStep: (n: number) => void; onDone: () => void }) {
  const s = TOUR[step];
  const [rect, setRect] = useState<DOMRect | null>(null);
  useEffect(() => {
    const el = document.querySelector(`[data-tour="${s.target}"]`);
    setRect(el && s.target !== "map" ? el.getBoundingClientRect() : null);
  }, [s.target, isDesktop]);
  const last = step === TOUR.length - 1;
  return (
    <div className="fixed inset-0 z-[80]" role="dialog" aria-modal aria-label="Guide til boligkortet">
      {rect ? <div className="pointer-events-none absolute rounded-[26px] ring-4 ring-blue-500 transition-all" style={{ left: rect.left - 6, top: rect.top - 6, width: rect.width + 12, height: rect.height + 12, boxShadow: "0 0 0 9999px rgba(15,23,42,0.55)" }} /> : <div className="absolute inset-0 bg-slate-900/45" />}
      <div className={`absolute left-1/2 w-[calc(100%-24px)] max-w-[420px] -translate-x-1/2 rounded-3xl bg-white p-6 shadow-2xl ${rect && rect.top > window.innerHeight / 2 ? "bottom-auto top-1/4" : "bottom-[110px] sm:bottom-auto sm:top-1/3"}`}>
        {step === 0 && (
          <div className="mb-4 flex gap-2">{(["godt", "middel", "dyrt"] as const).map((v) => <span key={v} className="h-4 w-4 rounded-full ring-2 ring-white shadow" style={{ background: VERDICT_COLOR[v] }} />)}</div>
        )}
        <p className="text-[12px] font-semibold uppercase tracking-[0.08em] text-blue-700">Guide {step + 1} af {TOUR.length}</p>
        <h2 className="mt-1 text-[21px] font-semibold leading-tight tracking-[-0.02em]">{s.title}</h2>
        <p className="mt-2 text-[15px] leading-relaxed text-slate-600">{s.text}</p>
        <div className="mt-5 flex items-center gap-2">
          <div className="flex flex-1 gap-1.5">{TOUR.map((_, i) => <span key={i} className={`h-1.5 rounded-full transition-all ${i === step ? "w-6 bg-blue-600" : "w-1.5 bg-slate-200"}`} />)}</div>
          <button type="button" onClick={onDone} className="min-h-[44px] px-3 text-[14px] font-semibold text-slate-500 hover:text-slate-800">Spring over</button>
          <button type="button" onClick={() => (last ? onDone() : onStep(step + 1))} className="min-h-[44px] rounded-full bg-blue-600 px-5 text-[15px] font-semibold text-white hover:bg-blue-500">{last ? "Kom i gang" : "Næste"}</button>
        </div>
      </div>
    </div>
  );
}

