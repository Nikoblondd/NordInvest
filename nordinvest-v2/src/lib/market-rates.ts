/*
 * Today's mortgage rates, from Danmarks Nationalbank via Danmarks Statistik
 * (table DNRNURI, new domestic loans from mortgage banks): the effective rate
 * including contribution (bidrag) on nominal loans in DKK, for companies and
 * for households, all fixation periods, variable (up to 3 months) and fixed
 * over 10 years. Monthly, cached for a day. Null when the API is unavailable.
 */

export type RateSet = { all: number; variable: number; fixed: number };
export type MarketRates = { month: string; label: string; company: RateSet; household: RateSet; source: string };

const MONTHS = ["januar", "februar", "marts", "april", "maj", "juni", "juli", "august", "september", "oktober", "november", "december"];

export async function getMarketRates(): Promise<MarketRates | null> {
  try {
    const res = await fetch("https://api.statbank.dk/v1/data", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        table: "DNRNURI", format: "JSONSTAT",
        variables: [
          { code: "DATA", values: ["AL51EFFR"] },
          { code: "INDSEK", values: ["1100", "1400"] },
          { code: "VALUTA", values: ["DKK"] },
          { code: "LØBETID1", values: ["ALLE"] },
          { code: "RENTFIX", values: ["ALLE", "1M3M", "S10A"] },
          { code: "LAANSTR", values: ["ALLE"] },
          { code: "Tid", values: ["(-n+3)"] },
        ],
      }),
      next: { revalidate: 86400 },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    const ds = (await res.json())?.dataset;
    const dims: string[] = ds?.dimension?.id ?? ds?.id ?? [];
    const size: number[] = ds?.dimension?.size ?? ds?.size ?? [];
    const idx = (dim: string) => Object.keys(ds.dimension[dim].category.index);
    const times = idx("Tid");
    const at = (sek: string, fix: string, t: number): number | null => {
      const pos: Record<string, number> = { DATA: 0, INDSEK: idx("INDSEK").indexOf(sek), VALUTA: 0, "LØBETID1": 0, RENTFIX: idx("RENTFIX").indexOf(fix), LAANSTR: 0, Tid: t };
      let flat = 0;
      dims.forEach((d, i) => { flat = flat * size[i] + (pos[d] ?? 0); });
      const v = ds.value[flat];
      return typeof v === "number" ? v : null;
    };
    // The newest month where all six numbers are published.
    for (let t = times.length - 1; t >= 0; t--) {
      const vals = ["1100", "1400"].flatMap((s) => ["ALLE", "1M3M", "S10A"].map((f) => at(s, f, t)));
      if (vals.some((v) => v == null)) continue;
      const [ca, cv, cf, ha, hv, hf] = vals as number[];
      const m = times[t].match(/(\d{4})M(\d{2})/);
      return {
        month: times[t],
        label: m ? `${MONTHS[Number(m[2]) - 1]} ${m[1]}` : times[t],
        company: { all: ca, variable: cv, fixed: cf },
        household: { all: ha, variable: hv, fixed: hf },
        source: "Danmarks Nationalbank (DNRNURI), effektiv rente inkl. bidrag på nye realkreditlån",
      };
    }
    return null;
  } catch {
    return null;
  }
}
