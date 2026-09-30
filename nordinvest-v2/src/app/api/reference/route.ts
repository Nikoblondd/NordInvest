import { NextResponse } from "next/server";
import { residentialPriceBenchmark } from "@/lib/reference";

export const runtime = "nodejs";

// Serves the documented price/m² benchmark for a property's zip + type, so the
// analyzer can show a sourced market comparison. Cached at the edge for a day —
// the benchmark moves slowly and is refreshed when reference.json is redeployed.
export async function GET(req: Request) {
  const p = new URL(req.url).searchParams;
  const zip = p.get("zip") ? Number(p.get("zip")) : null;
  const type = p.get("type");
  const benchmark = residentialPriceBenchmark(zip, type);
  return NextResponse.json(
    { benchmark },
    { headers: { "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=604800" } },
  );
}
