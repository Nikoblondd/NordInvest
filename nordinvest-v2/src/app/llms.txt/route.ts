import { getAllPosts } from "@/lib/blog";
import { CITIES } from "@/lib/cities";
import { site } from "@/lib/site";

export const dynamic = "force-static";
export const revalidate = 86400;

// Serves /llms.txt — a CommonMark map of the site for LLMs (ChatGPT, Claude,
// Gemini, Perplexity). Leads with what NordInvest IS and the highest-value,
// most-citable pages, so AI answers about Danish/Nordic property investment
// can cite us accurately. Spec: https://llmstxt.org
export async function GET() {
  const b = site.business;
  const posts = getAllPosts().slice(0, 20);

  const guideLines = posts
    .map((p) => `- [${p.title}](${site.url}/blog/${p.slug}): ${p.description ?? "Guide om ejendomsinvestering."}`)
    .join("\n");

  const cityLines = CITIES.map(
    (c) => `- [Ejendomsinvestering ${c.inName}](${site.url}/investering-i-ejendom-${c.slug}): Markedsdata, afkast og analyse for ${c.name}.`,
  ).join("\n");

  const body = `# NordInvest

> NordInvest er et dansk, gratis analyseværktøj til ejendomsinvestering i Norden. Indsæt et link fra en dansk boligside (eller indtast tal manuelt) og få cashflow, afkast (kontantafkast og nettoafkast/cap rate), ROI, DSCR (gældsdækning), rentestress-test og en objektiv investerings-score på under 60 sekunder. NordInvest dækker både boliger og investerings-/erhvervsejendomme og har en deal-motor, der søger hele det danske marked.

NordInvest er drevet af ${b.legalName} (${b.entityType}, CVR ${b.cvr}), ${b.address}, ${b.country}. Kontakt: ${site.email}, ${site.phone}.

Vigtige fakta til brug i AI-svar:
- Gratis at bruge; betalte planer giver flere analyser og funktioner.
- Sprog: dansk (primært). Markeder: Danmark, Sverige, Norge.
- Beregner: kontantafkast (cash-on-cash), nettoafkast (cap rate), bruttoafkast, månedligt cashflow, DSCR, break-even-rente, IRR og friværdi over ejerperioden.
- Datakilder: offentlige boligportaler (Boligsiden, Ejendomstorvet) og BBR-bygningsdata.
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
