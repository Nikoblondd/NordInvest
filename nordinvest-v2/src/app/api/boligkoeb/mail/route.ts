import { NextResponse } from "next/server";
import { cronAuthorized } from "@/lib/gate";
import { getMarket, type BuyerHome } from "@/lib/buyer/market";
import { readStore, storeOwners, writeStore } from "@/lib/app/store";
import { getAuthUser } from "@/lib/supabase/admin";
import { BOLIGKRYDS_URL } from "@/lib/buyer/gate";
import { sendMail } from "@/lib/mail/send";
import { compare, hasFilters, matches } from "@/lib/buyer/filter";
import { EMPTY_STATE, type BuyerState } from "@/lib/buyer/state";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

/*
 * GET /api/boligkoeb/mail (Vercel cron, daily): one mail per home buyer who
 * asked for it, and only when there is something to say: a saved home got
 * cheaper or left the market, or new homes matching their filters came on the
 * market inside the area they were looking at. Saved prices are updated so
 * the same drop is never mailed twice.
 */
const SITE = BOLIGKRYDS_URL;
const kr = (n: number) => `${Math.round(n).toLocaleString("da-DK")} kr`;
const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);
const link = (id: string) => `${SITE}/?bolig=${encodeURIComponent(id)}`;

export async function GET(req: Request) {
  if (!cronAuthorized(req)) return NextResponse.json({ ok: false }, { status: 401 });
  const m = await getMarket();
  if (!m) return NextResponse.json({ ok: false, reason: "market" }, { status: 503 });
  const owners = await storeOwners("boligkoeb");
  let sent = 0;
  for (const id of owners) {
    const [raw] = await readStore<BuyerState>("boligkoeb", id);
    if (!raw) continue;
    const s: BuyerState = { ...EMPTY_STATE, ...raw };
    if (!s.mail?.priceDrops && !s.mail?.newMatches) continue;
    const user = await getAuthUser(id);
    if (!user?.email) continue;

    const drops: { h: BuyerHome; from: number }[] = [];
    const gone: string[] = [];
    const saved = s.saved.map((x) => {
      if (!x.alert || x.gone || x.stage === "fravalgt") return x;
      const h = m.byId.get(x.id);
      if (!h) { gone.push(x.address); return { ...x, gone: true }; }
      const ref = x.lastPrice ?? x.price;
      if (h.price < ref) drops.push({ h, from: ref });
      return { ...x, lastPrice: h.price };
    });

    let fresh: BuyerHome[] = [];
    const since = Date.parse(s.mailedAt ?? s.lastVisit ?? "") || Date.now() - 86400_000;
    const b = s.view?.bounds;
    if (s.mail.newMatches && b && hasFilters(s.filters)) {
      fresh = m.homes
        .filter((h) => h.knownStart && Date.parse(h.firstSeen) > since && h.lon >= b[0] && h.lat >= b[1] && h.lon <= b[2] && h.lat <= b[3] && matches(h, { ...s.filters, onlyNew: false }))
        .sort(compare("bedste"));
    }

    const body: string[] = [];
    if (s.mail.priceDrops && drops.length) {
      body.push(`<h3 style="margin:24px 0 8px;font-size:16px">Prisfald på dine gemte boliger</h3>`);
      for (const d of drops) body.push(`<p style="margin:0 0 10px"><a href="${link(d.h.id)}" style="color:#1d4ed8;font-weight:600">${esc(d.h.address)}</a><br>${kr(d.from)} → <b>${kr(d.h.price)}</b> (−${kr(d.from - d.h.price)})</p>`);
    }
    if (s.mail.priceDrops && gone.length) {
      body.push(`<h3 style="margin:24px 0 8px;font-size:16px">Ikke længere til salg</h3><p style="margin:0">${gone.map(esc).join("<br>")}</p><p style="font-size:13px;color:#64748b">Boligen er taget af markedet, ofte fordi den er solgt.</p>`);
    }
    if (fresh.length) {
      body.push(`<h3 style="margin:24px 0 8px;font-size:16px">${fresh.length === 1 ? "1 ny bolig" : `${fresh.length} nye boliger`} der passer på din søgning</h3>`);
      for (const h of fresh.slice(0, 8)) body.push(`<p style="margin:0 0 10px"><a href="${link(h.id)}" style="color:#1d4ed8;font-weight:600">${esc(h.address)}</a><br>${kr(h.price)} · ${h.area} m² · ${h.verdict === "godt" ? "Godt køb" : h.verdict === "middel" ? "Middel" : "Dyr"} (${h.deltaPct > 0 ? "+" : ""}${String(h.deltaPct).replace(".", ",")} % mod området)</p>`);
    }

    const next: BuyerState = { ...s, saved, mailedAt: new Date().toISOString() };
    if (body.length) {
      const subject = drops.length ? `Prisfald på ${drops.length === 1 ? "en af dine gemte boliger" : `${drops.length} af dine gemte boliger`}` : fresh.length ? `${fresh.length === 1 ? "1 ny bolig" : `${fresh.length} nye boliger`} i dit område` : "Nyt om dine gemte boliger";
      const html = `<div style="font-family:-apple-system,Segoe UI,sans-serif;max-width:560px;color:#0f172a;font-size:15px;line-height:1.55"><p>Hej${user.user_metadata?.full_name ? ` ${esc(String(user.user_metadata.full_name).split(" ")[0])}` : ""},</p><p>Her er det nye siden sidst på Boligkryds.</p>${body.join("")}<p style="margin:28px 0"><a href="${SITE}/" style="display:inline-block;background:#2563eb;color:#fff;text-decoration:none;font-weight:600;padding:12px 20px;border-radius:8px">Åbn Boligkryds</a></p><p style="font-size:12px;color:#94a3b8">Du får denne mail, fordi du har slået mails til på Boligkryds. <a href="${SITE}/?panel=indstillinger" style="color:#64748b">Slå dem fra</a>.</p></div>`;
      const r = await sendMail({ from: "Boligkryds <adgang@nordinvest.io>", to: user.email, subject, html, idempotencyKey: `boligkoeb-${id}-${new Date().toISOString().slice(0, 10)}` });
      if (r.ok) sent++;
    }
    await writeStore("boligkoeb", id, [next]);
  }
  return NextResponse.json({ ok: true, owners: owners.length, sent });
}
