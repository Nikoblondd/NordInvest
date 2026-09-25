import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

/*
 * The outline of a postnummer (the "by" a game home lies in) from DAWA /
 * Dataforsyningen, simplified so it's a few KB instead of ~300 KB. The game
 * map highlights this area — never the home's address.
 */

type Ring = number[][];
type Geometry = { type: "Polygon"; coordinates: Ring[] } | { type: "MultiPolygon"; coordinates: Ring[][] };

// Ramer–Douglas–Peucker on lon/lat pairs.
function simplify(points: Ring, eps: number): Ring {
  if (points.length < 4) return points;
  const [ax, ay] = points[0];
  const [bx, by] = points[points.length - 1];
  const dx = bx - ax;
  const dy = by - ay;
  const len = Math.hypot(dx, dy) || 1e-12;
  let max = 0;
  let idx = 0;
  for (let i = 1; i < points.length - 1; i++) {
    const [px, py] = points[i];
    const d = Math.abs(dy * px - dx * py + bx * ay - by * ax) / len;
    if (d > max) {
      max = d;
      idx = i;
    }
  }
  if (max <= eps) return [points[0], points[points.length - 1]];
  return [...simplify(points.slice(0, idx + 1), eps).slice(0, -1), ...simplify(points.slice(idx), eps)];
}

const round = (r: Ring): Ring => r.map(([x, y]) => [Math.round(x * 1e5) / 1e5, Math.round(y * 1e5) / 1e5]);

function simplifyRing(r: Ring): Ring | null {
  if (r.length < 4) return null;
  // A closed ring starts and ends on the same point, which RDP can't measure
  // against — split it at the point farthest from the start and do each half.
  const [x0, y0] = r[0];
  let far = 1;
  let best = -1;
  for (let i = 1; i < r.length - 1; i++) {
    const d = Math.hypot(r[i][0] - x0, r[i][1] - y0);
    if (d > best) {
      best = d;
      far = i;
    }
  }
  const eps = 0.0004;
  const joined = [...simplify(r.slice(0, far + 1), eps).slice(0, -1), ...simplify(r.slice(far), eps)];
  const s = round(joined);
  if (s.length < 4) return null;
  const [fx, fy] = s[0];
  const [lx, ly] = s[s.length - 1];
  if (fx !== lx || fy !== ly) s.push([fx, fy]);
  return s;
}

function simplifyGeometry(g: Geometry): Geometry {
  const poly = (rings: Ring[]) => rings.map(simplifyRing).filter((r): r is Ring => !!r);
  if (g.type === "Polygon") return { type: "Polygon", coordinates: poly(g.coordinates) };
  return {
    type: "MultiPolygon",
    coordinates: g.coordinates.map(poly).filter((p) => p.length > 0),
  };
}

export async function GET(req: NextRequest) {
  const zip = req.nextUrl.searchParams.get("zip") ?? "";
  if (!/^\d{4}$/.test(zip)) return NextResponse.json({ ok: false, error: "bad_zip" }, { status: 400 });
  try {
    const res = await fetch(`https://api.dataforsyningen.dk/postnumre/${zip}?format=geojson&srid=4326`, {
      signal: AbortSignal.timeout(8000),
      next: { revalidate: 60 * 60 * 24 * 30 },
    });
    if (!res.ok) return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
    const f = (await res.json()) as {
      geometry?: Geometry;
      properties?: { navn?: string; bbox?: number[]; visueltcenter?: number[] };
    };
    if (!f.geometry) return NextResponse.json({ ok: false, error: "no_geometry" }, { status: 404 });
    return NextResponse.json(
      {
        ok: true,
        zip,
        name: f.properties?.navn ?? "",
        bbox: f.properties?.bbox ?? null,
        center: f.properties?.visueltcenter ?? null,
        geometry: simplifyGeometry(f.geometry),
      },
      { headers: { "Cache-Control": "public, max-age=86400, s-maxage=2592000, stale-while-revalidate=86400" } },
    );
  } catch {
    return NextResponse.json({ ok: false, error: "upstream" }, { status: 502 });
  }
}
