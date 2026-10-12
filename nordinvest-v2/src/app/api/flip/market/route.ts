import { NextResponse } from "next/server";
import { getFlipMarket } from "@/lib/flip/market";
import { getSoldStats } from "@/lib/sold";
import { gateApi } from "@/lib/gate";

// What homes like this sell for before and after renovation in the same
// postnummer. Cached 6 hours per query at the edge.
export const runtime = "nodejs";

export async function GET(req: Request) {
  const denied = await gateApi(req);
  if (denied) return denied;
  const q = new URL(req.url).searchParams;
  const year = Number(q.get("year"));
  const zip = q.get("zip") ?? "";
  const type = q.get("type") ?? "villa";
  // Tinglyste salgspriser join the asking-price picture once the agent has them.
  const [data, sold] = await Promise.all([
    getFlipMarket(zip, type, Number(q.get("area")), Number.isFinite(year) && year > 1500 ? year : null),
    getSoldStats(zip, type),
  ]);
  return NextResponse.json(data.ok ? { ...data, sold } : data, { headers: { "Cache-Control": "public, s-maxage=21600, stale-while-revalidate=86400" } });
}
