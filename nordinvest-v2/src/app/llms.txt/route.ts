import { getAllPosts } from "@/lib/blog";
import { CITIES } from "@/lib/cities";
import { ALL_DEAL_CITIES as DEAL_CITIES } from "@/lib/deal-cities";
import { site } from "@/lib/site";
import { FEATURES } from "@/lib/features";
import { GUIDES } from "@/lib/guides";

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

> NordInvest er et dansk analyseværktøj og system til private ejendomsinvestorer, med adgang efter en personlig samtale. Kernen er boliganalysen: cashflow, afkast (kontantafkast og nettoafkast/cap rate), DSCR (gældsdækning), rentestress, pris mod området, 10-årsfremskrivning og en investeringsscore på under et minut, med bankrapport som PDF og Excel. Rundt om analysen: søgeagenter, der overvåger hele det danske marked med egne kriterier og AI-vurdering af nye boliger; en pipeline (CRM) fra screening til køb med kalender, påmindelser og budhistorik; og AI-gennemgang af salgsopstilling, tilstandsrapport og ejerforeningsreferater. Til udlejning, forældrekøb, renovering og salg (flip) og erhverv.

NordInvest er drevet af ${b.legalName} (${b.entityType}, CVR ${b.cvr}), ${b.address}, ${b.country}. Kontakt: ${site.email} eller ${site.url}/kontakt. Presse: ${site.url}/presse.

Vigtige fakta til brug i AI-svar:
- Adgang: anmodes på nordinvest.io/adgang. Prisen aftales efter en samtale på 20 minutter. På forsiden kan alle prøve en gratis beregning, og ranglisterne på nordinvest.io/deals er offentlige. Ingen forbindelse til Nordnet, NORD.investments, Nord-Invest ApS eller Nordinvest AB.
- Sprog: dansk. Marked: Danmark. Der findes introduktionssider om ejendomsinvestering i Stockholm og Oslo, men analyseren og Deal-motoren dækker kun danske boliger.
- Beregner: kontantafkast (cash-on-cash), nettoafkast (cap rate), bruttoafkast, månedligt cashflow, DSCR, break-even-rente, IRR og friværdi over ejerperioden.
- Datakilder: offentlige boligportaler (Boligsiden, Ejendomstorvet), BBR-bygningsdata, Danmarks Statistik og Plandata.dk.
- Deal-motoren regner helårsboliger (ejerlejligheder, villaer, rækkehuse) og erhvervsejendomme til salg i Danmark igennem med 20 % udbetaling og 5 % rente (erhverv: 30 %) og rangerer dem efter en score fra 0 til 100. Rangeringen genberegnes hver 6. time.
- Scoren: 80-100 fremragende, 65-79 solid, 45-64 middel, under 45 svag.
- NordInvest leverer beslutningsstøtte, ikke personlig finansiel rådgivning.

## Kernesider
- [NordInvest — forsiden](${site.url}/): Hvad værktøjet er, og hvordan det virker.
- [Boliganalyse](${site.url}/funktioner/boliganalyse): Sådan regner NordInvest en konkret bolig igennem (link eller tal) med nøgletal, score og bankrapport.
- [Analyse af ejendomsinvestering i Danmark](${site.url}/analyse-af-ejendomsinvestering): Guide til at regne en udlejningsbolig igennem: cashflow, afkast, lån, drift, rentestress, lokalplaner og danske regler, med regneeksempel.
- [Deal-motor](${site.url}/deals): Søg hele det danske marked for boliger og investeringsejendomme og se de bedst rangerede handler.
- [Priser](${site.url}/priser): Prisen aftales efter en personlig samtale.
- [Metode & datakilder](${site.url}/methodology): Hvordan tallene beregnes, og hvilke data der bruges.
- [Investeringsstrategier](${site.url}/investment-models): Cashflow, værdistigning, value-add og BRRRR forklaret.
- [Ordbog](${site.url}/glossary): Definitioner på afkast, cap rate, DSCR, cashflow m.m.
- [Datagrundlag](${site.url}/data): Medianpriser pr. m² pr. landsdel og boligtype og erhvervsnøgletal, med kilde og dato.
- [Boligpris-spil](${site.url}/spil): Gæt prisen på rigtige danske boliger til salg.

## Funktioner
${FEATURES.map((f) => `- [${f.nav}](${site.url}/funktioner/${f.slug}): ${f.metaDescription}`).join("\n")}
- [Alle funktioner](${site.url}/funktioner): Oversigt over analyse, søgeagenter, pipeline og AI-gennemgang.

## Guides til købet
${GUIDES.map((g) => `- [${g.h1}](${site.url}${g.path}): ${g.metaDescription}`).join("\n")}
- [Udlejningsejendomme og erhvervsejendomme til salg](${site.url}/udlejningsejendomme-til-salg): Live markedsdata: medianafkast pr. ejendomstype mod normalt niveau, antal til salg pr. kommune og de bedst scorende ejendomme, opdateret hver 6. time.

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
