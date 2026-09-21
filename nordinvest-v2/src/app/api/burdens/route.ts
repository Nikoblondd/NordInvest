// Future-burdens endpoint. Given an address, fetches Danish public planning
// data (lokalplan-forslag, vedtagne planer, kommuneplanrammer, kloakopland)
// and returns a structured list of things a buyer should know about. Cached
// at the edge for a day per address.

import { NextResponse } from "next/server";
import { getFutureBurdens } from "@/lib/future-burdens";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const address = new URL(req.url).searchParams.get("address");
  if (!address || address.trim().length < 4) {
    return NextResponse.json({ ok: false, error: "missing_address" }, { status: 400 });
  }
  try {
    const data = await getFutureBurdens(address);
    if (!data) {
      return NextResponse.json(
        { ok: false, error: "no_coord" },
        { headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400" } },
      );
    }
    return NextResponse.json(
      { ok: true, ...data },
      {
        headers: {
          "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=604800",
        },
      },
    );
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "unknown" },
      { status: 500 },
    );
  }
}
