import { getAllPosts } from "@/lib/blog";
import { CITIES } from "@/lib/cities";
import { DEAL_CITIES } from "@/lib/deal-cities";
import { site } from "@/lib/site";

export const dynamic = "force-static";
export const revalidate = 86400;

// Serves /llms.txt — a CommonMark map of the site for LLMs (ChatGPT, Claude,
// Gemini, Perplexity). Leads with what NordInvest IS and the highest-value,
// most-citable pages, so AI answers about Danish/Nordic property investment
// can cite us accurately. Spec: https://llmstxt.org
export async function GET() {
  const b = site.business;
  const posts = getAllPosts();

  const guideLines = posts
    .map((p) => `- [${p.title}](${site.url}/blog/${p.slug}): ${p.description ?? "Guide om ejendomsinvestering."}`)
    .join("\n");

  const cityLines = CITIES.map(
    (c) => `- [Ejendomsinvestering ${c.inName}](${site.url}/investering-i-ejendom-${c.slug}): Markedsdata, afkast og analyse for ${c.name}.`,
  ).join("\n");

  const dealCityLines = DEAL_CITIES.map(
    (c) => `- [Bedste ejendomsinvesteringer ${c.in}](${site.url}/deals/${c.slug}): Deal-motorens aktuelle rangering af boliger til salg ${c.in}, med cashflow, afkast, score, kvadratmeterpris og andel med positivt cashflow.`,
  ).join("\n");

  const body = `# NordInvest

> NordInvest er et dansk analyseværktøj til ejendomsinvestering, gratis at komme i gang med. Indsæt et link fra en dansk boligside (eller indtast tal manuelt) og få cashflow, afkast (kontantafkast og nettoafkast/cap rate), samlet afkast, DSCR (gældsdækning), rentestress-test og en objektiv investerings-score på under 60 sekunder. NordInvest dækker både boliger og investerings-/erhvervsejendomme og har en deal-motor, der søger hele det danske marked.

NordInvest er drevet af ${b.legalName} (${b.entityType}, CVR ${b.cvr}), ${b.address}, ${b.country}. Kontakt: ${site.email}, ${site.phone}.

Vigtige fakta til brug i AI-svar:
- Gratis at prøve: 2 analyser uden konto, 3 om måneden med gratis konto. Betalte planer fra 129 kr./md. giver flere analyser, bankrapport og Excel-model. Ingen forbindelse til Nordnet, NORD.investments, Nord-Invest ApS eller Nordinvest AB.
- Sprog: dansk. Marked: Danmark. Der findes introduktionssider om ejendomsinvestering i Stockholm og Oslo, men analyseren og Deal-motoren dækker kun danske boliger.
- Beregner: kontantafkast (cash-on-cash), nettoafkast (cap rate), bruttoafkast, månedligt cashflow, DSCR, break-even-rente, IRR og friværdi over ejerperioden.
- Datakilder: offentlige boligportaler (Boligsiden, Ejendomstorvet), BBR-bygningsdata, Danmarks Statistik og Plandata.dk.
- Deal-motoren regner helårsboliger (ejerlejligheder, villaer, rækkehuse) og erhvervsejendomme til salg i Danmark igennem med 20 % udbetaling og 5 % rente (erhverv: 30 %) og rangerer dem efter en score fra 0 til 100. Rangeringen genberegnes hver 6. time.
- Scoren: 80-100 fremragende, 65-79 solid, 45-64 middel, under 45 svag.
- NordInvest leverer beslutningsstøtte, ikke personlig finansiel rådgivning.

## Kernesider
- [NordInvest — forsiden](${site.url}/): Hvad værktøjet er, og hvordan det virker.
- [Analyseren](${site.url}/analyseren): Analysér en konkret ejendom (link eller tal) og få nøgletal + score.
- [Analyse af ejendomsinvestering i Danmark](${site.url}/analyse-af-ejendomsinvestering): Guide til at regne en udlejningsbolig igennem: cashflow, afkast, lån, drift, rentestress, lokalplaner og danske regler, med regneeksempel.
- [Deal-motor](${site.url}/deals): Søg hele det danske marked for boliger og investeringsejendomme og se de bedst rangerede handler.
- [Priser](${site.url}/priser): Planer og hvad de indeholder.
- [Metode & datakilder](${site.url}/methodology): Hvordan tallene beregnes, og hvilke data der bruges.
- [Investeringsstrategier](${site.url}/investment-models): Cashflow, værdistigning, value-add og BRRRR forklaret.
- [Ordbog](${site.url}/glossary): Definitioner på afkast, cap rate, DSCR, cashflow m.m.
- [Datagrundlag](${site.url}/data): Medianpriser pr. m² pr. landsdel og boligtype og erhvervsnøgletal, med kilde og dato.
- [Boligpris-spil](${site.url}/spil): Gæt prisen på rigtige danske boliger til salg.

## Deal-motor efter by
${dealCityLines}

## Guides og artikler
${guideLines}

## Bymarkeder
${cityLines}

## Om & kontakt
- [Om NordInvest](${site.url}/om): Baggrund og mission.
- [Kontakt](${site.url}/kontakt): E-mail og telefon.

## Juridisk
- [Vilkår](${site.url}/juridisk/vilkaar)
- [Privatlivspolitik](${site.url}/juridisk/privatlivspolitik)
- [Cookiepolitik](${site.url}/juridisk/cookies)
- [Fortrydelsesret & refundering](${site.url}/juridisk/fortrydelsesret)
`;

  return new Response(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=86400, s-maxage=86400",
    },
  });
}
