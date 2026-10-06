/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";
import { sendEmail, savedSearchEmail } from "@/lib/email";
import { effectiveLimit } from "@/lib/access";
import { limits } from "@/lib/pricing";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://nordinvest.io";

function authorized(req: Request): boolean {
  if (req.headers.get("x-vercel-cron")) return true;
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const auth = req.headers.get("authorization");
  const key = new URL(req.url).searchParams.get("key");
  return auth === `Bearer ${secret}` || key === secret;
}

type SearchRow = {
  id: string;
  user_id: string | null;
  label: string | null;
  market: string | null;
  municipality: string | null;
  type: string | null;
  price_min: number | null;
  price_max: number | null;
  min_score: number | null;
  sort: string | null;
  seen_ids: string[] | null;
};

export async function GET(req: Request) {
  if (!authorized(req)) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!base || !key) return NextResponse.json({ ok: false, error: "not_configured" }, { status: 200 });

  const headers = { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" };

  const searches: SearchRow[] = await fetch(
    `${base}/rest/v1/saved_searches?select=id,user_id,label,market,municipality,type,price_min,price_max,min_score,sort,seen_ids&order=last_checked_at.asc.nullsfirst&limit=200`,
    { headers, cache: "no-store" },
  ).then((r) => r.json()).catch(() => []);

  if (!Array.isArray(searches) || searches.length === 0) {
    return NextResponse.json({ ok: true, checked: 0, notified: 0 });
  }

  let notified = 0;
  const results: { id: string; new: number; emailed: boolean }[] = [];

  for (const s of searches) {
    // Re-run the exact search through our own deal engine.
    const q = new URLSearchParams();
    q.set("market", s.market ?? "bolig");
    if (s.municipality) q.set("municipality", s.municipality);
    if (s.type) q.set("type", s.type);
    if (s.price_min) q.set("priceMin", String(s.price_min));
    if (s.price_max) q.set("priceMax", String(s.price_max));
    q.set("sort", s.sort ?? "score");

    // Our own secret gets the full, unlocked result.
    const data = await fetch(`${SITE}/api/deals/search?${q.toString()}`, { cache: "no-store", headers: { Authorization: `Bearer ${process.env.CRON_SECRET ?? ""}` } })
      .then((r) => r.json())
      .catch(() => null);

    const deals: any[] = Array.isArray(data?.deals) ? data.deals : [];
    const minScore = s.min_score ?? 60;
    const seen = new Set(Array.isArray(s.seen_ids) ? s.seen_ids : []);
    const qualifying = deals.filter((d) => (d.score ?? 0) >= minScore);
    const fresh = qualifying.filter((d) => d.id && !seen.has(String(d.id)));

    const allIds = qualifying.map((d) => String(d.id));
    const patch: Record<string, unknown> = {
      seen_ids: allIds.slice(0, 300),
      last_checked_at: new Date().toISOString(),
    };

    let emailed = false;
    if (fresh.length > 0) {
      patch.new_count = fresh.length;
      const top = fresh[0];
      patch.last_match = { address: top.address ?? top.road ?? "", price: top.price, score: top.score };

      // Email the owner about the new matches.
      const prof = await fetch(`${base}/rest/v1/profiles?id=eq.${s.user_id}&select=email,full_name,subscription_tier`, { headers, cache: "no-store" })
        .then((r) => r.json()).catch(() => []);
      // Deal-vagt is a paid feature: only paying customers (and admins) get the email.
      const paid = Array.isArray(prof) && prof[0] && effectiveLimit(prof[0].subscription_tier, prof[0].email) > limits.free;
      const email = paid && prof[0]?.email ? prof[0].email : null;
      if (email && s.label) {
        const { subject, html } = savedSearchEmail({
          name: prof[0]?.full_name ?? null,
          label: s.label,
          total: fresh.length,
          matches: fresh.map((d) => ({
            address: d.address ?? d.road ?? "Ejendom",
            price: d.price,
            score: d.score,
            url: `${SITE}/analyseren?url=${encodeURIComponent(d.url ?? "")}`,
          })),
        });
        const sent = await sendEmail({ to: email, subject, html });
        if (sent.ok) { emailed = true; notified++; }
      }
    }

    await fetch(`${base}/rest/v1/saved_searches?id=eq.${s.id}`, {
      method: "PATCH",
      headers: { ...headers, Prefer: "return=minimal" },
      body: JSON.stringify(patch),
    }).catch(() => {});

    results.push({ id: s.id, new: fresh.length, emailed });
  }

  return NextResponse.json({ ok: true, checked: searches.length, notified, results });
}
