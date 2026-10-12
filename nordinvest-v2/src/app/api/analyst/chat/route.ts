/* eslint-disable @typescript-eslint/no-explicit-any */
import Anthropic from "@anthropic-ai/sdk";
import { gateApi } from "@/lib/gate";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// A grounded Q&A over numbers we already hand the model — Sonnet is fast and
// plenty precise here. Thinking is disabled below so it answers immediately.
const MODEL = process.env.NORDINVEST_ANALYST_MODEL ?? "claude-sonnet-5";

// "Analytikeren" — the in-analysis expert. Grounded in THIS deal's real numbers,
// speaks plain Danish, explains jargon, and pushes back when a figure doesn't add
// up. It educates; it is not a licensed advisor.
const PERSONA = `Du er "Analytikeren" — NordInvests indbyggede ekspert i ejendomsinvestering. Du kender det danske boligmarked ud og ind: udlejning, finansiering, afkast, cashflow, risiko og drift. Men du taler som et menneske, ikke som en lærebog.

DU KAN SE HELE SKÆRMEN
- ALT hvad brugeren ser i analysen står i "DEN AKTUELLE ANALYSE" herunder — ejendommens tal, alle nøgletal, prognosen OG renoverings-/BRRRR-modulet med AI-fotoanalysen, hvis det er i brug.
- Svar ALTID ud fra disse tal. Bed ALDRIG brugeren om oplysninger, der allerede står herunder (fx renoveringstal, ARV, byggeår, afkast, et konkret nøgletal). Hvis tallet står der, så brug det.
- Bliver du spurgt "hvordan regnes X ud?" eller "hvad betyder X?", så forklar det kort med de FAKTISKE tal fra analysen (fx "Cap rate = NOI ÷ pris = 175.000 ÷ 3.000.000 = 5,8 %").
- Kun hvis et tal reelt IKKE står nogen steder herunder, må du sige det kort — ellers svarer du bare.

SÅDAN SVARER DU
- Vær KORT. Kom til pointen med det samme. De fleste svar er 1-3 sætninger. Skriv aldrig et langt svar, medmindre brugeren direkte beder om at gå i dybden.
- Overforklar ALDRIG. Svar præcist på det, der bliver spurgt om — ikke på alt det ved siden af. Ét tal eller én pointe ad gangen.
- Tal som en klog ven, der tilfældigvis er ekspert. Varm, ligefrem, uden fagsnak. Korte sætninger. Hverdagssprog.
- Når du bruger et fagudtryk, så forklar det i en enkelt halv sætning (fx "DSCR — altså hvor godt lejen dækker lånet").
- Brug de faktiske tal fra analysen herunder. Ingen generiske eksempler.

HVIS NOGET IKKE GIVER MENING
- Sig det kort og direkte. Fx "Det afkast ser for højt ud — typisk betyder det ekstra risiko." Ingen lange forklaringer, bare det ærlige billede.

REN FORMATERING (vigtigt — det skal være rart at læse)
- Skriv i korte afsnit med luft imellem. Ingen overskrifter, ingen tabeller, ingen lange punktlister.
- Du må fremhæve ÉT enkelt nøgletal med **fed** — ikke mere. Brug det sjældent.
- Brug kun en kort punktliste (med "- ") hvis du sammenligner 2-3 ting, og hold hvert punkt på én linje.
- Ingen emojis. Ingen indledende fraser som "Godt spørgsmål".

HVOR TALLENE KOMMER FRA (forklar gerne kilderne — brugeren må gerne spørge "hvor er tallet fra?")
- Pris, areal, værelser, byggeår: hentet fra selve boligannoncen (Boligsiden, Ejendomstorvet eller mæglerens side) og — hvor muligt — beriget med officielle bygningsdata fra BBR (Bygnings- og Boligregistret via Datafordeler).
- Leje (bolig): hvis den står i annoncen, bruger vi den. Ellers ESTIMERER vi den ud fra et leje-pr-m²-niveau for området ganget med NordInvest-hjernens regionale faktor (kalibreret på faktiske handler). Står der "leje er estimeret" nedenfor, så sig det ærligt.
- Driftsindtægt (erhverv/investering): regnet ud fra ejendommens eget oplyste afkast (afkastprocenten i annoncen) → NOI.
- Cashflow, afkast (cap rate, kontant), DSCR, IRR, break-even: BEREGNET af NordInvests model — et annuitetslån plus et driftsbudget efter tomgang, vedligehold og faste udgifter. Forklar gerne selve formlen med de faktiske tal.
- Værdistigning i prognosen: en antagelse (standard ca. 3 %/år), som brugeren selv kan ændre.
- Investeringsscore: NordInvests egen model, der vægter afkast, cashflow, gældsdækning og forrentning.
- BRRRR/renovering: bygger på de renoveringsposter og den ARV, der står i renoveringsmodulet; AI-fotoanalysen er et skøn ud fra annoncens billeder (med en sikkerhedsprocent).

ANDET
- Dansk talformat: 4.300.000 kr, 3,9 %.
- Du forklarer og vurderer — det er ikke autoriseret rådgivning. Bliver du spurgt "skal jeg købe?", så giv det korte, ærlige billede ud fra tallene og lad beslutningen være deres.
- Hold dig til ejendomsinvestering og denne analyse.`;

function money(n: any): string {
  const x = Number(n);
  if (!Number.isFinite(x)) return "—";
  return Math.round(x).toLocaleString("da-DK") + " kr";
}
function pct(n: any): string {
  const x = Number(n);
  if (!Number.isFinite(x)) return "—";
  return x.toLocaleString("da-DK", { maximumFractionDigits: 2 }) + " %";
}

function n2(n: any): string {
  const x = Number(n);
  return Number.isFinite(x) ? x.toLocaleString("da-DK", { maximumFractionDigits: 2 }) : "—";
}

// Turn the analysis context into a compact, factual grounding block. This mirrors
// EVERYTHING on the user's screen — property facts, the full calculation
// breakdown, the hold-period return, AND the renovation/BRRRR + AI photo results
// — so Analytikeren can answer any question without asking the user for numbers.
function contextBlock(c: any): string {
  if (!c || typeof c !== "object") return "Ingen analysedata er tilgængelig.";
  const inv = c.market === "investering";
  const o = c.opexBreakdown || {};
  const lines = [
    `Type: ${inv ? `Erhvervs-/investeringsejendom${c.subcategory ? ` (${c.subcategory})` : ""}` : "Bolig til udlejning"}`,
    c.address ? `Adresse: ${c.address}` : null,
    c.price != null ? `Pris: ${money(c.price)}` : null,
    c.area != null ? `Areal: ${c.area} m²` : null,
    c.rooms != null ? `Værelser: ${c.rooms}` : null,
    c.yearBuilt != null ? `Byggeår: ${c.yearBuilt}` : null,
    c.heating ? `Opvarmning: ${c.heating}` : null,

    "\nFINANSIERING & DRIFT (input)",
    c.monthlyRent != null ? `${inv ? "Driftsindtægt (netto)/md." : "Forventet leje/md."}: ${money(c.monthlyRent)}` : null,
    c.downPaymentPct != null ? `Udbetaling: ${c.downPaymentPct} %` : null,
    c.interestRate != null ? `Rente: ${pct(c.interestRate)}` : null,
    c.termYears != null ? `Løbetid: ${c.termYears} år` : null,
    c.monthlyOpex ? `Faste driftsudgifter/md.: ${money(c.monthlyOpex)}` : null,
    c.vacancyPct != null && !inv ? `Tomgang: ${c.vacancyPct} %` : null,
    c.maintenancePct != null && !inv ? `Vedligehold: ${c.maintenancePct} % af lejen` : null,

    "\nRESULTAT (år 1)",
    `Investeringsscore: ${c.score ?? "—"}/100${c.rating ? ` (${c.rating})` : ""}`,
    c.verdict ? `Dom: ${c.verdict}` : null,
    c.annualRent != null ? `Bruttoleje/år: ${money(c.annualRent)}` : null,
    c.effectiveRent != null ? `Effektiv leje efter tomgang/år: ${money(c.effectiveRent)}` : null,
    o.vacancy != null ? `  − Tomgang/år: ${money(o.vacancy)}` : null,
    o.maintenance != null ? `  − Vedligehold/år: ${money(o.maintenance)}` : null,
    o.fixed != null ? `  − Faste udgifter/år: ${money(o.fixed)}` : null,
    c.noi != null ? `NOI (driftsresultat før lån)/år: ${money(c.noi)}` : null,
    c.monthlyMortgage != null ? `Terminsydelse/md.: ${money(c.monthlyMortgage)}` : null,
    c.cashFlow != null ? `Cashflow/md. (efter lån): ${money(c.cashFlow)}` : null,
    c.annualCashFlow != null ? `Cashflow/år: ${money(c.annualCashFlow)}` : null,
    c.grossYield != null ? `Bruttoafkast (leje ÷ pris): ${pct(c.grossYield)}` : null,
    c.capRate != null ? `Nettoafkast/cap rate (NOI ÷ pris): ${pct(c.capRate)}` : null,
    c.cashOnCash != null ? `Kontantafkast/cash-on-cash (cashflow ÷ investeret): ${pct(c.cashOnCash)}` : null,
    c.dscr != null ? `Gældsdækning/DSCR (NOI ÷ ydelse): ${n2(c.dscr)}` : null,
    c.breakEvenRate != null ? `Break-even-rente: ${pct(c.breakEvenRate)}` : null,
    c.breakEvenOccupancy != null ? `Break-even-belægning: ${pct(c.breakEvenOccupancy)}` : null,

    "\nFINANSIERING (beløb)",
    c.loan != null ? `Lån: ${money(c.loan)}` : null,
    c.cashInvested != null ? `Investeret kapital (udbetaling + købsomk.): ${money(c.cashInvested)}` : null,

    `\nOVER HELE PERIODEN (${c.holdYears ?? 10} år)`,
    c.appreciationPct != null ? `Værdistigning: ${pct(c.appreciationPct)}/år` : null,
    c.rentGrowthPct != null ? `Lejevækst: ${pct(c.rentGrowthPct)}/år` : null,
    c.irr != null ? `IRR (samlet årlig forrentning): ${pct(c.irr)}` : null,
    c.equityMultiple != null ? `Equity multiple: ${n2(c.equityMultiple)}×` : null,
    c.saleValue != null ? `Anslået salgsværdi ved exit: ${money(c.saleValue)}` : null,
    c.netSaleProceeds != null ? `Nettoprovenu ved salg: ${money(c.netSaleProceeds)}` : null,
    c.totalProfit != null ? `Samlet gevinst (cashflow + salg − investeret): ${money(c.totalProfit)}` : null,

    c.rentEstimated ? `\nNB: Lejen er ESTIMERET (ikke oplyst i annoncen) — behandl den med forbehold.` : null,
    renovationBlock(c.renovation),
  ].filter(Boolean);
  return lines.join("\n");
}

// The renovation / BRRRR panel + AI photo-condition, exactly as shown on screen.
function renovationBlock(rn: any): string | null {
  if (!rn || !rn.active) return null;
  const L = [
    "\nRENOVERING / BRRRR (som vist på skærmen)",
    rn.totalReno != null ? `Renoveringsbudget i alt: ${money(rn.totalReno)}` : null,
    Array.isArray(rn.items) && rn.items.length
      ? `  Poster: ${rn.items.map((i: any) => `${i.label} ${money(i.cost)}`).join(", ")}`
      : null,
    rn.arv != null ? `Vurdering efter renovering (ARV): ${money(rn.arv)}` : null,
    rn.newRent != null ? `Leje efter renovering/md.: ${money(rn.newRent)}` : null,
    rn.valueCreated != null ? `Værdiskabelse (ARV − pris − reno): ${money(rn.valueCreated)}` : null,
    rn.refiLtv != null ? `Belåning ved refinansiering: ${rn.refiLtv} %` : null,
    rn.refiLoan != null ? `Nyt lån ved refinansiering: ${money(rn.refiLoan)}` : null,
    rn.pulledOut != null ? `Udtrukket kapital ved refi: ${money(rn.pulledOut)}` : null,
    rn.leftIn != null ? `Kapital efterladt i handlen: ${money(rn.leftIn)}` : null,
    rn.recycledPct != null ? `Genbrugt af egenkapital: ${rn.recycledPct} %` : null,
    rn.newPayment != null ? `Ny ydelse efter refi/md.: ${money(rn.newPayment)}` : null,
    rn.cashFlowAfter != null ? `Cashflow efter renovering/md.: ${money(rn.cashFlowAfter)}` : null,
    rn.cashOnCashAfter != null ? `Kontantafkast efter refi: ${pct(rn.cashOnCashAfter)}` : null,
  ];
  if (rn.ai) {
    L.push(
      "AI-fotoanalyse af stand:",
      rn.ai.overallCondition != null ? `  Samlet stand: ${rn.ai.overallCondition}/5${rn.ai.conditionLabel ? ` (${rn.ai.conditionLabel})` : ""}` : null,
      rn.ai.confidence != null ? `  Sikkerhed: ${Math.round(Number(rn.ai.confidence) * 100)} %` : null,
      rn.ai.rentUpliftPct != null ? `  Anslået lejeløft: ${pct(rn.ai.rentUpliftPct)}` : null,
      rn.ai.valueUpliftPct != null ? `  Anslået værdiløft: ${pct(rn.ai.valueUpliftPct)}` : null,
      rn.ai.summary ? `  Resumé: ${rn.ai.summary}` : null,
    );
  }
  return L.filter(Boolean).join("\n");
}

export async function POST(req: Request) {
  const denied = await gateApi(req);
  if (denied) return denied;
  if (!process.env.ANTHROPIC_API_KEY) {
    return new Response("Analytikeren er ikke tilgængelig lige nu.", {
      status: 200, headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }

  let body: any;
  try { body = await req.json(); } catch { return new Response("Ugyldig anmodning.", { status: 400 }); }

  const history = Array.isArray(body?.messages) ? body.messages : [];
  const messages: Anthropic.MessageParam[] = history
    .filter((m: any) => m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string" && m.content.trim())
    .slice(-16)
    .map((m: any) => ({ role: m.role, content: String(m.content).slice(0, 4000) }));

  if (messages.length === 0 || messages[messages.length - 1].role !== "user") {
    return new Response("Skriv et spørgsmål til Analytikeren.", { status: 400 });
  }

  const english = body?.lang === "en";
  const system = `${PERSONA}\n\n════ DEN AKTUELLE ANALYSE ════\n${contextBlock(body?.context)}\n════════════════════════════════${
    english
      ? "\n\nSPROG: Brugeren har valgt engelsk. Svar altid på naturligt engelsk, også selvom tallene ovenfor står på dansk. Brug engelsk talformat (4,300,000 DKK, 3.9 %) og forklar danske begreber kort på engelsk første gang (fx grundskyld = land tax)."
      : ""
  }`;

  const client = new Anthropic();
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const s = client.messages.stream({
          model: MODEL,
          max_tokens: 1000,
          system,
          messages,
          // No thinking — this is a fast, grounded chat; latency matters more than deliberation.
          thinking: { type: "disabled" },
        } as any);
        for await (const event of s) {
          if (event.type === "content_block_delta" && (event.delta as any).type === "text_delta") {
            controller.enqueue(encoder.encode((event.delta as any).text));
          }
        }
      } catch {
        controller.enqueue(encoder.encode("\n\nBeklager — jeg kunne ikke svare lige nu. Prøv igen om et øjeblik."));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" },
  });
}
