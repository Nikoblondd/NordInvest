// Datagrundlag — honest provenance for every figure that drives the verdict.
// The business-validation review named "tillid til tallene" as the #1 product
// risk: an analysis can look more certain than its inputs justify. So we label
// each key figure as one of three things and never let an estimate masquerade
// as a documented fact.
//
//   doc    — Dokumenteret: comes from an external source (the listing, BBR,
//            official ad data) or was typed in by the user themselves.
//   est    — Estimat: our model derived it (e.g. rent from area × local level).
//   input  — Indtastet af dig: the user's own assumption, neither external nor
//            model-estimated.
//
// Plus a separate legal caveat ("Skal undersøges") for Danish rent regulation,
// which applies regardless of where the rent number came from: an advertised or
// estimated rent is not the same as the rent that may legally be charged.

export type ProvTier = "doc" | "est" | "input";

export type ProvRow = {
  key: string;
  label: string;
  tier: ProvTier;
  /** Where the figure comes from, in plain Danish. */
  source: string;
};

export type ProvInput = {
  /** Numbers were seeded from the Deal-motor's ad dataset (Boligsiden mv.). */
  fromDeal: boolean;
  /** A listing URL was scraped directly. */
  fromListing: boolean;
  /** Field keys the scraper reported as read straight from the listing. */
  found: string[];
  /** Rent was filled by our area × local-level estimate, not the listing. */
  rentEstimated: boolean;
  /** Fixed costs were filled by our area estimate, not the listing. */
  opexEstimated: boolean;
  /** Commercial/investment deal — rent field is a net operating figure. */
  isInvestment: boolean;
  hasArea: boolean;
  byggeaar: number | null;
  /** Documented market price/m² benchmark matched for this property, if any. */
  priceBenchmark?: { n: number; regionLabel: string; asOf: string } | null;
  /** Rent benchmark (DST-anchored, optionally documented via user obs). */
  rentBenchmark?: { tier: "kalibreret" | "documented"; regionLabel: string; source: string } | null;
};

function has(found: string[], ...keys: string[]): boolean {
  return keys.some((k) => found.includes(k));
}

export function buildProvenance(s: ProvInput): ProvRow[] {
  const rows: ProvRow[] = [];
  const external = s.fromDeal || s.fromListing;

  // Købspris
  rows.push(
    has(s.found, "price") || s.fromDeal
      ? { key: "price", label: "Købspris", tier: "doc", source: s.fromDeal ? "Fra annoncedata (Boligsiden m.fl.)" : "Fra annoncen" }
      : { key: "price", label: "Købspris", tier: "input", source: "Indtastet af dig" },
  );

  // Månedlig leje / driftsindtægt — the figure the whole verdict hinges on.
  if (s.isInvestment) {
    rows.push({ key: "rent", label: "Driftsindtægt/md.", tier: "doc", source: "Nettoindtægt fra annoncedata" });
  } else if (has(s.found, "monthlyRent", "annualRent")) {
    rows.push({ key: "rent", label: "Månedlig leje", tier: "doc", source: "Annonceret leje (fra annoncen)" });
  } else if (s.rentEstimated) {
    // Estimated rent is now DST-anchored when the benchmark is available.
    // At ≥15 user observations for the region, the tier flips to Dokumenteret.
    if (s.rentBenchmark) {
      const tier: ProvTier = s.rentBenchmark.tier === "documented" ? "doc" : "est";
      const label = s.rentBenchmark.tier === "documented" ? "Månedlig leje" : "Månedlig leje";
      rows.push({ key: "rent", label, tier, source: s.rentBenchmark.source });
    } else {
      rows.push({ key: "rent", label: "Månedlig leje", tier: "est", source: "Estimeret ud fra areal og lokalt lejeniveau. Kan rettes" });
    }
  } else {
    rows.push({ key: "rent", label: "Månedlig leje", tier: "input", source: "Indtastet af dig" });
  }

  // Faste udgifter. An investeringsejendom's yield is already net of them.
  if (s.isInvestment) {
    rows.push({ key: "opex", label: "Driftsudgifter", tier: "doc", source: "Trukket fra i sælgers afkast" });
  } else if (has(s.found, "monthlyExpenses")) {
    rows.push({ key: "opex", label: "Faste udgifter", tier: "doc", source: "Ejerudgift fra annoncen" });
  } else if (s.opexEstimated) {
    rows.push({ key: "opex", label: "Faste udgifter", tier: "est", source: "Estimeret ud fra areal. Kan rettes" });
  } else {
    rows.push({ key: "opex", label: "Faste udgifter", tier: "input", source: "Indtastet af dig" });
  }

  // Areal
  if (s.hasArea) {
    rows.push({ key: "area", label: "Areal", tier: "doc", source: external ? "Fra annonce og BBR" : "Fra BBR" });
  }

  // Byggeår
  if (s.byggeaar != null) {
    rows.push({ key: "byggeaar", label: "Byggeår", tier: "doc", source: "Fra BBR (Datafordeler)" });
  }

  // Markedspris pr. m² — documented benchmark from our own scraped market.
  if (s.priceBenchmark) {
    rows.push({
      key: "market",
      label: "Markedspris pr. m²",
      tier: "doc",
      source: `Median for ${s.priceBenchmark.regionLabel} · ${s.priceBenchmark.n.toLocaleString("da-DK")} annoncer (${s.priceBenchmark.asOf})`,
    });
  }

  return rows;
}

// ---- Danish rent regulation ---------------------------------------------
// Advertised rent ≠ legally chargeable rent. Buildings first occupied before
// 31 Dec 1991 can fall under omkostningsbestemt leje / the older § 54-style
// rules in regulated municipalities, where the lawful rent may be well below
// the asking rent. Newer buildings are typically free-rent, but never
// guaranteed. We flag this rather than pretend the ad rent is bankable — but we
// do not quote historical amount thresholds, which change.

export type RentRuleLevel = "high" | "info" | "unknown";
export type RentRule = { level: RentRuleLevel; title: string; body: string };

export function rentRegulationRule(byggeaar: number | null): RentRule {
  if (byggeaar == null) {
    return {
      level: "unknown",
      title: "Lovlig leje",
      body:
        "Byggeåret er ukendt, så vi kan ikke vurdere, om ejendommen er lejereguleret. " +
        "Den annoncerede leje er ikke nødvendigvis den lovlige leje. Undersøg lejefastsættelsen, før du bruger tallet.",
    };
  }
  if (byggeaar <= 1991) {
    return {
      level: "high",
      title: "Lejen kan være reguleret (opført " + byggeaar + ")",
      body:
        "Ejendomme taget i brug før 1992 kan være omfattet af omkostningsbestemt leje i regulerede kommuner. " +
        "Den lovlige leje kan derfor ligge under den annoncerede. Få lejefastsættelsen bekræftet, da afkastet afhænger af den.",
    };
  }
  return {
    level: "info",
    title: "Tjek lejefastsættelsen (opført " + byggeaar + ")",
    body:
      "Nyere ejendomme har typisk friere lejefastsættelse, men annonceret leje er stadig ikke en garanti for den lovlige leje. " +
      "Bekræft vilkårene i en konkret lejekontrakt.",
  };
}
