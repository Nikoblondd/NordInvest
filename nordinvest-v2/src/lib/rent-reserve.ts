// Lejereserve — the single number pro property investors optimize for and
// no other Danish tool currently exposes: the LEGALLY REALISTIC gap between
// what a property earns today and what it could earn under (a) genudlejning
// and (b) tax-and-duty regulation, plus the technical market-value uplift
// that gap represents.
//
// Anchored in what a Reddit thread of active DK-property investors told us:
//   • "Hvis jeg over to år kan hæve huslejeindtægterne med 20 % gennem
//     genudlejning og lovlige reguleringer, har jeg skabt en teknisk
//     forhøjelse af ejendommens markedsværdi relativt nemt."
//   • The classic legal lever: rent adjustment based on skatter og afgifter.
//   • The reverse case matters too: current rents ABOVE market create
//     genudlejnings-risk, not a reserve.
//
// Rules encoded:
//   • Boligreguleringsloven (BRL): pre-1992 buildings in regulated
//     municipalities → omkostningsbestemt leje regime. Uplift is capped to
//     what a fair-cost re-calculation typically supports (~8-12 % pr. 2 år).
//   • Post-1991 buildings → fri lejefastsættelse. Uplift is capped by the
//     market ceiling (100 % of market rent).
//   • Rural / free-rent municipalities: same as post-1991.
//   • Value uplift = incremental annual NOI ÷ regional cap rate.

export type RentReserveInput = {
  /** Current monthly rent, kr — from listing or investor input */
  currentMonthlyRent: number;
  /** Regional market rent, kr/m²/md */
  marketRentPerM2Month: number;
  /** Rentable area, m² */
  areaM2: number;
  /** Property built year (for BRL regime detection) — null = assume post-1991 */
  yearBuilt: number | null;
  /** Zip code — determines BRL-regulated status by kommune */
  zip: number | null;
  /** Regional cap rate for value uplift calc, % — defaults to 5.0 % */
  regionalCapRate?: number;
  /** Property type slug — used to gate the reserve for non-rental types */
  propertyType?: string | null;
};

export type RentReserveResult = {
  /** Positive = reserve exists; negative = re-letting risk */
  gapMonthly: number;
  /** Same as annual */
  gapAnnual: number;
  /** Current rent expressed as kr/m²/md */
  currentPerM2Month: number;
  /** Market rent kr/m²/md */
  marketPerM2Month: number;
  /** Legally realistic 24-month uplift after BRL constraints, kr/md */
  realisticMonthlyUplift: number;
  /** Realistic 24-month uplift, kr/år */
  realisticAnnualUplift: number;
  /** Value increase this uplift represents at the region's cap rate, kr */
  technicalValueUplift: number;
  /** True → property in regulated regime (pre-1992 in regulated kommune) */
  isRegulated: boolean;
  /** Human-readable regime label */
  regimeLabel: string;
  /** Uplift path: how we get from current → realistic in 24 months */
  path: {
    step: "skatter-afgifter" | "genudlejning" | "moderat-regulering" | "fri-fastsaettelse";
    label: string;
    amountMonthly: number;
    when: string;
  }[];
  /**
   * Verdict: "reserve" | "at-market" | "over-market"
   * Drives UI badge color + copy.
   */
  verdict: "reserve" | "at-market" | "over-market";
  /** Short human summary in Danish, used as headline in the UI card */
  headline: string;
  /** Long-form explanation for the "hvordan"-drawer */
  explain: string;
};

// Kommuner covered by boligreguleringsloven's omkostningsbestemte-leje-regler.
// This is the 2020s list of "regulerede kommuner" — most large towns opted in.
// Non-listed kommuner are on fri lejefastsættelse regardless of year.
const REGULATED_ZIP_RANGES: Array<[number, number]> = [
  [1000, 2999], // København + Frederiksberg
  [2600, 2650], // Glostrup + omegn (partially — covered by København range too)
  [2700, 2850], // Brønshøj, Herlev, Ballerup
  [2860, 2900], // Søborg, Hellerup
  [2920, 2990], // Charlottenlund, Klampenborg, Vedbæk
  [3000, 3070], // Hørsholm, Espergærde, Snekkersten
  [3400, 3400], // Hillerød
  [3500, 3540], // Værløse, Farum, Lynge
  [4000, 4000], // Roskilde
  [4600, 4600], // Køge
  [4700, 4700], // Næstved
  [5000, 5230], // Odense
  [6000, 6000], // Kolding
  [6100, 6100], // Haderslev
  [6200, 6200], // Aabenraa
  [6400, 6400], // Sønderborg
  [6700, 6700], // Esbjerg
  [7000, 7100], // Fredericia, Vejle
  [7500, 7500], // Holstebro
  [7700, 7700], // Thisted
  [7800, 7800], // Skive
  [8000, 8270], // Aarhus + omegn
  [8600, 8600], // Silkeborg
  [8700, 8700], // Horsens
  [8800, 8800], // Viborg
  [8900, 8900], // Randers
  [9000, 9210], // Aalborg
  [9400, 9400], // Nørresundby
];

function isRegulatedKommune(zip: number | null): boolean {
  if (zip == null) return true; // safer default: assume regulated
  return REGULATED_ZIP_RANGES.some(([lo, hi]) => zip >= lo && zip <= hi);
}

/** True when boligreguleringsloven's omkostningsbestemte-leje-regime applies. */
export function isBRLRegulated(yearBuilt: number | null, zip: number | null): boolean {
  if (yearBuilt == null) return false; // no year → free-rent for calc; UI notes it
  if (yearBuilt >= 1992) return false; // §§ 5, stk. 8: post-1991 = fri fastsættelse
  return isRegulatedKommune(zip);
}

// The plausible legal uplift ceiling for a 24-month window.
// - Regulated properties can typically achieve 8-15 % via skatter-og-afgifter-
//   reguleringer + moderate re-letting increases (§ 5 stk. 2 omkostninger).
// - Free-rent properties are capped only by market rent (100 % of market).
function realisticCeiling(
  currentAnnual: number,
  marketAnnual: number,
  isRegulated: boolean,
): number {
  if (currentAnnual <= 0) return marketAnnual; // vacant → full market
  if (isRegulated) {
    // Cap at 15 % over 24 months or market rent, whichever is lower.
    return Math.min(currentAnnual * 1.15, marketAnnual);
  }
  // Free-rent regime: allowed to reach market ceiling in ~24 months via genudlejning.
  return marketAnnual;
}

/**
 * Compute a lejereserve.
 * Returns null when we can't produce a defensible number (missing area,
 * missing market rent, or the property is not a rental case at all).
 */
export function computeRentReserve(input: RentReserveInput): RentReserveResult | null {
  const { currentMonthlyRent, marketRentPerM2Month, areaM2, yearBuilt, zip, propertyType } = input;

  // Guards
  if (!Number.isFinite(areaM2) || areaM2 <= 10) return null;
  if (!Number.isFinite(marketRentPerM2Month) || marketRentPerM2Month <= 0) return null;
  if (!Number.isFinite(currentMonthlyRent) || currentMonthlyRent < 0) return null;
  // Sommerhus, landejendom → not a rental-market case
  if (propertyType && /(holiday|sommer|farm|landejendom)/i.test(propertyType)) return null;

  const currentPerM2 = areaM2 > 0 ? currentMonthlyRent / areaM2 : 0;
  const marketPerM2 = marketRentPerM2Month;
  const gapMonthly = Math.round(marketPerM2 * areaM2 - currentMonthlyRent);
  const gapAnnual = gapMonthly * 12;

  const isRegulated = isBRLRegulated(yearBuilt, zip);
  const marketAnnual = marketPerM2 * areaM2 * 12;
  const currentAnnual = currentMonthlyRent * 12;
  const capAnnual = realisticCeiling(currentAnnual, marketAnnual, isRegulated);
  const realisticAnnualUplift = Math.max(0, Math.round(capAnnual - currentAnnual));
  const realisticMonthlyUplift = Math.round(realisticAnnualUplift / 12);

  // Value uplift = extra NOI ÷ cap rate. Assume same opex, so the entire
  // rent uplift flows to NOI. A conservative 5 % cap rate default.
  const capRatePct = Number.isFinite(input.regionalCapRate) && (input.regionalCapRate ?? 0) > 0
    ? input.regionalCapRate as number
    : 5.0;
  const technicalValueUplift =
    realisticAnnualUplift > 0
      ? Math.round((realisticAnnualUplift / (capRatePct / 100)) / 1000) * 1000
      : 0;

  // Verdict
  let verdict: RentReserveResult["verdict"];
  if (gapMonthly > 150) verdict = "reserve";
  else if (gapMonthly < -150) verdict = "over-market";
  else verdict = "at-market";

  // Path — how the 24-month uplift is realistically achieved
  const path: RentReserveResult["path"] = [];
  if (verdict === "reserve" && realisticMonthlyUplift > 0) {
    if (isRegulated) {
      // Regulated regime: skatter-afgifter first (immediate + small), then
      // moderate omkostningsbestemt-regulering at genudlejning.
      const first = Math.round(realisticMonthlyUplift * 0.35);
      const second = realisticMonthlyUplift - first;
      path.push({
        step: "skatter-afgifter",
        label: "Skat-og-afgift-regulering (§ 50-52 BRL)",
        amountMonthly: first,
        when: "Måned 1-6",
      });
      path.push({
        step: "moderat-regulering",
        label: "Omkostningsbestemt regulering ved genudlejning",
        amountMonthly: second,
        when: "Måned 12-24 (ved genudlejning)",
      });
    } else {
      // Free-rent: skatter-afgifter is still relevant, but the main lever is
      // genudlejning to market.
      const first = Math.round(realisticMonthlyUplift * 0.20);
      const second = realisticMonthlyUplift - first;
      path.push({
        step: "skatter-afgifter",
        label: "Skat-og-afgift-regulering (varsel)",
        amountMonthly: first,
        when: "Måned 1-6",
      });
      path.push({
        step: "genudlejning",
        label: "Genudlejning til markedsniveau",
        amountMonthly: second,
        when: "Ved fraflytning (typisk 12-24 md.)",
      });
    }
  }

  const regimeLabel = isRegulated
    ? "Omkostningsbestemt leje (BRL, opført før 1992)"
    : yearBuilt == null
    ? "Fri lejefastsættelse (byggeår ukendt — antaget efter 1991)"
    : "Fri lejefastsættelse (opført efter 1991)";

  // Headline in Danish, feeds the UI card
  let headline: string;
  if (verdict === "reserve") {
    const upliftPct = currentAnnual > 0
      ? Math.round((realisticAnnualUplift / currentAnnual) * 100)
      : 100;
    headline = `Lejereserve identificeret · +${realisticMonthlyUplift.toLocaleString("da-DK")} kr/md realistisk over 24 md (+${upliftPct} %)`;
  } else if (verdict === "over-market") {
    const overPct = marketAnnual > 0
      ? Math.round(((currentAnnual - marketAnnual) / marketAnnual) * 100)
      : 0;
    headline = `Nuværende leje ligger ${overPct} % over markedet — genudlejnings-risiko`;
  } else {
    headline = "Lejen ligger på markedsniveau — ingen kort-sigtet reserve";
  }

  const explain = verdict === "reserve"
    ? `Vi sammenholder den nuværende leje (${currentPerM2.toFixed(0)} kr/m²/md) med markedslejen for området (${marketPerM2.toFixed(0)} kr/m²/md). ` +
      (isRegulated
        ? "Ejendommen falder ind under boligreguleringslovens omkostningsbestemte-leje-regime (opført før 1992 i reguleret kommune), så realistisk uplift over 24 måneder er cappet ved ~15 %."
        : "Ejendommen har fri lejefastsættelse (opført efter 1991 eller i ureguleret kommune), så genudlejning til markedet er lovlig ved fraflytning.") +
      ` Den incremental leje forvandles til teknisk værdi-uplift ved at dividere med regionens cap rate (${capRatePct.toFixed(1)} %).`
    : verdict === "over-market"
    ? "Lejen er sat højere end markedet kan bære ved genudlejning. Ved fraflytning risikerer du at lejen skal reduceres. Modellér denne risiko ind i cashflow-prognosen ved at bruge markedslejen som ny baseline."
    : "Nuværende leje matcher markedet, så der er ingen kortsigtet reserve at høste. Fokusér i stedet på fastholdelse af lejer og løbende skat-og-afgift-reguleringer.";

  return {
    gapMonthly,
    gapAnnual,
    currentPerM2Month: Math.round(currentPerM2 * 10) / 10,
    marketPerM2Month: Math.round(marketPerM2 * 10) / 10,
    realisticMonthlyUplift,
    realisticAnnualUplift,
    technicalValueUplift,
    isRegulated,
    regimeLabel,
    path,
    verdict,
    headline,
    explain,
  };
}
