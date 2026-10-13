/* eslint-disable @typescript-eslint/no-explicit-any */
import Anthropic from "@anthropic-ai/sdk";
import { MUNICIPALITIES } from "@/lib/kommuner";
import { EMPTY_CRITERIA, SUBCATS, TYPES, cleanCriteria, cleanStrategy, type Criteria, type Hit, type HitAi, type Strategy } from "./agents";

/*
 * Server only: the search agents' intelligence.
 *  1. parseBrief: "en 3-værelses i Aarhus C til forældrekøb under 2,5 mio."
 *     becomes criteria, a strategy and a name (Claude, with a rule-based
 *     fallback so it always answers).
 *  2. signals + fit: plain facts an investor scans for (price cut, cheap per
 *     m² for the postnummer, long on the market, renovation potential) and a
 *     0-100 fit for the agent's strategy. Deterministic, no AI needed.
 *  3. reviewHits: a short Danish take and the main risk for the best new
 *     matches, written by Claude from the numbers (rules when AI is offline).
 */

const MODEL = process.env.NORDINVEST_AGENT_MODEL ?? process.env.NORDINVEST_ANALYST_MODEL ?? "claude-sonnet-5";
const client = () => (process.env.ANTHROPIC_API_KEY ? new Anthropic() : null);
const kr = (n: number) => `${Math.round(n).toLocaleString("da-DK")} kr.`;

/** Calls Claude with one tool and returns the tool input (structured output). */
async function structured(system: string, user: string, tool: { name: string; description: string; input_schema: any }, maxTokens = 1200): Promise<any | null> {
  const c = client();
  if (!c) return null;
  try {
    const res: any = await c.messages.create({
      model: MODEL,
      max_tokens: maxTokens,
      system,
      tools: [tool],
      tool_choice: { type: "tool", name: tool.name },
      messages: [{ role: "user", content: user }],
    } as any);
    const block = (res.content ?? []).find((b: any) => b.type === "tool_use");
    return block?.input ?? null;
  } catch {
    return null;
  }
}

/* ---------- 1. Plain Danish to criteria ---------- */

export type ParsedBrief = { criteria: Criteria; strategy: Strategy; name: string; summary: string; by: "ai" | "regler" };

const slugByName = new Map(MUNICIPALITIES.map((m) => [m.name.toLowerCase(), m.slug]));

export async function parseBrief(text: string): Promise<ParsedBrief> {
  const brief = text.trim().slice(0, 600);
  const kommuner = MUNICIPALITIES.map((m) => `${m.name}=${m.slug}`).join(", ");
  const out = await structured(
    `Du oversætter en dansk ejendomsinvestors ønske til søgekriterier i NordInvest. Svar kun via værktøjet.
Strategier: udlejning (købe for at leje ud, cash flow), familie (forældrekøb eller egen familiebolig), flip (købe billigt, renovere, sælge), erhverv (erhvervs- og udlejningsejendomme).
Boligtyper: ${TYPES.map((t) => `${t.id}=${t.label}`).join(", ")}. Erhvervstyper: ${SUBCATS.join(", ")}.
Kommuner (navn=slug): ${kommuner}. Nævner investoren en by eller bydel, så brug kommunen (fx Aarhus C = aarhus, Frederiksberg = frederiksberg, Nørrebro = koebenhavn).
Beløb er i kroner: "2,5 mio." = 2500000. Sæt kun felter, investoren faktisk siger noget om, ellers null. Gæt aldrig et minimumskrav til score.
name: et kort navn på dansk, fx "3-værelses i Aarhus til forældrekøb". summary: én sætning på dansk om, hvad agenten holder øje med.`,
    brief,
    {
      name: "kriterier",
      description: "Søgekriterier for agenten",
      input_schema: {
        type: "object",
        properties: {
          strategy: { type: "string", enum: ["udlejning", "familie", "flip", "erhverv"] },
          municipalities: { type: "array", items: { type: "string" } },
          type: { type: ["string", "null"], enum: [...TYPES.map((t) => t.id), null] },
          subcat: { type: ["string", "null"] },
          priceMin: { type: ["number", "null"] },
          priceMax: { type: ["number", "null"] },
          areaMin: { type: ["number", "null"] },
          roomsMin: { type: ["number", "null"] },
          minYield: { type: ["number", "null"] },
          minCashflow: { type: ["number", "null"] },
          name: { type: "string" },
          summary: { type: "string" },
        },
        required: ["strategy", "municipalities", "name", "summary"],
      },
    },
    700,
  );
  if (out) {
    const strategy = cleanStrategy(out.strategy) ?? "udlejning";
    const criteria = cleanCriteria({
      ...EMPTY_CRITERIA,
      ...out,
      market: strategy === "erhverv" ? "investering" : "bolig",
      type: out.type ?? (strategy === "familie" ? "condo" : "condo"),
      minScore: null,
    });
    return { criteria, strategy, name: String(out.name ?? "").slice(0, 80) || "Min søgeagent", summary: String(out.summary ?? "").slice(0, 240), by: "ai" };
  }
  return parseRules(brief);
}

/** Without AI: picks up kommuner, type, strategy words and amounts from the text. */
function parseRules(text: string): ParsedBrief {
  const t = text.toLowerCase();
  const strategy: Strategy = /erhverv|butik|kontor|lager|udlejningsejendom/.test(t) ? "erhverv" : /flip|renover|istandsæt|sælge igen/.test(t) ? "flip" : /forældrekøb|familie|børn|barn|egen bolig/.test(t) ? "familie" : "udlejning";
  const municipalities = Array.from(slugByName.entries()).filter(([name]) => new RegExp(`\\b${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`).test(t)).map(([, slug]) => slug);
  const type = /villa|hus\b/.test(t) ? "villa" : /rækkehus/.test(t) ? "terraced house" : /andel/.test(t) ? "cooperative" : "condo";
  const amount = (re: RegExp) => { const m = t.match(re); if (!m) return null; const n = Number(m[1].replace(/\./g, "").replace(",", ".")); return /mio/.test(m[0]) ? n * 1e6 : n; };
  const priceMax = amount(/(?:under|max(?:imalt)?|op til|højst)\s*([\d.,]+)\s*(?:mio|million)/);
  const priceMin = amount(/(?:over|mindst|fra)\s*([\d.,]+)\s*(?:mio|million)/);
  const rooms = t.match(/(\d)\s*-?\s*(?:vær|værelses)/);
  const area = t.match(/(\d{2,4})\s*(?:m2|m²|kvm)/);
  const criteria = cleanCriteria({ ...EMPTY_CRITERIA, market: strategy === "erhverv" ? "investering" : "bolig", municipalities, type, priceMin, priceMax: priceMax ?? EMPTY_CRITERIA.priceMax, roomsMin: rooms ? Number(rooms[1]) : null, areaMin: area ? Number(area[1]) : null, minScore: null });
  const where = municipalities.length ? MUNICIPALITIES.find((m) => m.slug === municipalities[0])?.name : "hele landet";
  return { criteria, strategy, name: `${strategy === "erhverv" ? "Erhverv" : TYPES.find((x) => x.id === type)?.label ?? "Bolig"} i ${where}`, summary: "", by: "regler" };
}

/* ---------- 2. Signals and fit ---------- */

const median = (xs: number[]) => { if (!xs.length) return null; const s = [...xs].sort((a, b) => a - b); const m = Math.floor(s.length / 2); return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };

/** Adds kr/m², the postnummer median among today's matches, signals and a strategy fit to every hit. */
export function enrich(hits: Hit[], peers: { zip: number; price: number; area: number | null }[], strategy: Strategy): Hit[] {
  const byZip = new Map<number, number[]>();
  for (const p of peers) if (p.area && p.area > 15 && p.price > 0) byZip.set(p.zip, [...(byZip.get(p.zip) ?? []), p.price / p.area]);
  return hits.map((h) => {
    const sqm = h.area && h.area > 15 ? Math.round(h.price / h.area) : null;
    const zipList = byZip.get(h.zip) ?? [];
    const zipSqm = zipList.length >= 4 ? Math.round(median(zipList)!) : null;
    const below = sqm && zipSqm ? (zipSqm - sqm) / zipSqm : null;
    const signals: string[] = [];
    if (h.priceChangePct != null && h.priceChangePct <= -2) signals.push(`Prisen er sat ${Math.abs(Math.round(h.priceChangePct))} % ned`);
    if (below != null && below >= 0.08) signals.push(`${Math.round(below * 100)} % under kvm-prisen i ${h.zip}`);
    if (h.daysOnMarket != null && h.daysOnMarket >= 90) signals.push(`${h.daysOnMarket} dage til salg`);
    if (strategy !== "erhverv" && h.cashFlow > 0) signals.push("Positivt cash flow");
    if (strategy === "flip" && h.yearBuilt && h.yearBuilt < 1980) signals.push(`Bygget ${h.yearBuilt}`);
    if (strategy === "flip" && h.energy && "DEFG".includes(h.energy)) signals.push(`Energimærke ${h.energy}`);

    let fit = h.score;
    if (strategy === "udlejning") fit = h.score * 0.7 + (h.cashFlow > 0 ? 25 : Math.max(0, 25 + h.cashFlow / 100)) + (below ? Math.max(0, below * 30) : 0);
    if (strategy === "familie") fit = 45 + (below ? below * 120 : 0) + ((h.rooms ?? 0) >= 3 ? 12 : 0) + ((h.area ?? 0) >= 70 ? 8 : 0) + (h.priceChangePct && h.priceChangePct < 0 ? 8 : 0);
    if (strategy === "flip") fit = 35 + (below ? below * 150 : 0) + (h.yearBuilt && h.yearBuilt < 1980 ? 10 : 0) + (h.energy && "DEFG".includes(h.energy) ? 10 : 0) + ((h.daysOnMarket ?? 0) >= 90 ? 8 : 0) + (h.priceChangePct && h.priceChangePct < 0 ? 8 : 0);
    if (strategy === "erhverv") fit = h.score * 0.8 + Math.max(0, Math.min(20, (h.capRate - 4) * 6));
    return { ...h, sqm, zipSqm, signals, fit: Math.max(0, Math.min(100, Math.round(fit))) };
  });
}

/* ---------- 3. The AI's take ---------- */

const STRATEGY_TEXT: Record<Strategy, string> = {
  udlejning: "køber for at leje ud og vil have cash flow og afkast",
  familie: "køber en familiebolig eller laver forældrekøb og vil have en god pris og en bolig, der holder værdien",
  flip: "køber for at renovere og sælge og vil have en lav pris pr. m² og plads til at skabe værdi",
  erhverv: "køber erhvervs- eller udlejningsejendomme og vil have et sundt, holdbart afkast",
};

export async function reviewHits(hits: Hit[], strategy: Strategy, brief?: string): Promise<Map<string, HitAi>> {
  const out = new Map<string, HitAi>();
  if (!hits.length) return out;
  const lines = hits.map((h) => [
    `id=${h.id}`, `${h.road}, ${h.zip} ${h.city}`, `pris ${kr(h.price)}`, h.area ? `${h.area} m²` : "", h.rooms ? `${h.rooms} vær.` : "",
    h.sqm ? `${h.sqm.toLocaleString("da-DK")} kr./m²` : "", h.zipSqm ? `median i postnummeret ${h.zipSqm.toLocaleString("da-DK")} kr./m²` : "",
    `cash flow ${Math.round(h.cashFlow)} kr./md. ved 20 % udbetaling og 5 % rente`, `afkast ${h.capRate.toFixed(1)} %`, `score ${h.score}`,
    h.yearBuilt ? `bygget ${h.yearBuilt}` : "", h.energy ? `energimærke ${h.energy}` : "", h.priceChangePct ? `prisændring ${Math.round(h.priceChangePct)} %` : "", h.daysOnMarket ? `${h.daysOnMarket} dage til salg` : "",
  ].filter(Boolean).join("; ")).join("\n");
  const res = await structured(
    `Du er en erfaren dansk ejendomsinvestor, der screener nye boliger for en kunde, der ${STRATEGY_TEXT[strategy]}.${brief ? ` Kundens egne ord: "${brief}".` : ""}
For hver bolig: fit 0-100 (hvor godt den passer kunden), take: én konkret sætning på dansk om, hvorfor den er værd at kigge på eller ej, med tal. risk: den vigtigste ting at tjekke, kort. Ingen floskler, ingen tankestreger, skriv som en rådgiver taler. Brug kun tallene, du får.`,
    lines,
    {
      name: "vurderinger",
      description: "Vurdering af hver bolig",
      input_schema: {
        type: "object",
        properties: { items: { type: "array", items: { type: "object", properties: { id: { type: "string" }, fit: { type: "number" }, take: { type: "string" }, risk: { type: "string" } }, required: ["id", "fit", "take", "risk"] } } },
        required: ["items"],
      },
    },
    1400,
  );
  if (Array.isArray(res?.items)) {
    for (const it of res.items) {
      if (!it?.id || !hits.some((h) => h.id === it.id)) continue;
      out.set(String(it.id), { fit: Math.max(0, Math.min(100, Math.round(Number(it.fit) || 0))), take: String(it.take ?? "").slice(0, 280), risk: String(it.risk ?? "").slice(0, 200), by: "ai" });
    }
  }
  // Rules for anything the AI did not answer.
  for (const h of hits) if (!out.has(h.id)) out.set(h.id, ruleTake(h, strategy));
  return out;
}

function ruleTake(h: Hit, strategy: Strategy): HitAi {
  const below = h.sqm && h.zipSqm ? Math.round(((h.zipSqm - h.sqm) / h.zipSqm) * 100) : null;
  const cf = `${h.cashFlow >= 0 ? "+" : "-"}${Math.abs(Math.round(h.cashFlow)).toLocaleString("da-DK")} kr./md.`;
  let take = "";
  if (strategy === "udlejning" || strategy === "erhverv") take = `${h.cashFlow >= 0 ? "Betaler sig selv" : "Kræver tilskud"} med ${cf} og ${h.capRate.toFixed(1).replace(".", ",")} % afkast${below && below > 0 ? `, og prisen pr. m² er ${below} % under området` : ""}.`;
  if (strategy === "familie") take = below != null ? `${below > 0 ? `${below} % billigere` : `${Math.abs(below)} % dyrere`} pr. m² end andre boliger i ${h.zip}${h.rooms ? `, ${h.rooms} værelser` : ""}.` : `Pris ${kr(h.price)}${h.rooms ? ` for ${h.rooms} værelser` : ""}.`;
  if (strategy === "flip") take = below != null && below > 0 ? `Købes ${below} % under kvm-prisen i ${h.zip}, så der er plads til en renovering${h.yearBuilt ? ` af en bolig fra ${h.yearBuilt}` : ""}.` : "Prisen pr. m² ligger på niveau med området, så gevinsten skal komme fra renoveringen alene.";
  const risk = h.priceChangePct && h.priceChangePct < 0 ? "Spørg mægleren, hvorfor prisen er sat ned." : (h.daysOnMarket ?? 0) >= 90 ? "Længe til salg: find ud af, hvad der holder købere væk." : strategy === "flip" ? "Få en håndværker med til fremvisningen og prissæt renoveringen." : "Bekræft lejen og fællesudgifterne i salgsopstillingen.";
  return { fit: h.fit ?? h.score, take, risk, by: "regler" };
}
