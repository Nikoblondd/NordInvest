import { NextResponse } from "next/server";
import { getFlipMarket } from "@/lib/flip/market";

// What homes like this sell for before and after renovation in the same
// postnummer. Cached 6 hours per query at the edge.
export const runtime = "nodejs";

export async function GET(req: Request) {
  const q = new URL(req.url).searchParams;
  const year = Number(q.get("year"));
  const data = await getFlipMarket(q.get("zip") ?? "", q.get("type") ?? "villa", Number(q.get("area")), Number.isFinite(year) && year > 1500 ? year : null);
  return NextResponse.json(data, { headers: { "Cache-Control": "public, s-maxage=21600, stale-while-revalidate=86400" } });
}
