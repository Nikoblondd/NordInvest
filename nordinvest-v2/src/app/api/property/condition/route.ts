/* eslint-disable @typescript-eslint/no-explicit-any */
import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import { fetchImageB64, parseJson } from "@/lib/vision-images";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120; // vision analysis can take a while — don't let Vercel cut it off

const MODEL = process.env.NORDINVEST_VISION_MODEL ?? "claude-opus-5";

// The whole point of Fase 2: make the estimate as PRECISE and RELIABLE as
// possible. We do that with four guardrails, not by trusting the model blindly:
//   1. Grounding   — feed it the official BBR facts (byggeår, m², area) as context.
//   2. Price anchors — give it real Danish cost ranges so numbers aren't invented.
//   3. Structured   — demand a strict JSON shape.
//   4. Clamp        — validate & clamp every number server-side before it ships,
//                     and the user reviews/edits everything (human-in-the-loop).

const SYSTEM = `Du er en erfaren dansk byggesagkyndig og ejendomsvurderingsekspert. Du vurderer en boligs stand og renoveringsbehov ud fra annoncefotos, til brug for en investeringsanalyse.

VIGTIGE REGLER — følg dem nøje:
- Vurder KUN det, du faktisk kan se på billederne. Opfind aldrig rum eller detaljer, der ikke er vist.
- Vær konservativ og realistisk. Hellere et forsigtigt estimat end et optimistisk.
- Hvis billederne er få eller uklare, så sæt en LAVERE "confidence".
- Brug de danske referencepriser herunder som ankre. Afvig kun med god grund og hold dig inden for realistiske danske håndværkerpriser.
- Alle priser i danske kroner (DKK).

DANSKE REFERENCEPRISER (2026):
- Nyt køkken: 60.000–180.000 kr
- Nyt badeværelse: 80.000–160.000 kr
- Gulvafslibning: 250–450 kr/m² · nyt trægulv: 600–1.200 kr/m²
- Maling af vægge/lofter: 120–220 kr/m²
- Nye vinduer: 4.000–9.000 kr/stk
- Nyt tag: 1.000–1.800 kr/m²
- El-arbejde (tavle/stikkontakter): 8.000–40.000 kr
- VVS-arbejde: 10.000–50.000 kr
- Isolering: 200–600 kr/m²

STANDSKALA (overallCondition): 1 = totalrenovering nødvendig · 2 = omfattende · 3 = middel/slidt · 4 = pæn stand, mindre ting · 5 = nyistandsat.

Svar UDELUKKENDE med ét gyldigt JSON-objekt (ingen tekst udenom, ingen markdown) med præcis denne struktur:
{
  "overallCondition": <1-5>,
  "conditionLabel": "<kort dansk label, fx 'Middel – trænger til køkken og bad'>",
  "rooms": [{ "room": "<rum>", "condition": <1-5>, "note": "<kort observation>" }],
  "renovationItems": [{ "label": "<post>", "costLow": <kr>, "costHigh": <kr>, "priority": "høj|middel|lav" }],
  "rentUpliftPct": <0-40, estimeret lejeforøgelse efter renovering i %>,
  "valueUpliftPct": <0-60, estimeret værdiforøgelse i %>,
  "confidence": <0-1, hvor sikker vurderingen er ud fra billederne>,
  "summary": "<1-2 sætninger på dansk>"
}`;

const clamp = (n: any, lo: number, hi: number, fallback: number | null = null) => {
  const x = Number(n);
  if (!Number.isFinite(x)) return fallback;
  return Math.min(hi, Math.max(lo, x));
};

function sanitize(raw: any) {
  const rooms = Array.isArray(raw?.rooms) ? raw.rooms : [];
  const items = Array.isArray(raw?.renovationItems) ? raw.renovationItems : [];
  return {
    overallCondition: clamp(raw?.overallCondition, 1, 5, 3),
    conditionLabel: typeof raw?.conditionLabel === "string" ? raw.conditionLabel.slice(0, 80) : null,
    rooms: rooms
      .slice(0, 12)
      .map((r: any) => ({
        room: String(r?.room ?? "").slice(0, 40),
        condition: clamp(r?.condition, 1, 5, 3),
        note: typeof r?.note === "string" ? r.note.slice(0, 140) : "",
      }))
      .filter((r: any) => r.room),
    renovationItems: items
      .slice(0, 15)
      .map((it: any) => {
        let low = clamp(it?.costLow, 0, 2_000_000, 0) ?? 0;
        let high = clamp(it?.costHigh, 0, 2_000_000, low) ?? low;
        if (high < low) [low, high] = [high, low];
        const p = String(it?.priority ?? "middel").toLowerCase();
        return {
          label: String(it?.label ?? "").slice(0, 60),
          costLow: Math.round(low),
          costHigh: Math.round(high),
          priority: ["høj", "middel", "lav"].includes(p) ? p : "middel",
        };
      })
      .filter((it: any) => it.label && it.costHigh > 0),
    rentUpliftPct: clamp(raw?.rentUpliftPct, 0, 40, 0),
    valueUpliftPct: clamp(raw?.valueUpliftPct, 0, 60, 0),
    confidence: clamp(raw?.confidence, 0, 1, 0.5),
    summary: typeof raw?.summary === "string" ? raw.summary.slice(0, 300) : null,
  };
}

export async function POST(req: Request) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ ok: false, reason: "not_configured" }, { status: 200 });
  }

  const body = await req.json().catch(() => ({}));
  const urls: string[] = Array.isArray(body?.images)
    ? body.images.filter((u: any) => typeof u === "string" && /^https?:\/\//.test(u)).slice(0, 8)
    : [];
  if (urls.length === 0) {
    return NextResponse.json({ ok: false, reason: "no_images" }, { status: 200 });
  }

  // Fetch the photos ourselves (browser UA) and send as base64 — far more
  // reliable than asking Anthropic to fetch portal CDNs that block hotlinking.
  const fetched = await Promise.all(urls.map((u) => fetchImageB64(u)));
  const imageBlocks = fetched.filter((b): b is { media_type: string; data: string } => b !== null).slice(0, 6);
  if (imageBlocks.length === 0) {
    return NextResponse.json({ ok: false, reason: "no_images" }, { status: 200 });
  }

  // Grounding context from BBR + the listing.
  const ctx: string[] = [];
  if (body?.address) ctx.push(`Adresse: ${String(body.address).slice(0, 120)}`);
  if (body?.area) ctx.push(`Boligareal: ${Number(body.area)} m²`);
  if (body?.byggeaar) ctx.push(`Byggeår (BBR): ${Number(body.byggeaar)}`);
  if (body?.rooms) ctx.push(`Værelser: ${Number(body.rooms)}`);
  const context = ctx.length ? `Kendte fakta om boligen:\n${ctx.join("\n")}` : "Ingen kendte fakta.";

  const client = new Anthropic();

  try {
    const res = await client.messages.create({
      model: MODEL,
      max_tokens: 6000,
      system: SYSTEM,
      messages: [
        {
          role: "user",
          content: [
            ...imageBlocks.map((b) => ({
              type: "image" as const,
              source: { type: "base64" as const, media_type: b.media_type as any, data: b.data },
            })),
            {
              type: "text" as const,
              text: `${context}\n\nVurder boligens stand og renoveringsbehov ud fra billederne. Svar kun med JSON-objektet.`,
            },
          ],
        },
      ],
    });

    const textBlock = res.content.find((b: any) => b.type === "text") as any;
    const parsed = textBlock ? parseJson(textBlock.text) : null;
    if (!parsed) {
      return NextResponse.json({ ok: false, reason: "parse_failed" }, { status: 200 });
    }

    return NextResponse.json({ ok: true, model: MODEL, imagesUsed: imageBlocks.length, analysis: sanitize(parsed) });
  } catch (err) {
    console.error("condition analysis failed:", (err as Error).message);
    return NextResponse.json({ ok: false, reason: "model_error" }, { status: 200 });
  }
}
