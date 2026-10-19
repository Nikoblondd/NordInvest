import staticLinks from "@/data/maegler-links.json";

/*
 * Investor-analysis links for estate agents (nordinvest.io/e/<slug>). The
 * first links were written by hand into maegler-links.json; links that agents
 * create themselves live in the private Storage bucket `member-data`:
 *   links/<slug>.json      the listing's numbers, read by /e/<slug> and the badge
 *   brokers/<userId>.json  the slugs an agent has created, newest first
 *   views/<slug>.json      a simple visit counter
 *   leads/<slug>.json      buyers who wrote to the agent from the analysis
 * Only the server (service role) reads or writes the bucket.
 */

export type BrokerLink = {
  slug: string;
  url: string; // the listing (Ejendomstorvet or the agent's own page)
  price: number;
  rent: number; // net operating income per month (stated yield × price / 12)
  subcat: string | null;
  addr: string;
  imgs?: string[];
  ownerId?: string;
  createdAt?: string;
  legacy?: boolean; // one of the hand-made links in maegler-links.json
  /** Seller's annual operating costs (Ejendomstorvet), floor area and BBR building facts, for the operating budget. */
  opex?: number | null;
  area?: number | null;
  areaSource?: "annonce" | "bbr";
  builtYear?: number | null;
  renovatedYear?: number | null;
  contact?: string; // hand-made links: the listing agent's e-mail, where buyer messages go (never sent to the browser)
};

const BUCKET = "member-data";
const URL_ = () => process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const KEY = () => process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
const h = (json = false) => ({ Authorization: `Bearer ${KEY()}`, apikey: KEY(), ...(json ? { "Content-Type": "application/json" } : {}) });
const configured = () => !!URL_() && !!KEY();
const validSlug = (s: string) => /^[a-z0-9-]{3,90}$/.test(s);
const validId = (id: string) => /^[0-9a-f-]{36}$/i.test(id);

const STATIC = staticLinks as Record<string, Omit<BrokerLink, "slug">>;

export async function getJson<T>(path: string): Promise<T | null> {
  if (!configured()) return null;
  const r = await fetch(`${URL_()}/storage/v1/object/${BUCKET}/${path}`, { headers: h(), cache: "no-store" }).catch(() => null);
  if (!r?.ok) return null;
  return (await r.json().catch(() => null)) as T | null;
}

export async function putJson(path: string, data: unknown): Promise<boolean> {
  if (!configured()) return false;
  const r = await fetch(`${URL_()}/storage/v1/object/${BUCKET}/${path}`, {
    method: "POST",
    headers: { ...h(true), "x-upsert": "true", "cache-control": "no-cache" },
    body: JSON.stringify(data),
  }).catch(() => null);
  return !!r?.ok;
}

async function removeJson(paths: string[]): Promise<boolean> {
  if (!configured()) return false;
  const r = await fetch(`${URL_()}/storage/v1/object/${BUCKET}`, { method: "DELETE", headers: h(true), body: JSON.stringify({ prefixes: paths }) }).catch(() => null);
  return !!r?.ok;
}

/** A link by its slug: the hand-made ones first, then the ones agents created. */
export async function getLink(slug: string): Promise<BrokerLink | null> {
  if (!validSlug(slug)) return null;
  if (STATIC[slug]) return { slug, ...STATIC[slug], legacy: true };
  const l = await getJson<BrokerLink>(`links/${slug}.json`);
  return l && l.price > 0 && l.rent > 0 ? { ...l, slug } : null;
}

export async function listLinks(userId: string): Promise<BrokerLink[]> {
  if (!validId(userId)) return [];
  const slugs = (await getJson<string[]>(`brokers/${userId}.json`)) ?? [];
  const rows = await Promise.all(slugs.map((s) => getLink(s)));
  return rows.filter((r): r is BrokerLink => !!r);
}

/** The hand-made links from the e-mail outreach (shown to admins). */
export function legacyLinks(): BrokerLink[] {
  return Object.entries(STATIC).map(([slug, l]) => ({ slug, ...l, legacy: true }));
}

export function slugify(s: string): string {
  return s.toLowerCase().replace(/æ/g, "ae").replace(/ø/g, "oe").replace(/å/g, "aa")
    .normalize("NFKD").replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 70) || "ejendom";
}

/** "Helligkorsgade 17, 6000 Kolding" → helligkorsgade-17-kolding, made unique. */
export async function freeSlug(addr: string): Promise<string> {
  const parts = addr.split(",").map((p) => p.trim());
  const street = parts[0] ?? addr;
  const city = (parts[parts.length - 1] ?? "").replace(/^\d{4}\s*/, "").replace(/\s+(C|SV|SØ|NØ|NV|N|Ø|V|S|K|J|F|L)$/i, "");
  const base = slugify(`${street} ${parts.length > 1 ? city : ""}`);
  for (let i = 1; i < 50; i++) {
    const s = i === 1 ? base : `${base}-${i}`;
    if (STATIC[s]) continue;
    if (!(await getJson<BrokerLink>(`links/${s}.json`))) return s;
  }
  return `${base}-${Date.now().toString(36)}`;
}

export async function createLink(userId: string, l: Omit<BrokerLink, "slug" | "ownerId" | "createdAt" | "legacy">): Promise<BrokerLink | null> {
  if (!validId(userId)) return null;
  const slug = await freeSlug(l.addr);
  const link: BrokerLink = { ...l, slug, ownerId: userId, createdAt: new Date().toISOString() };
  if (!(await putJson(`links/${slug}.json`, link))) return null;
  const slugs = (await getJson<string[]>(`brokers/${userId}.json`)) ?? [];
  if (!(await putJson(`brokers/${userId}.json`, [slug, ...slugs.filter((s) => s !== slug)]))) return null;
  return link;
}

/** Removes a link the agent created. Hand-made links cannot be removed here. */
export async function deleteLink(userId: string, slug: string, asAdmin = false): Promise<boolean> {
  if (!validId(userId) || !validSlug(slug) || STATIC[slug]) return false;
  const l = await getJson<BrokerLink>(`links/${slug}.json`);
  if (!l) return false;
  if (l.ownerId !== userId && !asAdmin) return false;
  const owner = l.ownerId ?? userId;
  const slugs = (await getJson<string[]>(`brokers/${owner}.json`)) ?? [];
  await putJson(`brokers/${owner}.json`, slugs.filter((s) => s !== slug));
  return removeJson([`links/${slug}.json`, `views/${slug}.json`, `leads/${slug}.json`]);
}

export async function viewCount(slug: string): Promise<number> {
  const v = await getJson<{ n: number }>(`views/${slug}.json`);
  return v?.n ?? 0;
}

/** Counts a visit. Best effort: never slows the page by more than a moment. */
export async function recordView(slug: string): Promise<void> {
  if (!validSlug(slug) || !configured()) return;
  const work = (async () => {
    const n = await viewCount(slug);
    await putJson(`views/${slug}.json`, { n: n + 1, at: new Date().toISOString() });
  })();
  await Promise.race([work, new Promise((r) => setTimeout(r, 900))]).catch(() => null);
}
