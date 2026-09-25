import { NextRequest, NextResponse } from "next/server";
import { proximityPoints } from "@/app/spil/gameLogic";
import { dailyConfigured, getDailySet, leaderboard, publicHome, submitDaily, todayKey, DAILY_COUNT } from "@/lib/game/daily";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

const noStore = { "Cache-Control": "no-store" };

/**
 * GET                 → today's five homes, without prices or addresses
 * GET ?view=board     → today's leaderboard (+ your own rank with &client=)
 * POST {action:"reveal", index, guess}  → price + points for one home
 * POST {action:"submit", clientId, name, guesses, hints} → stores the result once
 */
export async function GET(req: NextRequest) {
  if (!dailyConfigured()) return NextResponse.json({ ok: false, error: "not_configured" }, { status: 503 });
  const date = todayKey();
  const sp = req.nextUrl.searchParams;

  if (sp.get("view") === "board") {
    const board = await leaderboard(date, sp.get("client") || undefined);
    return NextResponse.json({ ok: true, date, total: board.total, top: board.top, me: board.me }, { headers: noStore });
  }

  const set = await getDailySet(date);
  if (!set) return NextResponse.json({ ok: false, error: "no_set" }, { status: 503 });
  return NextResponse.json({ ok: true, date, properties: set.map(publicHome) }, { headers: noStore });
}

export async function POST(req: NextRequest) {
  if (!dailyConfigured()) return NextResponse.json({ ok: false, error: "not_configured" }, { status: 503 });
  let body: Record<string, unknown> = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "bad_body" }, { status: 400 });
  }
  const date = todayKey();
  // A game started just before midnight is scored against the day it began.
  const clientDate = typeof body.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(body.date) ? body.date : date;
  if (clientDate !== date && clientDate !== todayKey(new Date(Date.now() - 3 * 3600_000))) {
    return NextResponse.json({ ok: false, error: "expired" }, { status: 400 });
  }

  if (body.action === "reveal") {
    const set = await getDailySet(clientDate);
    const i = Math.floor(Number(body.index));
    const home = set?.[i];
    if (!home) return NextResponse.json({ ok: false, error: "bad_index" }, { status: 400 });
    const guess = Math.max(0, Number(body.guess) || 0);
    const pct = guess > 0 ? (Math.abs(guess - home.price) / home.price) * 100 : 100;
    return NextResponse.json(
      {
        ok: true,
        price: home.price,
        address: home.address,
        listingUrl: home.listingUrl ?? null,
        pct,
        points: guess > 0 ? proximityPoints(pct) : 0,
      },
      { headers: noStore },
    );
  }

  if (body.action === "submit") {
    const clientId = typeof body.clientId === "string" && /^[a-zA-Z0-9-]{8,64}$/.test(body.clientId) ? body.clientId : null;
    const guesses = Array.isArray(body.guesses) ? body.guesses.slice(0, DAILY_COUNT).map(Number) : [];
    if (!clientId || guesses.length !== DAILY_COUNT) {
      return NextResponse.json({ ok: false, error: "bad_submit" }, { status: 400 });
    }
    const r = await submitDaily({ date: clientDate, clientId, name: String(body.name ?? ""), guesses, hints: Number(body.hints) || 0 });
    return NextResponse.json(r, { headers: noStore });
  }

  return NextResponse.json({ ok: false, error: "bad_action" }, { status: 400 });
}
