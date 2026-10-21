"use client";
/* eslint-disable @typescript-eslint/no-explicit-any */

import { useCallback, useEffect, useRef, useState } from "react";
import "maplibre-gl/dist/maplibre-gl.css";
import { ArrowLeft, ChevronDown, ChevronUp, Loader2, RotateCcw, RotateCw } from "lucide-react";
import type { BuyerHome } from "@/lib/buyer/market";
import { googleKeyRefused, loadGoogle } from "@/lib/buyer/google";
import { VERDICT_COLOR } from "./BuyerMap";

/*
 * Street view: Google's 360° street photos with every home for sale around
 * you as a price tag in its verdict colour. You drive instead of clicking:
 * hold the arrow (or ↑ / W) and it rolls along the road, following the bends;
 * ↓ backs up, ← → turn. A small map in the corner shows where you are.
 * Tapping a price tag opens that home.
 */

/** The little yellow man you drop on a street. */
export function Pegman({ size = 24 }: { size?: number }) {
  return (
    <svg width={size * 0.6} height={size} viewBox="0 0 24 40" aria-hidden>
      <g fill="#fbbc04" stroke="#a86b00" strokeWidth="1.3" strokeLinejoin="round">
        <circle cx="12" cy="6.5" r="5" />
        <path d="M6 12.5h12a3 3 0 0 1 3 3v8.5a2 2 0 0 1-2 2h-1.5V36a2 2 0 0 1-2 2h-7a2 2 0 0 1-2-2V26H5a2 2 0 0 1-2-2v-8.5a3 3 0 0 1 3-3z" />
      </g>
      <path d="M12 27v10" stroke="#a86b00" strokeWidth="1.3" />
    </svg>
  );
}

export type StreetStart = { lat: number; lon: number; heading?: number; lookAt?: { lat: number; lon: number } };
type Pos = { lat: number; lon: number; heading: number };

const STYLE = "https://tiles.openfreemap.org/styles/liberty";
const RANGE_M = 260;
const rad = (d: number) => (d * Math.PI) / 180;
function meters(a: { lat: number; lon: number }, b: { lat: number; lon: number }) {
  const x = rad(b.lon - a.lon) * Math.cos(rad((a.lat + b.lat) / 2)), y = rad(b.lat - a.lat);
  return Math.hypot(x, y) * 6371000;
}
function bearing(a: { lat: number; lon: number }, b: { lat: number; lon: number }) {
  const y = Math.sin(rad(b.lon - a.lon)) * Math.cos(rad(b.lat));
  const x = Math.cos(rad(a.lat)) * Math.sin(rad(b.lat)) - Math.sin(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.cos(rad(b.lon - a.lon));
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}
const angle = (a: number, b: number) => Math.abs(((a - b + 540) % 360) - 180);

/** A price tag in the verdict colour, as an image Google can draw in the panorama. */
function tag(price: number, verdict: BuyerHome["verdict"], on: boolean) {
  const text = `${(price / 1e6).toFixed(price < 1e7 ? 1 : 0).replace(".", ",")} mio.`;
  const w = Math.round(text.length * 8.2 + 26), h = 30, c = VERDICT_COLOR[verdict];
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h + 9}"><defs><filter id="s" x="-20%" y="-20%" width="140%" height="160%"><feDropShadow dx="0" dy="1.5" stdDeviation="1.5" flood-opacity=".35"/></filter></defs><g filter="url(#s)"><rect x="1" y="1" width="${w - 2}" height="${h - 2}" rx="${(h - 2) / 2}" fill="${on ? "#0f172a" : "#fff"}" stroke="${c}" stroke-width="${on ? 0 : 2.5}"/><path d="M${w / 2 - 6} ${h - 2} L${w / 2} ${h + 6} L${w / 2 + 6} ${h - 2} Z" fill="${on ? "#0f172a" : c}"/></g><circle cx="15" cy="${h / 2}" r="5" fill="${c}"/><text x="25" y="${h / 2 + 5}" font-family="-apple-system,Segoe UI,Helvetica,Arial,sans-serif" font-size="14" font-weight="700" fill="${on ? "#fff" : "#0f172a"}">${text}</text></svg>`;
  return { url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`, w, h: h + 9 };
}

export function StreetView({ start, homes, selectedId, onSelect, onClose, isDesktop }: {
  start: StreetStart; homes: BuyerHome[]; selectedId: string | null; onSelect: (id: string) => void; onClose: (at: Pos | null) => void; isDesktop: boolean;
}) {
  const box = useRef<HTMLDivElement>(null);
  const g = useRef<any>(null);
  const pano = useRef<any>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "none" | "nokey">("loading");
  const [pos, setPos] = useState<Pos | null>(null);
  const [place, setPlace] = useState("");
  const [drive, setDrive] = useState<0 | 1 | -1>(0);
  const [hint, setHint] = useState(true);
  const latest = useRef({ homes, onSelect });
  latest.current = { homes, onSelect };

  // Open the panorama nearest the point, facing the home when there is one.
  useEffect(() => {
    let dead = false;
    (async () => {
      const google = await loadGoogle();
      if (dead) return;
      if (!google) { setStatus("nokey"); return; }
      const sv = await google.maps.importLibrary("streetView");
      await google.maps.importLibrary("marker");
      g.current = google;
      // Google's own street imagery only: people's own photo spheres have no road to drive along.
      const find = (radius: number) => new sv.StreetViewService().getPanorama({ location: { lat: start.lat, lng: start.lon }, radius, source: sv.StreetViewSource.GOOGLE ?? sv.StreetViewSource.OUTDOOR, preference: sv.StreetViewPreference.NEAREST }).then((r: any) => r.data).catch(() => null);
      const data = (await find(60)) ?? (await find(250));
      if (dead) return;
      if (googleKeyRefused()) { setStatus("nokey"); return; }
      if (!data?.location) { setStatus("none"); return; }
      const at = { lat: data.location.latLng.lat(), lon: data.location.latLng.lng() };
      const heading = start.lookAt ? bearing(at, start.lookAt) : start.heading ?? (data.links?.[0]?.heading ?? 0);
      const p = new sv.StreetViewPanorama(box.current, {
        pano: data.location.pano, pov: { heading, pitch: start.lookAt ? 2 : 0 }, zoom: 0,
        addressControl: false, fullscreenControl: false, enableCloseButton: false, motionTracking: false, motionTrackingControl: false,
        panControl: false, zoomControl: isDesktop, linksControl: true, clickToGo: true, showRoadLabels: true,
      });
      pano.current = p;
      const sync = () => {
        const l = p.getPosition();
        if (!l) return;
        setPos({ lat: l.lat(), lon: l.lng(), heading: p.getPov().heading });
        setPlace((p.getLocation()?.description ?? "").split(",").slice(0, 2).join(",").trim());
      };
      p.addListener("position_changed", sync);
      p.addListener("pov_changed", () => setPos((s) => (s ? { ...s, heading: p.getPov().heading } : s)));
      sync();
      setStatus("ready");
    })();
    return () => { dead = true; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // The homes around you as price tags. Rebuilt as you move; the ones you pass stay put.
  const markers = useRef(new Map<string, any>());
  const near = useRef<string>("");
  useEffect(() => {
    const google = g.current, p = pano.current;
    if (!google || !p || !pos) return;
    const list = homes.map((h) => ({ h, d: meters(pos, h) })).filter((x) => x.d < RANGE_M).sort((a, b) => a.d - b.d).slice(0, 45);
    const key = list.map((x) => x.h.id).join() + "|" + selectedId;
    if (key === near.current) return;
    near.current = key;
    const want = new Set(list.map((x) => x.h.id));
    markers.current.forEach((m, id) => { if (!want.has(id)) { m.setMap(null); markers.current.delete(id); } });
    for (const { h } of list) {
      const on = h.id === selectedId;
      const t = tag(h.price, h.verdict, on);
      const icon = { url: t.url, scaledSize: new google.maps.Size(t.w, t.h), anchor: new google.maps.Point(t.w / 2, t.h) };
      const old = markers.current.get(h.id);
      if (old) { old.setIcon(icon); old.setZIndex(on ? 999 : 1); continue; }
      const m = new google.maps.Marker({ position: { lat: h.lat, lng: h.lon }, map: p, icon, title: h.address.split(",")[0], zIndex: on ? 999 : 1 });
      m.addListener("click", () => latest.current.onSelect(h.id));
      markers.current.set(h.id, m);
    }
  }, [pos?.lat, pos?.lon, homes, selectedId]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => { markers.current.forEach((m) => m.setMap(null)); markers.current.clear(); }, []);

  // Driving: one panorama at a time along the link nearest the way you look, as long as you hold.
  const step = useCallback((dir: 1 | -1) => new Promise<boolean>((resolve) => {
    const p = pano.current;
    if (!p) return resolve(false);
    const look = (p.getPov().heading + (dir < 0 ? 180 : 0)) % 360;
    const links: any[] = p.getLinks() ?? [];
    const best = links.map((l) => ({ l, a: angle(l.heading, look) })).sort((a, b) => a.a - b.a)[0];
    if (!best || best.a > 80) return resolve(false); // the road ends or turns sharply: stop
    let done = false;
    const finish = () => { if (done) return; done = true; h.remove(); resolve(true); };
    const h = p.addListener("status_changed", finish);
    setTimeout(finish, 1400);
    p.setPano(best.l.pano);
    // Forward, the view follows the road; backwards it keeps looking ahead.
    if (dir > 0) p.setPov({ heading: best.l.heading, pitch: p.getPov().pitch });
  }), []);
  const driving = useRef<0 | 1 | -1>(0);
  useEffect(() => {
    driving.current = drive;
    if (!drive) return;
    setHint(false);
    let live = true;
    (async () => {
      while (live && driving.current === drive) {
        const t = Date.now();
        const moved = await step(drive);
        if (!moved) { setDrive(0); break; }
        const wait = 420 - (Date.now() - t);
        if (wait > 0) await new Promise((r) => setTimeout(r, wait));
      }
    })();
    return () => { live = false; };
  }, [drive, step]);

  // Turning, smoothly, while ← → (or A D, or the turn buttons) are held.
  const turn = useRef(0);
  const [turning, setTurning] = useState(0);
  useEffect(() => {
    turn.current = turning;
    if (!turning) return;
    let raf = 0, last = performance.now();
    const tick = (now: number) => {
      const p = pano.current;
      if (p && turn.current) { const pov = p.getPov(); p.setPov({ heading: (pov.heading + turn.current * 80 * ((now - last) / 1000) + 360) % 360, pitch: pov.pitch }); }
      last = now;
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [turning]);

  useEffect(() => {
    const keyOf = (e: KeyboardEvent) => ({ ArrowUp: "f", w: "f", W: "f", ArrowDown: "b", s: "b", S: "b", ArrowLeft: "l", a: "l", A: "l", ArrowRight: "r", d: "r", D: "r" } as Record<string, string>)[e.key];
    const down = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.closest?.("input,textarea,select")) return;
      if (e.key === "Escape") { onClose(pos); return; }
      const k = keyOf(e);
      if (!k) return;
      e.preventDefault(); e.stopPropagation();
      if (k === "f") setDrive(1); else if (k === "b") setDrive(-1); else setTurning(k === "l" ? -1 : 1);
    };
    const up = (e: KeyboardEvent) => {
      const k = keyOf(e);
      if (k === "f" || k === "b") setDrive(0);
      if (k === "l" || k === "r") setTurning(0);
    };
    // Capture, so Google's own arrow keys (one jump per press) never run.
    addEventListener("keydown", down, true);
    addEventListener("keyup", up, true);
    return () => { removeEventListener("keydown", down, true); removeEventListener("keyup", up, true); };
  }, [onClose, pos]);

  const hold = (set: () => void, clear: () => void) => ({
    onPointerDown: (e: React.PointerEvent) => { e.preventDefault(); (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId); set(); },
    onPointerUp: clear, onPointerCancel: clear, onLostPointerCapture: clear, onContextMenu: (e: React.MouseEvent) => e.preventDefault(),
  });

  const nearCount = pos ? homes.filter((h) => meters(pos, h) < RANGE_M).length : 0;

  return (
    <div className={`${isDesktop ? "absolute" : "fixed"} inset-0 z-[35] bg-slate-900`}>
      {/* Google's panorama in its own layer, so our controls always sit on top of it. */}
      <div className="absolute inset-0 z-0"><div ref={box} className="h-full w-full" /></div>

      {status !== "ready" && (
        <div className="absolute inset-0 z-10 flex items-center justify-center p-6">
          {status === "loading" ? (
            <p className="flex items-center gap-2.5 rounded-full bg-white px-5 py-3 text-[15px] font-medium shadow-lg"><Loader2 size={18} className="animate-spin text-blue-600" /> Finder gaden …</p>
          ) : (
            <div className="max-w-sm rounded-3xl bg-white p-6 text-center shadow-2xl">
              <p className="text-[18px] font-semibold">{status === "none" ? "Ingen gadebilleder her" : "Gadebilleder er ikke slået til endnu"}</p>
              <p className="mt-1.5 text-[15px] text-slate-600">{status === "none" ? "Prøv et sted tættere på en vej." : "Der mangler en Google-nøgle til gadebillederne."}</p>
              <button type="button" onClick={() => onClose(null)} className="mt-5 min-h-[46px] rounded-full bg-blue-600 px-6 text-[15px] font-semibold text-white">Tilbage til kortet</button>
            </div>
          )}
        </div>
      )}

      {/* Top: back to the map and where you are */}
      <div className={`pointer-events-none absolute inset-x-0 top-0 z-10 flex items-start gap-2 p-3 pt-[max(12px,env(safe-area-inset-top))] sm:p-4 ${isDesktop ? "pr-[240px]" : ""}`}>
        <button type="button" onClick={() => onClose(pos)} className="pointer-events-auto flex h-12 shrink-0 items-center gap-2 rounded-full bg-white pl-3.5 pr-4 text-[15px] font-semibold text-slate-900 shadow-[0_4px_16px_rgba(15,23,42,0.25)]">
          <ArrowLeft size={18} /> Kort
        </button>
        {status === "ready" && (
          <div className="pointer-events-auto min-w-0 rounded-2xl bg-slate-900/75 px-3.5 py-2 text-white backdrop-blur">
            <p className="truncate text-[14px] font-semibold">{place || "Gadebillede"}</p>
            <p className="text-[12px] text-white/70">{nearCount ? `${nearCount} ${nearCount === 1 ? "bolig" : "boliger"} til salg her` : "Ingen boliger til salg lige her"}</p>
          </div>
        )}
      </div>

      {status === "ready" && pos && <MiniMap pos={pos} homes={homes} isDesktop={isDesktop} onJump={(lat, lon) => { pano.current?.setPosition({ lat, lng: lon }); }} />}

      {/* Drive: hold to roll along the road */}
      {status === "ready" && (
        <div className={`absolute inset-x-0 z-10 flex flex-col items-center gap-2 px-3 ${isDesktop ? "bottom-6" : "bottom-[calc(16px+env(safe-area-inset-bottom))]"} ${!isDesktop && selectedId ? "hidden" : ""}`}>
          {hint && <p className="rounded-full bg-slate-900/75 px-4 py-1.5 text-[13px] font-medium text-white backdrop-blur">{isDesktop ? "Hold ↑ for at køre · ← → for at dreje · træk i billedet for at se dig om" : "Hold pilen for at køre · træk i billedet for at se dig om"}</p>}
          <div className="flex touch-none select-none items-center gap-2 rounded-full bg-white/95 p-1.5 shadow-[0_8px_30px_rgba(15,23,42,0.35)] backdrop-blur">
            <button type="button" aria-label="Drej til venstre" {...hold(() => setTurning(-1), () => setTurning(0))} className={`flex h-12 w-12 items-center justify-center rounded-full ${turning < 0 ? "bg-slate-200" : "hover:bg-slate-100"}`}><RotateCcw size={20} /></button>
            <button type="button" aria-label="Bak" {...hold(() => setDrive(-1), () => setDrive(0))} className={`flex h-12 w-12 items-center justify-center rounded-full ${drive < 0 ? "bg-slate-200" : "hover:bg-slate-100"}`}><ChevronDown size={24} /></button>
            <button type="button" aria-label="Kør fremad (hold)" {...hold(() => setDrive(1), () => setDrive(0))}
              className={`flex h-14 items-center gap-2 rounded-full px-6 text-[16px] font-semibold text-white transition-colors ${drive > 0 ? "bg-blue-700" : "bg-blue-600 hover:bg-blue-500"}`}>
              <ChevronUp size={24} strokeWidth={2.5} /> {drive > 0 ? "Kører" : "Kør"}
            </button>
            <button type="button" aria-label="Drej til højre" {...hold(() => setTurning(1), () => setTurning(0))} className={`flex h-12 w-12 items-center justify-center rounded-full ${turning > 0 ? "bg-slate-200" : "hover:bg-slate-100"}`}><RotateCw size={20} /></button>
          </div>
        </div>
      )}
    </div>
  );
}

/* The small map in the corner: you as a blue arrow, the homes around as dots. Tap it to jump there. */
function MiniMap({ pos, homes, isDesktop, onJump }: { pos: Pos; homes: BuyerHome[]; isDesktop: boolean; onJump: (lat: number, lon: number) => void }) {
  const box = useRef<HTMLDivElement>(null);
  const map = useRef<any>(null);
  const me = useRef<HTMLDivElement | null>(null);
  const meMarker = useRef<any>(null);
  const jump = useRef(onJump);
  jump.current = onJump;

  useEffect(() => {
    let dead = false;
    (async () => {
      const mod = await import("maplibre-gl");
      const ml = (mod as any).default ?? mod;
      if (dead || !box.current) return;
      const m = new ml.Map({ container: box.current, style: STYLE, center: [pos.lon, pos.lat], zoom: 16, interactive: true, attributionControl: false, dragRotate: false, pitchWithRotate: false });
      map.current = m;
      m.on("load", () => {
        m.addSource("near", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
        m.addLayer({ id: "near", type: "circle", source: "near", paint: { "circle-radius": 5, "circle-color": ["get", "c"], "circle-stroke-width": 1.5, "circle-stroke-color": "#fff" } });
        update();
      });
      m.on("click", (e: any) => jump.current(e.lngLat.lat, e.lngLat.lng));
      const el = document.createElement("div");
      el.innerHTML = `<svg width="30" height="30" viewBox="0 0 30 30"><path d="M15 2 L23 24 L15 19 L7 24 Z" fill="#2563eb" stroke="#fff" stroke-width="2" stroke-linejoin="round"/></svg>`;
      me.current = el;
      meMarker.current = new ml.Marker({ element: el, rotationAlignment: "map" }).setLngLat([pos.lon, pos.lat]).setRotation(pos.heading).addTo(m);
    })();
    return () => { dead = true; map.current?.remove(); map.current = null; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const update = () => {
    const m = map.current;
    if (!m?.getSource?.("near")) return;
    const features = homes.filter((h) => Math.abs(h.lat - pos.lat) < 0.012 && Math.abs(h.lon - pos.lon) < 0.02)
      .map((h) => ({ type: "Feature", properties: { c: VERDICT_COLOR[h.verdict] }, geometry: { type: "Point", coordinates: [h.lon, h.lat] } }));
    m.getSource("near").setData({ type: "FeatureCollection", features });
  };
  useEffect(() => {
    meMarker.current?.setLngLat([pos.lon, pos.lat]).setRotation(pos.heading);
    map.current?.easeTo({ center: [pos.lon, pos.lat], duration: 400 });
    update();
  }, [pos.lat, pos.lon, pos.heading, homes]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className={`absolute z-10 overflow-hidden rounded-2xl shadow-[0_6px_24px_rgba(15,23,42,0.4)] ring-2 ring-white ${isDesktop ? "right-4 top-4 h-[150px] w-[210px]" : "right-3 top-[calc(76px+env(safe-area-inset-top))] h-[112px] w-[112px]"}`}>
      <div ref={box} className="h-full w-full" />
    </div>
  );
}
