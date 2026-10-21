import { createHash } from "node:crypto";
import { readCache, writeCache } from "@/lib/app/store";

/*
 * Server only. The photo gallery of a home, from the estate agent's own
 * listing page (the link Boligsiden gives). Only the home itself: outside,
 * inside and floor plans. Agent portraits, logos, adverts, videos and the
 * photos of other homes on the same page ("lignende boliger") are left out.
 *
 * Each agent platform is read by its own rule, worked out from real pages:
 *  - Mindworking (Nybolig, Home, Danbolig, Estate, John Frandsen, Mæglerhuset …):
 *    every image URL carries a media id and a purpose code. The listing's
 *    photos share the purpose of the main photo and have consecutive ids;
 *    floor plans are uploaded with them; portraits are years older, and other
 *    homes' photos have far-away ids.
 *  - EDC: images sit in dated folders; the listing's are from the same weeks
 *    as the main photo, the agent's portrait and adverts are not.
 *  - Lokalbolig (Diakrit): photos share the main photo's order number; floor
 *    plans are the neighbouring "2D" order.
 *  - Realmæglerne: the gallery is one unbroken run of images on the page.
 *  - Anyone else: the page's own share images (og:image), which agents set to
 *    the listing photos.
 */

export type GalleryImage = { url: string; kind: "foto" | "plan" };
const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130 Safari/537.36";
const MAX = 40;

const unescape = (h: string) => h.replace(/\\u002F/gi, "/").replace(/\\\//g, "/").replace(/&amp;/g, "&");
const ogImages = (h: string) => Array.from(h.matchAll(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/gi), (m) => m[1])
  .concat(Array.from(h.matchAll(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/gi), (m) => m[1]));

function decodeMw(b64: string): { id: number; purpose: number } | null {
  try {
    const s = Buffer.from(b64.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8");
    const d = JSON.parse(s.slice(s.indexOf("{")));
    return Number.isFinite(d.MediaDataId) ? { id: d.MediaDataId, purpose: d.MediaPurposeId } : null;
  } catch { return null; }
}

function mindworking(h: string): GalleryImage[] | null {
  const re = /(https:\/\/[a-z0-9-]+\.mindworking\.eu\/api\/mediaData\/mediaDataMediaPurposeId\/([A-Za-z0-9_-]+)\/imageHash\/[0-9a-f]+\/imageSize\/[A-Za-z0-9_/-]+)/g;
  const items: { url: string; id: number; purpose: number }[] = [];
  const seen = new Set<number>();
  for (const m of Array.from(h.matchAll(re))) {
    const d = decodeMw(m[2]);
    if (!d || seen.has(d.id)) continue;
    seen.add(d.id);
    items.push({ url: m[1], ...d });
  }
  if (items.length < 2) return null;
  const og = ogImages(h).map((u) => u.match(/mediaDataMediaPurposeId\/([A-Za-z0-9_-]+)/)?.[1]).map((b) => (b ? decodeMw(b) : null)).find(Boolean);
  const main = (og && items.find((x) => x.id === og.id)) ?? items[0];
  const P = main.purpose;
  let lo = main.id, hi = main.id;
  const photos: typeof items = [main], plans: typeof items = [];
  for (const x of items) {
    if (x.id === main.id) continue;
    if (x.purpose === P) {
      if (x.id >= lo - 25 && x.id <= hi + 25) { photos.push(x); lo = Math.min(lo, x.id); hi = Math.max(hi, x.id); }
      else if (photos.length >= 3) break; // the next home on the page
    } else if (x.id >= lo - 25 && x.id <= hi + 20000) {
      plans.push(x); // uploaded with or after the photos: floor plans (portraits and videos are older)
    }
  }
  const size = (u: string) => `${u}?bgcolor=ffffff&dpi=72&jq=75&tp=rgb&fo=1&w=1400`;
  return [...photos.map((x) => ({ url: size(x.url), kind: "foto" as const })), ...plans.map((x) => ({ url: size(x.url), kind: "plan" as const }))];
}

function edc(h: string): GalleryImage[] | null {
  const re = /(https:\/\/billeder\.edc\.dk\/edcmedia\/(\d{4})\/(\d{2})-[A-Za-z]+\/(\d{2})\/([0-9a-f-]{36}))_Size\d+x\d+/g;
  const items = new Map<string, { base: string; t: number }>();
  for (const m of Array.from(h.matchAll(re))) if (!items.has(m[5])) items.set(m[5], { base: m[1], t: Date.UTC(+m[2], +m[3] - 1, +m[4]) });
  if (!items.size) return null;
  const og = ogImages(h).map((u) => u.match(/([0-9a-f-]{36})_Size/)?.[1]).find(Boolean);
  const main = (og ? items.get(og) : undefined) ?? Array.from(items.values())[0];
  const day = 86400_000;
  return Array.from(items.values())
    .filter((x) => Math.abs(x.t - main.t) <= 30 * day)
    .sort((a, b) => (a === main ? -1 : b === main ? 1 : 0))
    .map((x) => ({ url: `${x.base}_Size1920x1080.jpg?fit=max&w=1400`, kind: "foto" as const }));
}

function lokalbolig(h: string): GalleryImage[] | null {
  const files = Array.from(new Set(Array.from(h.matchAll(/(https:\/\/portal\.diakrit\.com\/orderfiles\/[^"'\s<>\\]+?\/Deliveries\/(\d+)_[^"'\s<>\\]+?\.(?:jpe?g|png|svg))/g), (m) => m[1])));
  if (!files.length) return null;
  const order = (u: string) => Number(u.match(/Deliveries\/(\d+)_/)?.[1]);
  const og = ogImages(h).map((u) => u.match(/(https:\/\/portal\.diakrit\.com\/[^"'\s]+)/)?.[1]).find(Boolean);
  const main = og ? order(og) : order(files[0]);
  const photos = files.filter((u) => order(u) === main && /photo/i.test(u));
  const plans = files.filter((u) => Math.abs(order(u) - main) <= 3 && order(u) !== main && /2D|plan/i.test(u));
  const big = (u: string) => (u.endsWith(".svg") ? u : `https://lokalbolig.io/e/1200w/${u}`);
  return [...photos.map((u) => ({ url: big(u), kind: "foto" as const })), ...plans.map((u) => ({ url: big(u), kind: "plan" as const }))];
}

function realequity(h: string): GalleryImage[] | null {
  const items: { url: string; pos: number }[] = [];
  const seen = new Set<string>();
  for (const m of Array.from(h.matchAll(/https:\/\/mediaserver\.prod\.realequity\.dk\/images\/([0-9a-f-]{36})\/([^"'\s<>?/]+)/g))) {
    if (seen.has(m[1])) continue;
    seen.add(m[1]);
    items.push({ url: `https://mediaserver.prod.realequity.dk/images/${m[1]}/${m[2]}/xl`, pos: m.index ?? 0 });
  }
  if (items.length < 2) return null;
  // The longest unbroken run of images is the gallery; a lone image far away is another home or an advert.
  let best: typeof items = [], run: typeof items = [items[0]];
  for (let i = 1; i < items.length; i++) {
    if (items[i].pos - items[i - 1].pos < 5000) run.push(items[i]);
    else { if (run.length > best.length) best = run; run = [items[i]]; }
  }
  if (run.length > best.length) best = run;
  const first = items[0];
  const list = best.includes(first) ? best : [first, ...best];
  return list.map((x) => ({ url: x.url, kind: "foto" as const }));
}

const JUNK = /logo|favicon|icon|sprite|placeholder|medarbejder|employee|staff|avatar|portrait|\/static\/|_nuxt|wp-content\/themes/i;

function generic(h: string): GalleryImage[] {
  return Array.from(new Set(ogImages(h))).filter((u) => /^https?:\/\//.test(u) && !JUNK.test(u)).map((url) => ({ url, kind: "foto" as const }));
}

export async function gallery(id: string, listingUrl: string | null, fallback: string | null): Promise<GalleryImage[]> {
  const key = `galleri-${createHash("sha1").update(id).digest("hex").slice(0, 24)}`;
  const cached = await readCache<GalleryImage[]>(key, 7 * 24 * 3600 * 1000);
  if (cached?.length) return cached;
  let out: GalleryImage[] = [];
  if (listingUrl && /^https?:\/\//.test(listingUrl)) {
    try {
      const r = await fetch(listingUrl, { headers: { "User-Agent": UA, Accept: "text/html" }, signal: AbortSignal.timeout(9000), redirect: "follow" });
      if (r.ok) {
        const h = unescape(await r.text());
        out = mindworking(h) ?? edc(h) ?? lokalbolig(h) ?? realequity(h) ?? generic(h);
      }
    } catch { /* the agent's site is down or slow: fall back */ }
  }
  const seen = new Set<string>();
  out = out.filter((x) => (seen.has(x.url) ? false : (seen.add(x.url), true)));
  // Plenty of photos, and the floor plans always make it in.
  out = [...out.filter((x) => x.kind === "foto").slice(0, MAX - 6), ...out.filter((x) => x.kind === "plan").slice(0, 6)];
  if (!out.length && fallback) out = [{ url: fallback, kind: "foto" }];
  if (out.length > 1) await writeCache(key, out);
  return out;
}
