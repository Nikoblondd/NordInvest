// Comparables endpoint. Given zip + property type + area + asking price,
// pulls similar active Boligsiden listings and returns the local median +
// IQR of price/m² so the analyzer can benchmark the asking price. Cached
// at the edge for a day per query — the underlying market moves in weeks.

import { NextResponse } from "next/server";
import { getComparables } from "@/lib/comparables";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const q = new URL(req.url).searchParams;
  const zip = q.get("zip") ?? "";
  const type = q.get("type") ?? "condo";
  const area = Number(q.get("area"));
  const price = Number(q.get("price"));

  if (!zip || !area || !price) {
    return NextResponse.json({ ok: false, error: "missing_params" }, { status: 400 });
  }

  const data = await getComparables(zip, type, area, price);
  return NextResponse.json(data, {
    headers: {
      "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=172800",
    },
  });
}
