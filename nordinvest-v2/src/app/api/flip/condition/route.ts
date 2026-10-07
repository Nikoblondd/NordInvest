/* eslint-disable @typescript-eslint/no-explicit-any */
import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import { fetchImageB64, parseJson } from "@/lib/vision-images";
import { ELEMENTS, type Action } from "@/lib/flip/plan";

/*
 * Flip condition check: the model looks at the listing photos and judges each
 * part of the home (keep, refresh or replace) and says what it saw. It never
 * prices anything; the flip model prices the work from real product prices
 * and trade rates. Anything not visible is reported as not visible.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

const MODEL = process.env.NORDINVEST_VISION_MODEL ?? "claude-opus-5";


const SYSTEM = `Du er en erfaren dansk byggesagkyndig, der hjælper en boligflipper med at vurdere en bolig ud fra salgsannoncens billeder.

Vurder hvert af disse elementer: koekken, bad, gulve, vaegge, doere, vinduer, tag, facade, el, varme.
For hvert element vælger du én handling:
- "keep": i god stand, skal ikke røres for at sælge
- "refresh": slidt eller umoderne, men kan opfriskes (fx male skabe, nye fronter, slibe gulv, nye armaturer)
- "replace": skal udskiftes for at boligen kan sælges som renoveret
- "unseen": elementet er ikke synligt på billederne

REGLER
- Vurder kun det, du kan se. Er et element ikke på billederne, er svaret "unseen". Gæt aldrig.
- Begrund hver vurdering kort med det, du ser (fx "laminatfronter med afslag, ældre emhætte", "brune fliser fra 80'erne", "tagpap med mos").
- Angiv ingen priser.
- Vær realistisk: en køber af en "renoveret" bolig forventer tidssvarende køkken og bad.

Svar UDELUKKENDE med ét JSON-objekt:
{
  "overall": <1-5, 1 = totalrenovering, 5 = nyistandsat>,
  "level": "cosmetic" | "medium" | "total",
  "summary": "<2 sætninger på dansk om boligens stand set med en flippers øjne>",
  "elements": { "<element>": { "action": "keep|refresh|replace|unseen", "note": "<kort begrundelse>" } },
  "warnings": ["<synlige risici, fx fugt, revner, asbestholdigt tag, gammel el-tavle>"],
  "confidence": <0-1>
}`;

// Cut long notes at a word, never mid-word.
const clip = (s: string, n: number) => (s.length <= n ? s : `${s.slice(0, s.lastIndexOf(" ", n) > n * 0.6 ? s.lastIndexOf(" ", n) : n).replace(/[\s,.;:–-]+$/, "")} …`);

const clampAction = (a: any): Action => (["keep", "refresh", "replace", "unseen"].includes(a) ? a : "unseen");

export async function POST(req: Request) {
  if (!process.env.ANTHROPIC_API_KEY) return NextResponse.json({ ok: false, reason: "not_configured" });
  const body = await req.json().catch(() => ({}));
  const urls: string[] = Array.isArray(body?.images) ? body.images.filter((u: any) => typeof u === "string" && /^https?:\/\//.test(u)).slice(0, 12) : [];
  const blocks = (await Promise.all(urls.map((u) => fetchImageB64(u)))).filter((b): b is { media_type: string; data: string } => b !== null).slice(0, 10);
  if (!blocks.length) return NextResponse.json({ ok: false, reason: "no_images" });

  const ctx = [
    body?.address && `Adresse: ${String(body.address).slice(0, 120)}`,
    body?.area && `Boligareal: ${Number(body.area)} m²`,
    body?.yearBuilt && `Opført: ${Number(body.yearBuilt)}`,
  ].filter(Boolean).join("\n");

  try {
    const res = await new Anthropic().messages.create({
      model: MODEL,
      max_tokens: 3000,
      system: SYSTEM,
      messages: [{
        role: "user",
        content: [
          ...blocks.map((b) => ({ type: "image" as const, source: { type: "base64" as const, media_type: b.media_type as any, data: b.data } })),
          { type: "text" as const, text: `${ctx}\n\nVurder boligen element for element. Svar kun med JSON-objektet.` },
        ],
      }],
    });
    const text = (res.content.find((b: any) => b.type === "text") as any)?.text ?? "";
    const raw = parseJson(text);
    if (!raw) return NextResponse.json({ ok: false, reason: "parse_failed" });
    const elements: Record<string, { action: Action; note: string }> = {};
    for (const e of ELEMENTS) {
      const v = raw?.elements?.[e] ?? {};
      elements[e] = { action: clampAction(v.action), note: typeof v.note === "string" ? clip(v.note, 220) : "" };
    }
    const level = ["cosmetic", "medium", "total"].includes(raw?.level) ? raw.level : "medium";
    return NextResponse.json({
      ok: true,
      imagesUsed: blocks.length,
      condition: {
        overall: Math.min(5, Math.max(1, Math.round(Number(raw?.overall) || 3))),
        level,
        summary: typeof raw?.summary === "string" ? raw.summary.slice(0, 400) : null,
        elements,
        warnings: Array.isArray(raw?.warnings) ? raw.warnings.filter((w: any) => typeof w === "string").slice(0, 5).map((w: string) => clip(w, 200)) : [],
        confidence: Math.min(1, Math.max(0, Number(raw?.confidence) || 0.5)),
      },
    });
  } catch (err) {
    console.error("flip condition failed:", (err as Error).message);
    return NextResponse.json({ ok: false, reason: "model_error" });
  }
}
