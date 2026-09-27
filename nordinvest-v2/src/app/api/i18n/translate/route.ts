import { createHash } from "crypto";
import Anthropic from "@anthropic-ai/sdk";

/*
 * Danish -> English for NordInvest's English mode. The browser sends the
 * strings its dictionary doesn't know; we answer from cache when we can and ask
 * Claude for the rest. Every translation is stored (Supabase Storage, bucket
 * "i18n"), so each sentence is translated once for everyone.
 */

export const runtime = "nodejs";
export const maxDuration = 60;

const MODEL = process.env.NORDINVEST_I18N_MODEL ?? "claude-sonnet-5";
const URL_BASE = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const BUCKET = "i18n";
const MAX_ITEMS = 40;
const MAX_CHARS = 16000;

const memory = new Map<string, string>();
const hits = new Map<string, { n: number; at: number }>();

const sh = (extra: Record<string, string> = {}) => ({ apikey: KEY!, Authorization: `Bearer ${KEY}`, ...extra });
const hashOf = (k: string) => createHash("sha1").update(k).digest("hex");

let bucketReady = false;
async function ensureBucket() {
  if (bucketReady || !URL_BASE || !KEY) return;
  await fetch(`${URL_BASE}/storage/v1/bucket`, {
    method: "POST",
    headers: sh({ "Content-Type": "application/json" }),
    body: JSON.stringify({ id: BUCKET, name: BUCKET, public: false }),
  }).catch(() => null);
  bucketReady = true;
}

async function fromStore(k: string): Promise<string | null> {
  if (!URL_BASE || !KEY) return null;
  try {
    const res = await fetch(`${URL_BASE}/storage/v1/object/${BUCKET}/en/${hashOf(k)}.json`, { headers: sh(), cache: "no-store" });
    if (!res.ok) return null;
    const j = (await res.json()) as { k: string; t: string };
    return j.k === k ? j.t : null;
  } catch {
    return null;
  }
}

async function toStore(k: string, t: string) {
  if (!URL_BASE || !KEY) return;
  await ensureBucket();
  await fetch(`${URL_BASE}/storage/v1/object/${BUCKET}/en/${hashOf(k)}.json`, {
    method: "POST",
    headers: sh({ "Content-Type": "application/json", "x-upsert": "true" }),
    body: JSON.stringify({ k, t }),
  }).catch(() => null);
}

const SYSTEM = `You translate the Danish website NordInvest (a property investment analyser for Denmark) into natural, fluent English for international readers who speak no Danish.

Rules:
- Return ONLY a JSON array of strings, one translation per input, in the same order. No commentary.
- Keep every placeholder like ⟦0⟧, ⟦1⟧ exactly as written, the same number of times. They stand for numbers. Put them where the number belongs in the English sentence.
- Inputs that start with <html> are HTML fragments: translate the text, keep every tag and attribute exactly (same tags, same order, same href), and return HTML without the <html> wrapper.
- "kr.", "kr" and "kroner" after a number become "DKK" after the number (e.g. "⟦0⟧ kr." -> "DKK ⟦0⟧"). "kr/md." / "kr. om måneden" -> "DKK/month". "%-point" -> "percentage points". "m²" stays.
- Keep proper nouns as they are: street names, towns (København -> Copenhagen, Aarhus, Odense, Aalborg stay), company and product names (NordInvest, Boligsiden, EDC, Nybolig, home, Danbolig, Airbnb, Stripe, BBR, DAWA, Plandata.dk, Danmarks Statistik -> Statistics Denmark, Skattestyrelsen -> the Danish Tax Agency, Finanstilsynet -> the Danish FSA).
- Product names: "Analyseren" -> "the Analyser" (as a menu item: "Analyser"), "Deal-motor"/"Deal-motoren" -> "Deal Engine", "Analytikeren" -> "the Analyst", "Spil" -> "Game", "Dagens 5" -> "Daily 5", "Fri leg" -> "Free play", "Prisvagt"/"Vagt" -> "Price watch", "Priser" (menu) -> "Pricing".
- Danish property terms: ejerlejlighed -> owner-occupied flat (condo); andelsbolig -> housing co-op flat (andelsbolig); rækkehus -> terraced house; villa -> detached house; sommerhus -> holiday home (sommerhus); fritidsbolig -> holiday home; helårsbolig -> permanent residence; realkredit/realkreditlån -> mortgage (realkredit); udbetaling -> down payment; ydelse -> mortgage payment; afdrag -> principal repayment; friværdi -> home equity; ejerudgift -> owner costs; fællesudgifter -> common charges; grundskyld -> land tax (grundskyld); ejendomsværdiskat -> property value tax; ejendomsvurdering -> property valuation; bundfradrag -> tax-free allowance; lejeindtægt -> rental income; husleje -> rent; markedsleje -> market rent; tomgang -> vacancy; vedligehold -> maintenance; bruttoafkast -> gross yield; nettoafkast -> net yield; kontantafkast -> cash-on-cash return; gældsdækning -> debt service coverage (DSCR); break-even -> break-even; lejereserve -> rent reserve; kloakopland -> sewer catchment area; lokalplan -> local plan; forældrekøb -> parental purchase (forældrekøb); virksomhedsordningen -> the business tax scheme (virksomhedsordningen); kapitalindkomst -> capital income; personlig indkomst -> personal income; gaveafgift -> gift tax; købsomkostninger -> purchase costs; belåningsgrad -> loan-to-value; rente -> interest rate; tinglysning -> land registration.
- Verdicts: "Stærk handel." -> "Strong deal.", "God handel." -> "Good deal.", "Tvivlsom handel." -> "Questionable deal.", "Svag handel." -> "Weak deal.", "Solid handel" -> "Solid deal".
- Use plain, confident, human English. British spelling. Short UI labels stay short (button text stays 1-3 words). Keep capitalisation style of the source (sentence case). Keep emoji and symbols.
- If an input is already English, a name, an address or a code, return it unchanged.
- A context line may follow an input after " ⟪context: ...⟫". Use it only to understand the input; never translate or return the context.`;

function placeholders(s: string) {
  return (s.match(/⟦\d+⟧/g) ?? []).sort().join();
}
function tags(s: string) {
  return (s.match(/<\/?[a-z][a-z0-9]*/gi) ?? []).map((t) => t.toLowerCase()).join();
}

async function translate(items: { k: string; html: boolean; ctx?: string }[]): Promise<Record<string, string>> {
  const client = new Anthropic();
  const input = items.map((it) => {
    const body = it.html ? `<html>${it.k.slice(5)}` : it.k;
    return it.ctx ? `${body} ⟪context: ${it.ctx.slice(0, 240)}⟫` : body;
  });
  const res = await client.messages.create({
    model: MODEL,
    max_tokens: 8000,
    system: SYSTEM,
    messages: [{ role: "user", content: JSON.stringify(input) }],
    thinking: { type: "disabled" },
  } as Anthropic.MessageCreateParamsNonStreaming);
  const text = res.content.map((b) => (b.type === "text" ? b.text : "")).join("");
  const json = text.slice(text.indexOf("["), text.lastIndexOf("]") + 1);
  const arr = JSON.parse(json) as string[];
  const out: Record<string, string> = {};
  items.forEach((it, i) => {
    let t = arr[i];
    if (typeof t !== "string") return;
    t = t.replace(/^<html>/, "").replace(/<\/html>$/, "").trim();
    const src = it.html ? it.k.slice(5) : it.k;
    // Never store a translation that lost a number, invented one, echoed the
    // context or broke the markup.
    if (placeholders(t) !== placeholders(src)) return;
    if (t.includes("⟪") || /context:/i.test(t)) return;
    const digits = (x: string) => /\d/.test(x.replace(/⟦\d+⟧/g, "").replace(/<[^>]+>/g, ""));
    if (digits(t) && !digits(src)) return;
    if (it.html && tags(t) !== tags(src)) return;
    out[it.k] = t;
  });
  return out;
}

export async function POST(req: Request) {
  let body: { items?: { k?: unknown; html?: unknown; ctx?: unknown }[] };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "bad_request" }, { status: 400 });
  }
  const raw = Array.isArray(body.items) ? body.items.slice(0, MAX_ITEMS) : [];
  const items = raw
    .filter((i) => typeof i?.k === "string" && (i.k as string).trim())
    .map((i) => ({ k: String(i.k).slice(0, 6000), html: i.html === true && String(i.k).startsWith("html:"), ctx: typeof i.ctx === "string" ? i.ctx : undefined }));
  if (!items.length) return Response.json({ t: {} });
  if (items.reduce((n, i) => n + i.k.length, 0) > MAX_CHARS) return Response.json({ error: "too_large" }, { status: 413 });

  // Gentle per-IP limit on work that reaches the model (cache hits are free).
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "anon";
  const warm = !!process.env.I18N_WARM_TOKEN && req.headers.get("x-i18n-warm") === process.env.I18N_WARM_TOKEN;

  const t: Record<string, string> = {};
  const missing: typeof items = [];
  await Promise.all(
    items.map(async (it) => {
      const m = memory.get(it.k) ?? (await fromStore(it.k));
      if (m != null) {
        memory.set(it.k, m);
        t[it.k] = m;
      } else missing.push(it);
    }),
  );

  if (missing.length && process.env.ANTHROPIC_API_KEY) {
    const now = Date.now();
    const h = hits.get(ip);
    const used = h && now - h.at < 10 * 60_000 ? h.n : 0;
    if (!warm && used > 600) return Response.json({ t, limited: true });
    hits.set(ip, { n: used + missing.length, at: h && now - h.at < 10 * 60_000 ? h.at : now });
    try {
      const got = await translate(missing);
      await Promise.all(
        Object.entries(got).map(async ([k, v]) => {
          memory.set(k, v);
          t[k] = v;
          await toStore(k, v);
        }),
      );
    } catch {
      /* the browser keeps the Danish text and may ask again on the next page */
    }
  }
  return Response.json({ t }, { headers: { "Cache-Control": "no-store" } });
}
