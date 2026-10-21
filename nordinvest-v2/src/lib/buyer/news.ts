/* eslint-disable @typescript-eslint/no-explicit-any */
import Anthropic from "@anthropic-ai/sdk";
import { MUNICIPALITIES } from "@/lib/kommuner";
import { readCache, writeCache } from "@/lib/app/store";

/*
 * Server only. What is happening in a kommune, from local news and the
 * kommune's own pages: new building projects, a new shopping centre, a
 * station, a school, a big employer arriving or leaving. Claude searches the
 * web and returns each item with its source, so every line can be checked.
 * Cached per kommune for a week; nothing is shown without a source link.
 */

export type NewsItem = { title: string; what: string; date: string | null; source: string; url: string; effect: "positiv" | "negativ" | "neutral" };
export type AreaNews = { kommune: string; name: string; summary: string; outlook: "vaekst" | "stabil" | "tilbagegang" | "ukendt"; items: NewsItem[]; checkedAt: string };

const MODEL = process.env.NORDINVEST_NEWS_MODEL ?? process.env.NORDINVEST_ANALYST_MODEL ?? "claude-sonnet-5";
const WEEK = 7 * 24 * 3600 * 1000;
const inflight = new Map<string, Promise<AreaNews | null>>();

/** Fresh news without waiting: the cached copy if there is one (any age up to a week), else null. */
export async function cachedNews(slug: string): Promise<AreaNews | null> {
  return readCache<AreaNews>(`omraade-${slug}`, WEEK);
}

/**
 * Keeps every kommune's news ready, so nobody waits a minute for a web search:
 * refreshes up to `max` kommuner whose copy is missing or older than six days.
 * Called by a cron every hour.
 */
export async function warmNews(max = 3): Promise<string[]> {
  if (!process.env.ANTHROPIC_API_KEY) return [];
  const start = (new Date().getUTCHours() * 7) % MUNICIPALITIES.length;
  const order = [...MUNICIPALITIES.slice(start), ...MUNICIPALITIES.slice(0, start)];
  const stale: { slug: string; name: string }[] = [];
  for (const k of order) {
    if (stale.length >= max) break;
    if (!(await readCache<AreaNews>(`omraade-${k.slug}`, 6 * 24 * 3600 * 1000))) stale.push(k);
  }
  await Promise.all(stale.map((k) => fetchNews(k.slug, k.name)));
  return stale.map((k) => k.slug);
}

export async function areaNews(slug: string): Promise<AreaNews | null> {
  const k = MUNICIPALITIES.find((m) => m.slug === slug);
  if (!k) return null;
  const cached = await readCache<AreaNews>(`omraade-${slug}`, WEEK);
  if (cached) return cached;
  if (!process.env.ANTHROPIC_API_KEY) return null;
  if (!inflight.has(slug)) inflight.set(slug, fetchNews(slug, k.name).finally(() => inflight.delete(slug)));
  return inflight.get(slug)!;
}

async function fetchNews(slug: string, name: string): Promise<AreaNews | null> {
  const today = new Date().toISOString().slice(0, 10);
  const system = `Du researcher byudvikling i danske kommuner for boligkøbere. Brug web search. Find KONKRETE, nylige (helst de seneste 18 måneder, i dag er ${today}) nyheder om ${name} Kommune, der påvirker, om området bliver mere eller mindre attraktivt at bo i: nye byggeprojekter og boligområder, nye butikker eller indkøbscentre, ny infrastruktur (station, letbane, metro, vej, cykelsti), skoler og institutioner, store arbejdspladser der åbner eller lukker, byfornyelse. Brug lokale medier, kommunens hjemmeside og landsdækkende medier. Skriv på dansk, kort og sagligt, uden at overdrive. Medtag kun ting, du har en kilde-URL til fra din søgning. Svar til sidst KUN med JSON i dette format, uden markdown:
{"summary":"2-3 sætninger om retningen for kommunen","outlook":"vaekst|stabil|tilbagegang|ukendt","items":[{"title":"kort overskrift","what":"1-2 sætninger: hvad og hvor","date":"YYYY-MM eller null","source":"mediets navn","url":"https://...","effect":"positiv|negativ|neutral"}]}
Højst 8 punkter, nyeste og vigtigste først.`;
  try {
    const client = new Anthropic();
    const messages: any[] = [{ role: "user", content: `Hvad sker der i ${name} Kommune lige nu, som en boligkøber bør kende til?` }];
    let res: any = null;
    // A long search can pause the turn; send it back to let it finish (at most twice).
    for (let i = 0; i < 3; i++) {
      res = await client.messages.create({
        model: MODEL,
        max_tokens: 4000,
        system,
        tools: [{ type: "web_search_20250305", name: "web_search", max_uses: 4 } as any],
        messages,
      } as any);
      if (res.stop_reason !== "pause_turn") break;
      messages.push({ role: "assistant", content: res.content });
    }
    const text = (res?.content ?? []).filter((b: any) => b.type === "text").map((b: any) => b.text).join("\n");
    const json = text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1);
    const d = JSON.parse(json);
    const items: NewsItem[] = (Array.isArray(d.items) ? d.items : [])
      .filter((i: any) => typeof i?.url === "string" && /^https?:\/\//.test(i.url) && i.title)
      .slice(0, 8)
      .map((i: any) => ({
        title: String(i.title).slice(0, 140), what: String(i.what ?? "").slice(0, 400), date: i.date ? String(i.date).slice(0, 10) : null,
        source: String(i.source ?? new URL(i.url).hostname.replace(/^www\./, "")).slice(0, 60), url: i.url,
        effect: ["positiv", "negativ", "neutral"].includes(i.effect) ? i.effect : "neutral",
      }));
    const out: AreaNews = {
      kommune: slug, name,
      summary: String(d.summary ?? "").slice(0, 600),
      outlook: ["vaekst", "stabil", "tilbagegang"].includes(d.outlook) ? d.outlook : "ukendt",
      items, checkedAt: new Date().toISOString(),
    };
    if (items.length || out.summary) await writeCache(`omraade-${slug}`, out);
    return out;
  } catch (e) {
    console.error("area news failed", slug, (e as Error).message);
    return null;
  }
}
