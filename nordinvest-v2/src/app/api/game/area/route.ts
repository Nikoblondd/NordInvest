import { NextRequest, NextResponse } from "next/server";
import areas from "@/data/postnumre.json";

export const runtime = "nodejs";

/*
 * The outline of a postnummer (the "by" a game home lies in), simplified to a
 * few KB. The game map highlights this area, never the home's address.
 *
 * The outlines ship with the app (src/data/postnumre.json, built from the
 * official DAGI postnummer division) because DAWA, which we used to ask, has
 * been shut down. Central Copenhagen's street postnumre are one area per
 * range there ("1000-1499" and so on), so a zip inside a range gets the range.
 */

type Geometry = { type: "Polygon"; coordinates: number[][][] } | { type: "MultiPolygon"; coordinates: number[][][][] };
const AREAS = areas as Record<string, { name: string; geometry: Geometry }>;
const RANGES = Object.keys(AREAS)
  .filter((k) => k.includes("-"))
  .map((k) => {
    const [a, b] = k.split("-").map(Number);
    return { key: k, a, b };
  });

function lookup(zip: string) {
  if (AREAS[zip]) return AREAS[zip];
  const n = Number(zip);
  // 1900-1999 is Frederiksberg C, drawn together with 1800-1899.
  const z = n >= 1900 && n <= 1999 ? 1850 : n;
  const r = RANGES.find((x) => z >= x.a && z <= x.b);
  return r ? AREAS[r.key] : null;
}

export async function GET(req: NextRequest) {
  const zip = req.nextUrl.searchParams.get("zip") ?? "";
  if (!/^\d{4}$/.test(zip)) return NextResponse.json({ ok: false, error: "bad_zip" }, { status: 400 });
  const a = lookup(zip);
  if (!a) return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
  return NextResponse.json(
    { ok: true, zip, name: a.name, geometry: a.geometry },
    { headers: { "Cache-Control": "public, max-age=86400, s-maxage=2592000, stale-while-revalidate=86400" } },
  );
}
