/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";
import { analyze, type AnalysisInput } from "@/lib/analysis";
import type { PricePoint, WatchStatus } from "@/lib/vagt";
import { sendEmail, vagtAlertEmail } from "@/lib/email";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300; // re-scraping many listings can take a while

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://nordinvest.io";
const MOVE_THRESHOLD = 0.005; // 0,5 % — ignore rounding noise

// Auth: a Vercel Cron request carries the `x-vercel-cron` header; a manual run
// must present the CRON_SECRET. Without either, refuse.
function authorized(req: Request): boolean {
  if (req.headers.get("x-vercel-cron")) return true;
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const auth = req.headers.get("authorization");
  const key = new URL(req.url).searchParams.get("key");
  return auth === `Bearer ${secret}` || key === secret;
}

type WatchRow = {
  id: string;
  user_id: string | null;
  address: string | null;
  listing_url: string;
  inputs: AnalysisInput | null;
  baseline_price: number | null;
  current_price: number | null;
  price_history: PricePoint[] | null;
  status: WatchStatus;
};

const today = () => new Date().toISOString().slice(0, 10);
const dk = (n: number) => Math.round(n).toLocaleString("da-DK");

async function scrapePrice(url: string): Promise<number | null> {
  try {
    const res = await fetch(`${SITE}/api/extract?url=${encodeURIComponent(url)}`, { cache: "no-store" });
    const d = await res.json();
    const p = d?.fields?.price;
    return typeof p === "number" && p > 0 ? p : null;
  } catch {
    return null;
  }
}

export async function GET(req: Request) {
  if (!authorized(req)) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!base || !key) {
    return NextResponse.json({ ok: false, error: "not_configured" }, { status: 200 });
  }

  const headers = { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" };

  // Pull watches that are still worth checking (not already sold/withdrawn),
  // oldest-checked first so a time-boxed run makes steady progress.
  const list: WatchRow[] = await fetch(
    `${base}/rest/v1/watches?status=neq.sold&select=id,user_id,address,listing_url,inputs,baseline_price,current_price,price_history,status&order=last_checked_at.asc.nullsfirst&limit=150`,
    { headers, cache: "no-store" },
  )
    .then((r) => r.json())
    .catch(() => []);

  if (!Array.isArray(list) || list.length === 0) {
    return NextResponse.json({ ok: true, checked: 0, changed: 0 });
  }

  let changed = 0;
  let emailed = 0;
  const results: { id: string; status: WatchStatus; alert: boolean; emailed?: boolean }[] = [];

  // Look up a user's email + name once (service-role REST bypasses RLS).
  async function userContact(userId: string | null): Promise<{ email: string | null; name: string | null }> {
    if (!userId) return { email: null, name: null };
    const rows = await fetch(`${base}/rest/v1/profiles?id=eq.${userId}&select=email,full_name`, { headers, cache: "no-store" })
      .then((r) => r.json())
      .catch(() => []);
    const p = Array.isArray(rows) ? rows[0] : null;
    return { email: p?.email ?? null, name: p?.full_name ?? null };
  }

  for (const w of list) {
    const price = await scrapePrice(w.listing_url);
    const prev = w.current_price ?? w.baseline_price ?? null;

    // Couldn't read a price — record the attempt, mark error, don't touch history.
    if (price == null) {
      await patch(base, headers, w.id, { status: "error", last_checked_at: new Date().toISOString() });
      results.push({ id: w.id, status: "error", alert: false });
      continue;
    }

    const history = Array.isArray(w.price_history) ? [...w.price_history] : [];
    // Re-score with the new price if we have the original inputs.
    let score: number | undefined;
    if (w.inputs && typeof w.inputs.price === "number") {
      score = analyze({ ...w.inputs, price }).score;
    }

    // Append today's snapshot (replace a same-day one), cap the series.
    const d = today();
    const point: PricePoint = { d, price, ...(score != null ? { score } : {}) };
    const last = history[history.length - 1];
    if (last && last.d === d) history[history.length - 1] = point;
    else history.push(point);
    if (history.length > 60) history.splice(0, history.length - 60);

    // Decide status + alert relative to the previous observed price.
    let status: WatchStatus = "active";
    let hasAlert = false;
    let lastAlert: string | null = null;
    if (prev != null && Math.abs(price - prev) / prev >= MOVE_THRESHOLD) {
      const dir = price < prev ? "drop" : "rise";
      status = dir === "drop" ? "price_drop" : "price_rise";
      const pctMove = Math.abs((price - prev) / prev) * 100;
      const scoreTxt = score != null ? ` Score nu ${score}/100.` : "";
      lastAlert =
        dir === "drop"
          ? `Prisen faldt fra ${dk(prev)} til ${dk(price)} kr (−${pctMove.toLocaleString("da-DK", { maximumFractionDigits: 1 })} %).${scoreTxt}`
          : `Prisen steg fra ${dk(prev)} til ${dk(price)} kr (+${pctMove.toLocaleString("da-DK", { maximumFractionDigits: 1 })} %).${scoreTxt}`;
      // Only a drop, or a jump into a clearly-solid score, is worth alerting on.
      hasAlert = dir === "drop" || (score != null && score >= 65);
      changed++;
    }

    await patch(base, headers, w.id, {
      current_price: price,
      current_score: score ?? null,
      price_history: history,
      status,
      has_alert: hasAlert || undefined, // don't clear an existing alert on a quiet check
      last_alert: lastAlert ?? undefined,
      last_checked_at: new Date().toISOString(),
    });

    // Email the owner on a fresh alert (a price move happened this run).
    let didEmail = false;
    if (hasAlert && lastAlert) {
      const { email, name } = await userContact(w.user_id);
      if (email) {
        const { subject, html } = vagtAlertEmail({
          name,
          address: w.address,
          alert: lastAlert,
          currentPrice: price,
          currentScore: score ?? null,
          listingUrl: w.listing_url,
        });
        const sent = await sendEmail({ to: email, subject, html });
        if (sent.ok) { didEmail = true; emailed++; }
      }
    }
    results.push({ id: w.id, status, alert: hasAlert, emailed: didEmail });
  }

  return NextResponse.json({ ok: true, checked: list.length, changed, emailed, results });
}

async function patch(base: string, headers: Record<string, string>, id: string, body: Record<string, unknown>) {
  // Strip undefined so we never overwrite a field we meant to leave alone.
  const clean: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(body)) if (v !== undefined) clean[k] = v;
  await fetch(`${base}/rest/v1/watches?id=eq.${id}`, {
    method: "PATCH",
    headers: { ...headers, Prefer: "return=minimal" },
    body: JSON.stringify(clean),
  }).catch(() => {});
}
