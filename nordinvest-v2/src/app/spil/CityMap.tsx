"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ZoomIn, ZoomOut } from "lucide-react";

/*
 * A drawn map of Denmark (our own SVG, built from the official region
 * boundaries, with Bornholm in an inset like printed maps) that lights up the
 * postnummer area a game home lies in — the town, never the address. The
 * area is clipped to the coastline, since postnummer polygons reach out into
 * the sea. The map zooms in on the area; tap to toggle to all of Denmark.
 */

type MapData = {
  viewBox: [number, number, number, number];
  proj: { lon0: number; lat0: number; k: number; s: number; ox: number; oy: number; bornholm: { minLon: number; dx: number; dy: number } };
  bornholmBox: [number, number, number, number];
  land: string;
};
type Geo = { type: "Polygon"; coordinates: number[][][] } | { type: "MultiPolygon"; coordinates: number[][][][] };

let mapPromise: Promise<MapData | null> | null = null;
const loadMap = () =>
  (mapPromise ??= fetch("/spil/dk-map.json")
    .then((r) => r.json() as Promise<MapData>)
    .catch(() => null));

const areaCache = new Map<string, Promise<{ name: string; geometry: Geo } | null>>();
const loadArea = (zip: string) => {
  if (!areaCache.has(zip)) {
    areaCache.set(
      zip,
      fetch(`/api/game/area?zip=${zip}`)
        .then((r) => r.json())
        .then((j) => (j?.ok ? { name: j.name as string, geometry: j.geometry as Geo } : null))
        .catch(() => null),
    );
  }
  return areaCache.get(zip)!;
};

const ASPECT = 4 / 3;
type Box = [number, number, number, number];

/** Grow a box to the map's aspect ratio (and at least `minW` wide), keeping its centre. */
function fit(x: number, y: number, w: number, h: number, minW: number): Box {
  let W = Math.max(w, minW, h * ASPECT);
  let H = W / ASPECT;
  if (H < h) {
    H = h;
    W = H * ASPECT;
  }
  return [x + w / 2 - W / 2, y + h / 2 - H / 2, W, H];
}

export function CityMap({ zip, city }: { zip: string; city: string }) {
  const [data, setData] = useState<MapData | null>(null);
  const [area, setArea] = useState<{ name: string; geometry: Geo } | null>(null);
  const [failed, setFailed] = useState(false);
  const [zoomed, setZoomed] = useState(true);
  const [vb, setVb] = useState<Box | null>(null);
  const vbRef = useRef<Box | null>(null);
  vbRef.current = vb;

  useEffect(() => {
    let alive = true;
    setArea(null);
    setFailed(false);
    Promise.all([loadMap(), loadArea(zip)]).then(([m, a]) => {
      if (!alive) return;
      if (!m || !a) return setFailed(true);
      setData(m);
      setArea(a);
    });
    return () => {
      alive = false;
    };
  }, [zip]);

  // Project the area into map units (same projection the silhouette was built with).
  const shape = useMemo(() => {
    if (!data || !area) return null;
    const p = data.proj;
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    const polys = area.geometry.type === "Polygon" ? [area.geometry.coordinates] : area.geometry.coordinates;
    const d = polys
      .flatMap((rings) =>
        rings.map(
          (ring) =>
            "M" +
            ring
              .map(([lon, lat]) => {
                let x = (lon - p.lon0) * p.k * p.s + p.ox;
                let y = (p.lat0 - lat) * p.s + p.oy;
                if (lon > p.bornholm.minLon) {
                  x += p.bornholm.dx;
                  y += p.bornholm.dy;
                }
                minX = Math.min(minX, x);
                maxX = Math.max(maxX, x);
                minY = Math.min(minY, y);
                maxY = Math.max(maxY, y);
                return `${x.toFixed(1)},${y.toFixed(1)}`;
              })
              .join("L") +
            "Z",
        ),
      )
      .join("");
    return { d, box: [minX, minY, maxX - minX, maxY - minY] as Box };
  }, [data, area]);

  const whole = useMemo<Box | null>(() => (data ? fit(...data.viewBox, 0) : null), [data]);
  const close = useMemo<Box | null>(() => (shape ? fit(...shape.box, 400) : null), [shape]);

  const raf = useRef(0);
  const animate = (from: Box, to: Box, delay = 0) => {
    cancelAnimationFrame(raf.current);
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return setVb(to);
    const t0 = performance.now();
    const dur = 900;
    const step = (t: number) => {
      const k = Math.min(1, Math.max(0, (t - t0 - delay) / dur));
      const e = k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
      setVb(from.map((v, i) => v + (to[i] - v) * e) as Box);
      if (k < 1) raf.current = requestAnimationFrame(step);
    };
    raf.current = requestAnimationFrame(step);
  };
  useEffect(() => () => cancelAnimationFrame(raf.current), []);

  // New town: start on all of Denmark, then glide in.
  useEffect(() => {
    if (!whole || !close) return;
    setVb(whole);
    setZoomed(true);
    animate(whole, close, 450);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [whole, close]);

  const toggle = () => {
    if (!whole || !close || !vbRef.current) return;
    const next = !zoomed;
    setZoomed(next);
    animate(vbRef.current, next ? close : whole);
  };

  const label = `${zip} ${area?.name || city}`;
  // Screen position (in %) of the area's centre — the pin and label are HTML so they stay crisp at any zoom.
  const pin =
    vb && shape
      ? {
          x: ((shape.box[0] + shape.box[2] / 2 - vb[0]) / vb[2]) * 100,
          y: ((shape.box[1] + shape.box[3] / 2 - vb[1]) / vb[3]) * 100,
          // label sits just under the area so it never covers it (or above, near the bottom edge)
          below: ((shape.box[1] + shape.box[3] - vb[1]) / vb[3]) * 100,
          above: ((shape.box[1] - vb[1]) / vb[3]) * 100,
          tiny: shape.box[2] / vb[2] < 0.035,
        }
      : null;

  return (
    <div
      className="dk-map relative w-full overflow-hidden rounded-2xl bg-gradient-to-b from-slate-50 to-blue-50/60 ring-1 ring-slate-200"
      style={{ aspectRatio: "4 / 3" }}
    >
      {vb && data && shape ? (
        <>
          <svg
            viewBox={vb.join(" ")}
            preserveAspectRatio="xMidYMid meet"
            className="absolute inset-0 h-full w-full cursor-pointer"
            role="img"
            aria-label={
              document.documentElement.dataset.lang === "en" ? `Map of Denmark. ${label} is marked.` : `Danmarkskort. ${label} er markeret.`
            }
            data-no-i18n
            onClick={toggle}
          >
            <defs>
              <linearGradient id="dk-land" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0" stopColor="#8fa3bd" />
                <stop offset="0.55" stopColor="#a3b6ca" />
                <stop offset="1" stopColor="#97bcc4" />
              </linearGradient>
              <radialGradient id="dk-wash" cx="0.3" cy="0.35" r="0.8">
                <stop offset="0" stopColor="#ffffff" stopOpacity="0.28" />
                <stop offset="1" stopColor="#ffffff" stopOpacity="0" />
              </radialGradient>
              <clipPath id="dk-clip">
                <path d={data.land} clipRule="evenodd" />
              </clipPath>
            </defs>
            <path d={data.land} fill="url(#dk-land)" fillRule="evenodd" />
            <path d={data.land} fill="url(#dk-wash)" fillRule="evenodd" />
            <rect
              x={data.bornholmBox[0]}
              y={data.bornholmBox[1]}
              width={data.bornholmBox[2]}
              height={data.bornholmBox[3]}
              fill="none"
              stroke="#94a3b8"
              strokeWidth="1"
              vectorEffect="non-scaling-stroke"
            />
            <g clipPath="url(#dk-clip)">
              <path d={shape.d} fill="#1d4ed8" fillOpacity="0.88" fillRule="evenodd" />
              <path d={shape.d} fill="none" stroke="#ffffff" strokeWidth="1.2" vectorEffect="non-scaling-stroke" />
            </g>
          </svg>
          {pin && (
            <>
              <span
                className="dk-pulse pointer-events-none absolute -ml-4 -mt-4 h-8 w-8 rounded-full ring-2 ring-blue-500/70"
                style={{ left: `${pin.x}%`, top: `${pin.y}%` }}
              />
              {pin.tiny && (
                <span
                  className="pointer-events-none absolute -ml-[7px] -mt-[7px] h-3.5 w-3.5 rounded-full bg-blue-700 ring-2 ring-white"
                  style={{ left: `${pin.x}%`, top: `${pin.y}%` }}
                />
              )}
              <span
                className={`pointer-events-none absolute -translate-x-1/2 whitespace-nowrap rounded-full bg-[#0b1b33] px-2.5 py-1 text-xs font-bold text-white shadow-card ${
                  pin.below > 80 ? "-translate-y-full" : ""
                }`}
                style={{
                  left: `${Math.min(80, Math.max(20, pin.x))}%`,
                  top: pin.below > 80 ? `calc(${pin.above}% - 10px)` : `calc(${pin.below}% + 10px)`,
                }}
                translate="no"
                data-no-i18n
              >
                {label}
              </span>
            </>
          )}
          <button
            type="button"
            onClick={toggle}
            className="absolute bottom-2 right-2 inline-flex items-center gap-1.5 rounded-full bg-white/95 px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-card ring-1 ring-slate-200 hover:text-slate-900"
          >
            {zoomed ? <ZoomOut className="h-3.5 w-3.5" /> : <ZoomIn className="h-3.5 w-3.5" />}
            {zoomed ? "Hele Danmark" : "Zoom ind"}
          </button>
        </>
      ) : (
        <div className="absolute inset-0 grid place-items-center text-sm text-slate-500">
          {failed ? label : <span className="animate-pulse">Henter kort …</span>}
        </div>
      )}
    </div>
  );
}
