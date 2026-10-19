import { NextResponse } from "next/server";
import { brokerUser } from "@/lib/broker/gate";
import { caseFromUrl, listingPhotos } from "@/lib/broker/cases";
import { createLink, deleteLink, legacyLinks, listLinks, viewCount, type BrokerLink } from "@/lib/broker/links";
import { listLeads } from "@/lib/broker/leads";
import { buildingFacts } from "@/lib/building-facts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

/*
 * The agent's analysis links.
 *  GET                      their links (admins also see the hand-made outreach links)
 *  POST { url }             a link for an Ejendomstorvet listing; the numbers are read on the server
 *  POST { manual: {...} }   a link from numbers the agent types in
 *  DELETE { slug }          removes one of their own links
 */
const json = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });
const withViews = async (ls: BrokerLink[]) => Promise.all(ls.map(async (l) => ({ ...l, views: await viewCount(l.slug), leads: await listLeads(l.slug) })));

export async function GET() {
  const me = await brokerUser();
  if (!me) return json({ ok: false, reason: "no_access" }, 403);
  const [mine, legacy] = await Promise.all([withViews(await listLinks(me.user.id)), me.admin ? withViews(legacyLinks()) : Promise.resolve([])]);
  return json({ ok: true, links: mine, legacy });
}

export async function POST(req: Request) {
  const me = await brokerUser();
  if (!me) return json({ ok: false, reason: "no_access" }, 403);
  const b = (await req.json().catch(() => ({}))) as { url?: string; manual?: Record<string, unknown> };

  if (b.url) {
    const c = await caseFromUrl(String(b.url).slice(0, 500));
    if (!c) return json({ ok: false, reason: "not_found" }, 404);
    const [imgs, bf] = await Promise.all([listingPhotos(c.url, c.image), buildingFacts(c.addr)]);
    const link = await createLink(me.user.id, {
      url: c.url, price: c.price, rent: Math.round((c.price * c.yieldPct) / 100 / 12), subcat: c.subcat, addr: c.addr, imgs,
      opex: c.opex, area: c.area ?? bf?.area ?? null, areaSource: c.area ? "annonce" : bf?.area ? "bbr" : undefined,
      builtYear: bf?.builtYear ?? null, renovatedYear: bf?.renovatedYear ?? null,
    });
    return link ? json({ ok: true, link: { ...link, views: 0 } }) : json({ ok: false, reason: "save_failed" }, 502);
  }

  if (b.manual) {
    const m = b.manual;
    const addr = String(m.addr ?? "").trim().slice(0, 140);
    const price = Math.round(Number(m.price));
    const yieldPct = Number(String(m.yieldPct ?? "").replace(",", "."));
    const url = String(m.url ?? "").trim().slice(0, 500);
    const image = String(m.image ?? "").trim().slice(0, 500);
    const subcat = String(m.subcat ?? "").trim().slice(0, 60) || null;
    const errors: Record<string, string> = {};
    if (addr.length < 5 || !/\d/.test(addr)) errors.addr = "Skriv hele adressen, fx Vestergade 12, 8000 Aarhus C.";
    if (!(price >= 100000 && price <= 2_000_000_000)) errors.price = "Skriv udbudsprisen i kroner.";
    if (!(yieldPct >= 1 && yieldPct <= 20)) errors.yieldPct = "Skriv afkastet i procent, mellem 1 og 20.";
    if (url && !/^https:\/\/\S+\.\S+/i.test(url)) errors.url = "Linket skal starte med https://";
    if (image && !/^https:\/\/\S+\.\S+/i.test(image)) errors.image = "Billedlinket skal starte med https://";
    if (Object.keys(errors).length) return json({ ok: false, reason: "invalid", errors }, 422);
    const opexIn = Math.round(Number(String(m.opex ?? "").replace(/\./g, "")));
    const areaIn = Math.round(Number(String(m.area ?? "").replace(/\./g, "")));
    const bf = await buildingFacts(addr);
    const link = await createLink(me.user.id, {
      url: url || "https://nordinvest.io", price, rent: Math.round((price * yieldPct) / 100 / 12), subcat, addr, imgs: image ? [image] : [],
      opex: opexIn > 0 ? opexIn : null, area: areaIn > 0 ? areaIn : bf?.area ?? null, areaSource: areaIn > 0 ? "annonce" : bf?.area ? "bbr" : undefined,
      builtYear: bf?.builtYear ?? null, renovatedYear: bf?.renovatedYear ?? null,
    });
    return link ? json({ ok: true, link: { ...link, views: 0 } }) : json({ ok: false, reason: "save_failed" }, 502);
  }

  return json({ ok: false, reason: "bad_request" }, 400);
}

export async function DELETE(req: Request) {
  const me = await brokerUser();
  if (!me) return json({ ok: false, reason: "no_access" }, 403);
  const b = (await req.json().catch(() => ({}))) as { slug?: string };
  const ok = await deleteLink(me.user.id, String(b.slug ?? ""), me.admin);
  return json({ ok }, ok ? 200 : 404);
}
