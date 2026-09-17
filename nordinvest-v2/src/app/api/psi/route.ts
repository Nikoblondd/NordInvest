// PageSpeed Insights snapshot — returns real-user (or lab fallback) CWV data
// for our key public URLs. Cached at Vercel edge for 1 h so we don't burn the
// PSI free quota, revalidated by the underlying fetch cache.

import { NextResponse } from "next/server";
import { getPsiReport } from "@/lib/psi";

export const runtime = "nodejs";

export async function GET() {
  const report = await getPsiReport();
  return NextResponse.json(report, {
    headers: {
      "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
