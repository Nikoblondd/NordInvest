"use client";

import { useEffect, useRef, useState } from "react";
import "leaflet/dist/leaflet.css";
import { MapPin } from "lucide-react";

/*
 * Real, interactive map (Leaflet + OpenStreetMap, like the Deal-motor) that
 * highlights the postnummer area a game home lies in — the town, never the
 * address. Loads Leaflet only when a map is actually shown.
 */

type Area = { name: string; geometry: GeoJSON.Geometry };
const cache = new Map<string, Promise<Area | null>>();

function loadArea(zip: string) {
  if (!cache.has(zip)) {
    cache.set(
      zip,
      fetch(`/api/game/area?zip=${zip}`)
        .then((r) => r.json())
        .then((j) => (j?.ok ? { name: j.name as string, geometry: j.geometry as GeoJSON.Geometry } : null))
        .catch(() => null),
    );
  }
  return cache.get(zip)!;
}

export function CityMap({ zip, city, height = 220 }: { zip: string; city: string; height?: number }) {
  const el = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<"loading" | "ready" | "failed">("loading");

  useEffect(() => {
    let map: import("leaflet").Map | null = null;
    let alive = true;
    setState("loading");
    (async () => {
      const [L, area] = await Promise.all([import("leaflet").then((m) => m.default), loadArea(zip)]);
      if (!alive || !el.current) return;
      if (!area) return setState("failed");
      map = L.map(el.current, {
        zoomControl: true,
        attributionControl: true,
        scrollWheelZoom: false, // don't hijack the page scroll
        dragging: !L.Browser.mobile, // one finger scrolls the page on phones; pinch still zooms
        minZoom: 5,
        maxZoom: 16,
      });
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(map);
      const layer = L.geoJSON(area.geometry as GeoJSON.GeoJsonObject, {
        style: { color: "#2563eb", weight: 2.5, fillColor: "#3b82f6", fillOpacity: 0.18 },
      }).addTo(map);
      layer
        .bindTooltip(`${zip} ${area.name || city}`, { permanent: true, direction: "center", className: "city-map-label" })
        .openTooltip();
      map.fitBounds(layer.getBounds(), { padding: [28, 28], maxZoom: 14 });
      setState("ready");
    })();
    return () => {
      alive = false;
      map?.remove();
    };
  }, [zip, city]);

  return (
    <div className="city-map overflow-hidden rounded-2xl ring-1 ring-slate-200">
      <div className="relative" style={{ height }}>
        <div ref={el} className="absolute inset-0 z-0" aria-label={`Kort over ${zip} ${city}`} role="region" />
        {state !== "ready" && (
          <div className="absolute inset-0 z-[1] grid place-items-center bg-slate-100 text-sm text-slate-500">
            {state === "loading" ? (
              <span className="animate-pulse">Henter kort …</span>
            ) : (
              <span className="flex items-center gap-1.5">
                <MapPin className="h-4 w-4" /> {zip} {city}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
