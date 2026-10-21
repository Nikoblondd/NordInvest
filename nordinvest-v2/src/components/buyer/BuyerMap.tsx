"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import "maplibre-gl/dist/maplibre-gl.css";
import type { BuyerHome } from "@/lib/buyer/market";
import type { Plan } from "@/lib/buyer/plans";

/*
 * The home buyer's map: a clean street map (OpenFreeMap, OpenStreetMap data)
 * with one dot per home for sale, coloured by the price verdict. Drawn on the
 * GPU, so all 26.000 homes pan and zoom smoothly, on phones too. Hover shows
 * a small label, a click or tap selects the home.
 */

export const VERDICT_COLOR = { godt: "#16a34a", middel: "#f59e0b", dyrt: "#dc2626" } as const;
const STYLE = "https://tiles.openfreemap.org/styles/liberty";
const kr = (n: number) => `${Math.round(n).toLocaleString("da-DK")} kr`;
const VERDICT_LABEL = { godt: "Godt køb", middel: "Middel", dyrt: "Dyr" } as const;

export type MapHandle = {
  flyTo: (lat: number, lon: number, zoom?: number) => void;
  fitTo: (points: { lat: number; lon: number }[]) => void;
  bounds: () => [number, number, number, number] | null;
};

type Props = {
  homes: BuyerHome[];
  savedIds: Set<string>;
  selectedId: string | null;
  initialView: { lat: number; lon: number; zoom: number } | null;
  showPlans: boolean;
  onSelect: (id: string | null) => void;
  onMove: (view: { lat: number; lon: number; zoom: number; bounds: [number, number, number, number] }) => void;
  onPlansState?: (s: "off" | "zoom" | "loading" | "ready") => void;
};

/* eslint-disable @typescript-eslint/no-explicit-any */
export const BuyerMap = forwardRef<MapHandle, Props>(function BuyerMap({ homes, savedIds, selectedId, initialView, showPlans, onSelect, onMove, onPlansState }, ref) {
  const box = useRef<HTMLDivElement>(null);
  const map = useRef<any>(null);
  const lib = useRef<any>(null);
  const ready = useRef(false);
  const latest = useRef({ homes, savedIds, selectedId, showPlans, onSelect, onMove, onPlansState });
  latest.current = { homes, savedIds, selectedId, showPlans, onSelect, onMove, onPlansState };

  useImperativeHandle(ref, () => ({
    flyTo: (lat, lon, zoom = 14) => map.current?.flyTo({ center: [lon, lat], zoom, speed: 1.6, essential: true }),
    fitTo: (pts) => {
      if (!map.current || !pts.length || !lib.current) return;
      const b = new lib.current.LngLatBounds();
      pts.forEach((p) => b.extend([p.lon, p.lat]));
      map.current.fitBounds(b, { padding: 60, maxZoom: 15, duration: 900 });
    },
    bounds: () => {
      const b = map.current?.getBounds();
      return b ? [b.getWest(), b.getSouth(), b.getEast(), b.getNorth()] : null;
    },
  }));

  // Create the map once.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const mod = await import("maplibre-gl");
      const ml = (mod as any).default ?? mod;
      if (cancelled || !box.current) return;
      lib.current = ml;
      const v = initialView ?? { lat: 55.68, lon: 12.53, zoom: 11.2 };
      const m = new ml.Map({
        container: box.current, style: STYLE, center: [v.lon, v.lat], zoom: v.zoom,
        minZoom: 5.5, maxZoom: 18.5, attributionControl: { compact: true }, dragRotate: false, pitchWithRotate: false,
        maxBounds: [[3, 53.5], [17.5, 58.2]],
      });
      m.touchZoomRotate.disableRotation();
      map.current = m;

      m.on("load", () => {
        // A calm base map: no shop and restaurant icons competing with the homes.
        for (const l of m.getStyle().layers ?? []) {
          if (/^poi/.test(l.id) || l.id.includes("poi_")) m.setLayoutProperty(l.id, "visibility", "none");
        }
        m.addSource("plans", { type: "geojson", data: empty() });
        m.addLayer({ id: "plans-fill", type: "fill", source: "plans", paint: { "fill-color": ["match", ["get", "status"], "forslag", "#7c3aed", "#6366f1"], "fill-opacity": 0.13 } });
        m.addLayer({ id: "plans-line", type: "line", source: "plans", paint: { "line-color": ["match", ["get", "status"], "forslag", "#7c3aed", "#6366f1"], "line-width": 1.6, "line-dasharray": [2, 1.5] } });

        m.addSource("homes", { type: "geojson", data: empty(), promoteId: "id" });
        m.addLayer({
          id: "homes", type: "circle", source: "homes",
          paint: {
            "circle-color": ["match", ["get", "v"], "godt", VERDICT_COLOR.godt, "middel", VERDICT_COLOR.middel, VERDICT_COLOR.dyrt],
            "circle-radius": ["interpolate", ["linear"], ["zoom"], 6, 2.6, 9, 3.6, 12, 5.8, 15, 8, 18, 10],
            "circle-stroke-color": ["case", ["==", ["get", "s"], 1], "#1d4ed8", "#ffffff"],
            "circle-stroke-width": ["interpolate", ["linear"], ["zoom"], 6, ["case", ["==", ["get", "s"], 1], 2, 0.6], 11, ["case", ["==", ["get", "s"], 1], 2.4, 1.4], 15, ["case", ["==", ["get", "s"], 1], 2.8, 2]],
            "circle-opacity": ["case", ["boolean", ["feature-state", "hover"], false], 1, 0.94],
          },
        });
        m.addLayer({
          id: "homes-hover", type: "circle", source: "homes",
          filter: ["==", ["get", "id"], ""],
          paint: { "circle-radius": ["interpolate", ["linear"], ["zoom"], 6, 6, 12, 10, 16, 13], "circle-color": "rgba(0,0,0,0)", "circle-stroke-color": "#0f172a", "circle-stroke-width": 2 },
        });
        m.addSource("sel", { type: "geojson", data: empty() });
        m.addLayer({ id: "sel-halo", type: "circle", source: "sel", paint: { "circle-radius": ["interpolate", ["linear"], ["zoom"], 6, 11, 12, 16, 16, 20], "circle-color": "#2563eb", "circle-opacity": 0.18 } });
        m.addLayer({ id: "sel-dot", type: "circle", source: "sel", paint: { "circle-radius": ["interpolate", ["linear"], ["zoom"], 6, 6, 12, 9, 16, 12], "circle-color": ["get", "c"], "circle-stroke-color": "#0f172a", "circle-stroke-width": 2.5 } });

        ready.current = true;
        draw();
        drawSelected();
        report();
        loadPlans();
      });

      // Hover label.
      const tip = new ml.Popup({ closeButton: false, closeOnClick: false, offset: 12, className: "ni-tip", maxWidth: "260px" });
      let hovered: string | null = null;
      m.on("mousemove", "homes", (e: any) => {
        const f = e.features?.[0];
        if (!f) return;
        m.getCanvas().style.cursor = "pointer";
        const id = String(f.properties.id);
        if (id === hovered) return;
        hovered = id;
        m.setFilter("homes-hover", ["==", ["get", "id"], id]);
        const h = latest.current.homes.find((x) => x.id === id);
        if (!h) return;
        tip.setLngLat([h.lon, h.lat]).setHTML(tipHtml(h)).addTo(m);
      });
      m.on("mouseleave", "homes", () => {
        m.getCanvas().style.cursor = "";
        hovered = null;
        m.setFilter("homes-hover", ["==", ["get", "id"], ""]);
        tip.remove();
      });
      m.on("click", (e: any) => {
        // Generous hit box for fingers.
        const pad = 8;
        const hits = m.queryRenderedFeatures([[e.point.x - pad, e.point.y - pad], [e.point.x + pad, e.point.y + pad]], { layers: ["homes"] });
        if (hits.length) {
          const best = hits.sort((a: any, b: any) => dist(a, e) - dist(b, e))[0];
          tip.remove();
          latest.current.onSelect(String(best.properties.id));
          return;
        }
        const plan = m.queryRenderedFeatures(e.point, { layers: ["plans-fill"] })[0];
        if (plan) {
          new ml.Popup({ offset: 6, maxWidth: "300px", className: "ni-plan" }).setLngLat(e.lngLat).setHTML(planHtml(plan.properties)).addTo(m);
          return;
        }
        latest.current.onSelect(null);
      });
      const dist = (f: any, e: any) => { const p = m.project(f.geometry.coordinates); return (p.x - e.point.x) ** 2 + (p.y - e.point.y) ** 2; };

      let t: ReturnType<typeof setTimeout> | null = null;
      m.on("moveend", () => {
        report();
        if (t) clearTimeout(t);
        t = setTimeout(loadPlans, 350);
      });
    })();
    return () => { cancelled = true; map.current?.remove(); map.current = null; ready.current = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const report = () => {
    const m = map.current;
    if (!m) return;
    const c = m.getCenter(), b = m.getBounds();
    latest.current.onMove({ lat: c.lat, lon: c.lng, zoom: m.getZoom(), bounds: [b.getWest(), b.getSouth(), b.getEast(), b.getNorth()] });
  };

  const draw = () => {
    const m = map.current;
    if (!m || !ready.current) return;
    const { homes: hs, savedIds: sv } = latest.current;
    m.getSource("homes")?.setData({
      type: "FeatureCollection",
      // Best buys drawn last, so they sit on top where dots overlap.
      features: [...hs].sort((a, b) => a.score - b.score).map((h) => ({ type: "Feature", geometry: { type: "Point", coordinates: [h.lon, h.lat] }, properties: { id: h.id, v: h.verdict, s: sv.has(h.id) ? 1 : 0 } })),
    });
  };
  const drawSelected = () => {
    const m = map.current;
    if (!m || !ready.current) return;
    const h = latest.current.selectedId ? latest.current.homes.find((x) => x.id === latest.current.selectedId) : null;
    m.getSource("sel")?.setData(h ? { type: "FeatureCollection", features: [{ type: "Feature", geometry: { type: "Point", coordinates: [h.lon, h.lat] }, properties: { c: VERDICT_COLOR[h.verdict] } }] } : empty());
  };

  const plansKey = useRef("");
  const loadPlans = async () => {
    const m = map.current;
    if (!m || !ready.current) return;
    const cb = latest.current.onPlansState;
    if (!latest.current.showPlans) { m.getSource("plans")?.setData(empty()); plansKey.current = ""; cb?.("off"); return; }
    if (m.getZoom() < 12.3) { m.getSource("plans")?.setData(empty()); plansKey.current = ""; cb?.("zoom"); return; }
    const b = m.getBounds();
    // Round the box so small pans reuse the same answer.
    const r = (x: number) => Math.round(x * 50) / 50;
    const key = [r(b.getWest()) - 0.02, r(b.getSouth()) - 0.02, r(b.getEast()) + 0.02, r(b.getNorth()) + 0.02].map((x) => x.toFixed(3)).join(",");
    if (key === plansKey.current) return;
    plansKey.current = key;
    cb?.("loading");
    const res = await fetch(`/api/boligkoeb/plans?bbox=${key}`).then((x) => x.json()).catch(() => null);
    if (plansKey.current !== key) return;
    const plans: (Plan & { kind: string })[] = res?.plans ?? [];
    m.getSource("plans")?.setData({
      type: "FeatureCollection",
      features: plans.filter((p) => p.rings?.length).map((p) => ({
        type: "Feature",
        geometry: { type: "MultiPolygon", coordinates: p.rings!.map((ring) => [ring]) },
        properties: { name: p.name, status: p.status, kind: p.kind, date: p.adopted ?? p.proposed ?? "", link: p.link ?? "", kommune: p.kommune ?? "" },
      })),
    });
    cb?.("ready");
  };

  useEffect(draw, [homes, savedIds]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(drawSelected, [selectedId, homes]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { plansKey.current = ""; void loadPlans(); }, [showPlans]); // eslint-disable-line react-hooks/exhaustive-deps

  // MapLibre sets position: relative on its container, so the container fills an absolutely placed wrapper.
  return <div className="absolute inset-0"><div ref={box} className="h-full w-full bg-[#eef0ec]" aria-label="Kort over boliger til salg" role="region" /></div>;
});

const empty = () => ({ type: "FeatureCollection", features: [] }) as any;

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

function tipHtml(h: BuyerHome) {
  const d = h.deltaPct;
  return `<div style="font:500 13px/1.35 var(--font-geist),system-ui,sans-serif;color:#0f172a">
    <div style="font-weight:700;font-size:14px">${kr(h.price)}</div>
    <div style="color:#475569">${h.area} m²${h.rooms ? ` · ${h.rooms} vær.` : ""} · ${kr(h.ppm)}/m²</div>
    <div style="margin-top:4px;display:flex;align-items:center;gap:6px"><span style="width:8px;height:8px;border-radius:99px;background:${VERDICT_COLOR[h.verdict]}"></span><b>${VERDICT_LABEL[h.verdict]}</b><span style="color:#64748b">${d > 0 ? "+" : ""}${String(d).replace(".", ",")} % mod området</span></div>
    ${h.cutPct > 0 ? `<div style="color:#15803d;margin-top:2px">Sat ned ${String(h.cutPct).replace(".", ",")} %</div>` : ""}
  </div>`;
}

function planHtml(p: Record<string, string>) {
  const date = p.date ? new Date(p.date).toLocaleDateString("da-DK", { month: "long", year: "numeric" }) : "";
  return `<div style="font:500 13px/1.4 var(--font-geist),system-ui,sans-serif;color:#0f172a">
    <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:#6d28d9">${p.status === "forslag" ? "Forslag i høring" : "Vedtaget lokalplan"}${date ? ` · ${esc(date)}` : ""}</div>
    <div style="font-weight:700;font-size:14px;margin-top:3px">${esc(p.name)}</div>
    <div style="color:#475569;margin-top:2px">${esc(p.kind)}${p.kommune ? `, ${esc(p.kommune)}` : ""}</div>
    ${p.link ? `<a href="${esc(p.link)}" target="_blank" rel="noopener" style="display:inline-block;margin-top:6px;color:#1d4ed8;font-weight:600">Læs lokalplanen (PDF)</a>` : ""}
  </div>`;
}
