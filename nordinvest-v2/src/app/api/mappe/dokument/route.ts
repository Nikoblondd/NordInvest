/* eslint-disable @typescript-eslint/no-explicit-any */
import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { parseJson } from "@/lib/vision-images";

/*
 * Reads a property document for the ejendomsmappe: salgsopstilling,
 * tilstandsrapport, ejerforeningens vedtægter, regnskab, referater and so on.
 * The browser extracts the text page by page (the PDF never leaves the user's
 * computer); this route asks the model for the facts, the risks with page and
 * quote, whether renting out is allowed, and the questions to ask. Nothing is
 * stored here; the result is saved in the user's own mappe.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

const MODEL = process.env.NORDINVEST_DOC_MODEL ?? process.env.NORDINVEST_VISION_MODEL ?? "claude-opus-5";
const MAX_CHARS = 180_000;

const SYSTEM = `Du er en erfaren dansk købers rådgiver, der hjælper en privat investor med at læse dokumenterne fra et boligkøb, før investoren byder. Boligen skal typisk lejes ud.

Du får teksten fra ét dokument, side for side, markeret "[Side N]". Det kan være: salgsopstilling, tilstandsrapport, elinstallationsrapport, ejerforeningens vedtægter, regnskab, budget, referat fra generalforsamling, vedligeholdelsesplan, ejerlejlighedsskema, energimærke, lejekontrakt eller andet.

OPGAVE
1. Bestem dokumenttypen.
2. Træk de tal og fakta ud, en investor har brug for (fx kontantpris, ejerudgift, fællesudgift, grundskyld, ejendomsværdiskat, grundfond, foreningens gæld, vedtagne arbejder med beløb og år, ekstraordinære indbetalinger, K2/K3-skader, energimærke, nuværende husleje).
3. Find risici: forhold der kan koste investoren penge, begrænse udlejning eller sænke værdien. Vurder hver: "hoej", "middel" eller "lav".
4. Afgør om udlejning er tilladt, hvis dokumentet siger noget om det (vedtægter, husorden, referater).
5. Skriv de spørgsmål, investoren bør stille mægleren, foreningen eller sin rådgiver.

REGLER
- Brug KUN det, der står i teksten. Gæt aldrig. Står noget ikke i dokumentet, så nævn det ikke.
- Angiv sidetal for hvert fakta og hver risiko. "quote" er et ordret citat fra dokumentet på højst 25 ord.
- Skriv på dansk, i almindelige ord, kort og konkret. Ingen jura-sprog, hvor det kan undgås.
- Beløb skrives som "45.000 kr.".

Svar UDELUKKENDE med ét JSON-objekt:
{
  "type": "salgsopstilling|tilstandsrapport|elinstallationsrapport|vedtaegter|regnskab|budget|referat|vedligeholdelsesplan|ejerlejlighedsskema|energimaerke|lejekontrakt|andet",
  "title": "<kort titel, fx 'Referat, ordinær generalforsamling 2025'>",
  "summary": "<2 sætninger: hvad dokumentet betyder for investoren>",
  "facts": [{ "label": "<fx Fællesudgift>", "value": "<fx 1.850 kr. pr. md.>", "page": <tal eller null> }],
  "risks": [{ "level": "hoej|middel|lav", "title": "<kort>", "detail": "<1-2 sætninger om hvad det betyder for investoren>", "page": <tal eller null>, "quote": "<ordret citat eller null>" }],
  "rental": { "allowed": "ja|nej|betinget|ukendt", "note": "<kort>", "page": <tal eller null> },
  "questions": ["<spørgsmål>"]
}`;

const LEVELS = ["hoej", "middel", "lav"];
const TYPES = ["salgsopstilling", "tilstandsrapport", "elinstallationsrapport", "vedtaegter", "regnskab", "budget", "referat", "vedligeholdelsesplan", "ejerlejlighedsskema", "energimaerke", "lejekontrakt", "andet"];
const str = (v: any, n: number) => (typeof v === "string" ? v.trim().slice(0, n) : "");
const page = (v: any) => (Number.isFinite(Number(v)) && Number(v) > 0 ? Math.round(Number(v)) : null);

export async function POST(req: Request) {
  if (!process.env.ANTHROPIC_API_KEY) return NextResponse.json({ ok: false, reason: "not_configured" });
  // Logged-in users only: every review costs a model call.
  const supabase = createClient();
  const { data: { user } } = supabase ? await supabase.auth.getUser() : { data: { user: null } };
  if (!user) return NextResponse.json({ ok: false, reason: "login" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const pages: string[] = Array.isArray(body?.pages) ? body.pages.filter((p: any) => typeof p === "string") : [];
  let text = pages.map((p, i) => `[Side ${i + 1}]\n${p.replace(/\s+\n/g, "\n").trim()}`).join("\n\n");
  if (text.replace(/\[Side \d+\]/g, "").trim().length < 200) return NextResponse.json({ ok: false, reason: "no_text" });
  const truncated = text.length > MAX_CHARS;
  if (truncated) text = text.slice(0, MAX_CHARS);

  const ctx = [
    body?.name && `Filnavn: ${str(body.name, 120)}`,
    body?.address && `Bolig: ${str(body.address, 120)}`,
    body?.price && `Udbudspris: ${Math.round(Number(body.price)).toLocaleString("da-DK")} kr.`,
    truncated && "Bemærk: dokumentet er afkortet; nævn at resten ikke er gennemgået, hvis det er relevant.",
  ].filter(Boolean).join("\n");

  try {
    const res = await new Anthropic().messages.create({
      model: MODEL,
      max_tokens: 8000,
      system: SYSTEM,
      messages: [{ role: "user", content: `${ctx}\n\n${text}\n\nGennemgå dokumentet. Svar kun med JSON-objektet.` }],
    });
    const raw = parseJson((res.content.find((b: any) => b.type === "text") as any)?.text ?? "");
    if (!raw) return NextResponse.json({ ok: false, reason: "parse_failed" });
    const review = {
      type: TYPES.includes(raw.type) ? raw.type : "andet",
      title: str(raw.title, 120) || str(body?.name, 120) || "Dokument",
      summary: str(raw.summary, 400),
      facts: (Array.isArray(raw.facts) ? raw.facts : []).slice(0, 16).map((f: any) => ({ label: str(f?.label, 60), value: str(f?.value, 120), page: page(f?.page) })).filter((f: any) => f.label && f.value),
      risks: (Array.isArray(raw.risks) ? raw.risks : []).slice(0, 12).map((r: any) => ({ level: LEVELS.includes(r?.level) ? r.level : "middel", title: str(r?.title, 100), detail: str(r?.detail, 300), page: page(r?.page), quote: str(r?.quote, 220) || null })).filter((r: any) => r.title)
        .sort((a: any, b: any) => LEVELS.indexOf(a.level) - LEVELS.indexOf(b.level)),
      rental: raw.rental && ["ja", "nej", "betinget", "ukendt"].includes(raw.rental.allowed) ? { allowed: raw.rental.allowed, note: str(raw.rental.note, 240), page: page(raw.rental.page) } : null,
      questions: (Array.isArray(raw.questions) ? raw.questions : []).map((q: any) => str(q, 200)).filter(Boolean).slice(0, 8),
    };
    return NextResponse.json({ ok: true, review });
  } catch (e: any) {
    return NextResponse.json({ ok: false, reason: "model_error", message: String(e?.message ?? e).slice(0, 160) });
  }
}
