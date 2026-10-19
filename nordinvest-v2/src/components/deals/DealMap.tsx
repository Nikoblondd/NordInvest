"use client";

import { useEffect, useRef } from "react";
import "leaflet/dist/leaflet.css";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";

export type MapPoint = {
  id: string;
  lat: number;
  lon: number;
  price: number;
  cashFlow: number;
  score: number;
  capRate: number;
  image: string | null;
  title: string;
  city: string;
  href: string;
};

const dk = (n: number) => (Number.isFinite(n) ? Math.round(n).toLocaleString("da-DK") : "–");
const scoreColor = (s: number) => (s >= 78 ? "#059669" : s >= 62 ? "#2563eb" : s >= 45 ? "#f59e0b" : "#e11d48");

function popupHtml(p: MapPoint): string {
  const cfColor = p.cashFlow >= 0 ? "#059669" : "#e11d48";
  const img = p.image
    ? `<img src="${p.image}" alt="" onerror="this.style.display='none'" style="width:100%;height:120px;object-fit:cover;border-radius:10px;display:block;margin-bottom:8px" />`
    : "";
  return `
    <div style="width:230px;font-family:inherit">
      ${img}
      <div style="font-weight:700;font-size:14px;color:#0f172a;line-height:1.25">${p.title || "Ejendom"}</div>
      <div style="color:#64748b;font-size:12px;margin-top:1px">${p.city || ""}</div>
      <div style="font-weight:700;font-size:15px;color:#0f172a;margin-top:6px">${dk(p.price)} kr</div>
      <div style="display:flex;gap:14px;margin-top:6px;font-size:12.5px;color:#475569">
        <span>Cashflow<br><b style="color:${cfColor};font-size:14px">${dk(p.cashFlow)} kr</b></span>
        <span>Afkast<br><b style="color:#0f172a;font-size:14px">${p.capRate.toLocaleString("da-DK", { maximumFractionDigits: 1 })} %</b></span>
        <span>Score<br><b style="color:${scoreColor(p.score)};font-size:14px">${p.score}</b></span>
      </div>
      <a href="${p.href}" style="display:block;margin-top:10px;text-align:center;background:#0f172a;color:#fff;font-weight:600;font-size:13px;padding:9px;border-radius:9999px;text-decoration:none">Fuld analyse →</a>
    </div>`;
}

export default function DealMap({ points }: { points: MapPoint[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapRef = useRef<any>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const L = (await import("leaflet")).default;
      await import("leaflet.markercluster");
      if (cancelled || !containerRef.current) return;

      // (Re)create the map cleanly — guards against React StrictMode double-mount.
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
      const map = L.map(containerRef.current, { scrollWheelZoom: true }).setView([56.0, 11.4], 7);
      mapRef.current = map;

      // Modern dark map: standard OpenStreetMap tiles (reliable everywhere)
      // rendered dark via a CSS filter on the tiles (see `.ni-dark-tiles` in
      // globals.css). No external dark provider, so it never fails to load.
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(map);

      // Branded cluster badges (navy circles with the count) — clearly distinct
      // from a single listing, so a lone property never looks like a "count".
      const cluster = (L as unknown as { markerClusterGroup: (o: unknown) => unknown }).markerClusterGroup({
        maxClusterRadius: 55,
        showCoverageOnHover: false,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        iconCreateFunction: (cl: any) => {
          const count = cl.getChildCount();
          const size = count < 10 ? 36 : count < 100 ? 44 : 52;
          return L.divIcon({
            className: "",
            html: `<div style="width:${size}px;height:${size}px;border-radius:9999px;background:rgba(15,31,61,.92);color:#fff;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:13px;border:2px solid rgba(255,255,255,.85);box-shadow:0 2px 10px rgba(0,0,0,.55)">${count}</div>`,
            iconSize: [size, size],
          });
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      }) as any;
      const latlngs: [number, number][] = [];

      for (const p of points) {
        if (!Number.isFinite(p.lat) || !Number.isFinite(p.lon)) continue;
        const c = scoreColor(p.score);
        // A single listing is a proper teardrop PIN (colored by its score) — never
        // a bare number, so it can't be mistaken for a cluster count.
        // A small teardrop pin. iconSize has 2px of headroom around the 22×30
        // SVG so the white stroke is never clipped.
        const icon = L.divIcon({
          className: "",
          html: `<svg width="22" height="30" viewBox="0 0 22 30" xmlns="http://www.w3.org/2000/svg"><path d="M11 1C5.5 1 1 5.5 1 11c0 7.2 10 18 10 18s10-10.8 10-18C21 5.5 16.5 1 11 1z" fill="${c}" stroke="#fff" stroke-width="1.8"/><circle cx="11" cy="11" r="3.6" fill="#fff"/></svg>`,
          iconSize: [24, 32],
          iconAnchor: [12, 30],
          popupAnchor: [0, -28],
        });
        const marker = L.marker([p.lat, p.lon], { icon });
        marker.bindPopup(popupHtml(p), { minWidth: 230, closeButton: true });
        cluster.addLayer(marker);
        latlngs.push([p.lat, p.lon]);
      }
      map.addLayer(cluster);

      if (latlngs.length === 1) map.setView(latlngs[0], 14);
      else if (latlngs.length > 1) map.fitBounds(latlngs, { padding: [40, 40], maxZoom: 15 });

      // The container may have been hidden (tab switch) or the pane not yet
      // painted when the map was created, so Leaflet can miscompute its size and
      // skip tiles/markers. Recalculate a few times, and again whenever the tab
      // becomes visible, so it always fills in.
      const refit = () => {
        if (!mapRef.current) return;
        mapRef.current.invalidateSize();
        if (latlngs.length === 1) mapRef.current.setView(latlngs[0], 14);
        else if (latlngs.length > 1) mapRef.current.fitBounds(latlngs, { padding: [40, 40], maxZoom: 15 });
      };
      [120, 350, 800].forEach((ms) => setTimeout(refit, ms));
      const onVis = () => { if (document.visibilityState === "visible") refit(); };
      document.addEventListener("visibilitychange", onVis);
      // A ResizeObserver is the robust fix for a map created in a not-yet-sized
      // container (hidden tab/pane): it refits the instant the container gets a
      // real width/height.
      let lastW = 0;
      const ro = new ResizeObserver((entries) => {
        const w = entries[0]?.contentRect.width ?? 0;
        if (w > 0 && w !== lastW) { lastW = w; refit(); }
      });
      if (containerRef.current) ro.observe(containerRef.current);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (mapRef.current as any).__cleanup = () => { document.removeEventListener("visibilitychange", onVis); ro.disconnect(); };
    })();

    return () => {
      cancelled = true;
      if (mapRef.current) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const cleanup = (mapRef.current as any).__cleanup;
        if (cleanup) cleanup();
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [points]);

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 shadow-sm">
      <div ref={containerRef} className="ni-dark-map h-[600px] w-full" style={{ background: "#0b1b2e" }} />
    </div>
  );
}
