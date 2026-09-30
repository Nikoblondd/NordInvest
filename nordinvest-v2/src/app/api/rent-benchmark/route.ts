import { NextResponse } from "next/server";
import { getRentBenchmark } from "@/lib/rent";

export const runtime = "nodejs";

// Serves the documented rent benchmark for a property's zip + type. DST is
// the citable source for the growth trajectory; user observations sharpen the
// estimate as density crosses ≥5 / ≥15 per region+type.
export async function GET(req: Request) {
  const p = new URL(req.url).searchParams;
  const zip = p.get("zip") ? Number(p.get("zip")) : null;
  const type = p.get("type");
  const area = p.get("area") ? Number(p.get("area")) : null;
  const benchmark = await getRentBenchmark(zip, type, area);
  return NextResponse.json(
    { benchmark },
    { headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400" } },
  );
}
