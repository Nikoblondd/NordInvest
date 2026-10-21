import { fromUtm, toUtm } from "./utm";

/*
 * Server only. What is being planned and built around a home: local plans
 * (lokalplaner) from Plandata.dk, the national register every kommune must
 * report to. A new local plan is how a kommune opens for new housing, shops,
 * schools or business, so recent ones are the best open signal of growth.
 * Proposals (forslag) are still in hearing; adopted ones (vedtaget) are law.
 */

const WFS = "https://geoserver.plandata.dk/geoserver/ows";
const FIELDS = "plannavn,plannr,datoforsl,datovedt,anvendelsegenerel,doklink,kommunenavn,distrikt,geometri";

export type Plan = {
  id: string;
  name: string;
  status: "forslag" | "vedtaget";
  /** ISO date of the proposal / adoption. */
  proposed: string | null;
  adopted: string | null;
  use: string | null;
  kommune: string | null;
  district: string | null;
  link: string | null;
  lat: number;
  lon: number;
  /** Outline for the map, [lon, lat] rings. Only in bbox queries. */
  rings?: [number, number][][];
  distanceM?: number;
};

type Feature = { id: string; properties: Record<string, string | number | null>; geometry: { type: string; coordinates: number[][][][] | number[][][] } | null };

const iso = (v: string | number | null | undefined) => {
  const s = v == null ? "" : String(v);
  return /^\d{8}$/.test(s) ? `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}` : null;
};
const ymd = (d: Date) => d.toISOString().slice(0, 10).replace(/-/g, "");

async function query(layer: "forslag" | "vedtaget", filter: string, count: number): Promise<Feature[]> {
  const url = `${WFS}?service=WFS&version=2.0.0&request=GetFeature&typeNames=pdk:theme_pdk_lokalplan_${layer}&outputFormat=application/json&count=${count}&propertyName=${FIELDS}&CQL_FILTER=${encodeURIComponent(filter)}`;
  try {
    const r = await fetch(url, { next: { revalidate: 6 * 3600 }, signal: AbortSignal.timeout(9000) });
    if (!r.ok) return [];
    const j = (await r.json()) as { features?: Feature[] };
    return Array.isArray(j.features) ? j.features : [];
  } catch {
    return [];
  }
}

function outer(g: Feature["geometry"]): number[][][] {
  if (!g) return [];
  if (g.type === "MultiPolygon") return (g.coordinates as number[][][][]).map((p) => p[0]);
  if (g.type === "Polygon") return [(g.coordinates as number[][][])[0]];
  return [];
}

function toPlan(f: Feature, status: Plan["status"], withRings: boolean): Plan | null {
  const rings = outer(f.geometry);
  const pts = rings.flat();
  if (!pts.length) return null;
  const cx = pts.reduce((s, p) => s + p[0], 0) / pts.length, cy = pts.reduce((s, p) => s + p[1], 0) / pts.length;
  const c = fromUtm(cx, cy);
  const p = f.properties;
  const plan: Plan = {
    id: f.id, status,
    name: String(p.plannavn ?? "Lokalplan").replace(/^for /i, "").replace(/^\w/, (m) => m.toUpperCase()),
    proposed: iso(p.datoforsl), adopted: iso(p.datovedt),
    use: p.anvendelsegenerel ? String(p.anvendelsegenerel) : null,
    kommune: p.kommunenavn ? String(p.kommunenavn) : null,
    district: p.distrikt ? String(p.distrikt) : null,
    link: p.doklink ? String(p.doklink) : null,
    lat: c.lat, lon: c.lon,
  };
  if (withRings) {
    // Thin long outlines: the map needs the shape, not every surveyed point.
    plan.rings = rings.map((r) => {
      const step = Math.max(1, Math.floor(r.length / 60));
      return r.filter((_, i) => i % step === 0 || i === r.length - 1).map(([x, y]) => { const q = fromUtm(x, y); return [Math.round(q.lon * 1e5) / 1e5, Math.round(q.lat * 1e5) / 1e5] as [number, number]; });
    });
  }
  return plan;
}

const since = (years: number) => ymd(new Date(Date.now() - years * 365 * 86400_000));

/** Local plans proposed in the last three years within `radius` metres of a point, nearest first. */
export async function plansNear(lat: number, lon: number, radius = 2000): Promise<Plan[]> {
  const { x, y } = toUtm(lat, lon);
  const where = `DWITHIN(geometri,POINT(${x.toFixed(0)} ${y.toFixed(0)}),${radius},meters) AND datoforsl>=${since(3)}`;
  const [forslag, vedtaget] = await Promise.all([query("forslag", where, 40), query("vedtaget", where, 80)]);
  const plans = [...forslag.map((f) => toPlan(f, "forslag", false)), ...vedtaget.map((f) => toPlan(f, "vedtaget", false))].filter((p): p is Plan => !!p);
  const cos = Math.cos((lat * Math.PI) / 180);
  for (const p of plans) p.distanceM = Math.round(Math.hypot((p.lat - lat) * 111_320, (p.lon - lon) * 111_320 * cos));
  return plans.sort((a, b) => (a.distanceM ?? 0) - (b.distanceM ?? 0));
}

/** Plans in a map view (for the overlay), proposed in the last three years. */
export async function plansInBox(west: number, south: number, east: number, north: number): Promise<Plan[]> {
  const a = toUtm(south, west), b = toUtm(north, east);
  const where = `BBOX(geometri,${Math.min(a.x, b.x).toFixed(0)},${Math.min(a.y, b.y).toFixed(0)},${Math.max(a.x, b.x).toFixed(0)},${Math.max(a.y, b.y).toFixed(0)}) AND datoforsl>=${since(3)}`;
  const [forslag, vedtaget] = await Promise.all([query("forslag", where, 80), query("vedtaget", where, 200)]);
  return [...forslag.map((f) => toPlan(f, "forslag", true)), ...vedtaget.map((f) => toPlan(f, "vedtaget", true))].filter((p): p is Plan => !!p);
}

/** Plain-language kind of project, from the plan's general use. */
export function planKind(use: string | null): string {
  const u = (use ?? "").toLowerCase();
  if (u.includes("bolig") && u.includes("erhverv")) return "Boliger og erhverv";
  if (u.includes("bolig")) return "Nye boliger";
  if (u.includes("center")) return "Butikker og centerområde";
  if (u.includes("erhverv")) return "Erhverv";
  if (u.includes("offentlig")) return "Skole, institution eller anden offentlig funktion";
  if (u.includes("rekreativ")) return "Park og fritid";
  if (u.includes("teknisk")) return "Teknisk anlæg";
  if (u.includes("sommerhus")) return "Sommerhuse";
  return use || "Lokalplan";
}
