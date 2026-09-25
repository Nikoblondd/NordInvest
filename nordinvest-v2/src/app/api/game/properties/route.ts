import { NextRequest, NextResponse } from "next/server";
import { buildGameSet } from "@/lib/game/listings";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

function parseCount(v: unknown): number {
  const n = Math.floor(Number(v) || 10);
  return Math.max(3, Math.min(30, n));
}

async function respond(region: string, count: number, exclude: Set<string>) {
  const r = await buildGameSet(region, count, exclude);
  if (!r.ok) {
    return NextResponse.json({ ok: false, error: r.error }, { status: r.error === "unknown_region" ? 400 : 200 });
  }
  return NextResponse.json({ ok: true, region, count: r.properties.length, exhausted: r.exhausted, properties: r.properties });
}

export async function GET(req: NextRequest) {
  const region = (req.nextUrl.searchParams.get("region") || "hele-dk").toLowerCase();
  return respond(region, parseCount(req.nextUrl.searchParams.get("count")), new Set());
}

/** POST { region, count, exclude: string[] } — exclude = ids the player has already seen. */
export async function POST(req: NextRequest) {
  let body: { region?: unknown; count?: unknown; exclude?: unknown } = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "bad_body" }, { status: 400 });
  }
  const region = String(body.region || "hele-dk").toLowerCase();
  const exclude = new Set(
    (Array.isArray(body.exclude) ? body.exclude : [])
      .filter((x): x is string => typeof x === "string" && x.length < 120)
      .slice(-5000),
  );
  return respond(region, parseCount(body.count), exclude);
}
