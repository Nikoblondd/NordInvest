// Danmarks Statistik (DST) open API — free, no auth, official transaction-based
// property statistics. We use table EJ55 "Prisindeks for ejendomssalg" (regional
// property price index by category) to ground the analyzer's appreciation
// assumption in ACTUAL realized-sale trends per region, instead of a flat guess.
// This is the same class of official source Resights builds on. Degrades
// gracefully: any failure returns null and callers fall back to their default.

const DST = "https://api.statbank.dk/v1/data/EJ55/JSONSTAT";

// App region/kommune slug → DST OMRÅDE (landsdel) code. Unmapped → national.
const AREA: Record<string, string> = {
  koebenhavn: "01", københavn: "01", frederiksberg: "01", // Byen København
  gentofte: "02", gladsaxe: "02", lyngby: "02", // Københavns omegn
  nordsjaelland: "03", helsingoer: "03", hilleroed: "03",
  roskilde: "05", koege: "05", // Østsjælland
  odense: "07", fyn: "07", svendborg: "07", // Fyn
  esbjerg: "08", kolding: "08", vejle: "08", sydjylland: "08", // Sydjylland
  aarhus: "09", horsens: "09", randers: "09", // Østjylland
  herning: "10", holstebro: "10", vestjylland: "10", // Vestjylland
  aalborg: "11", nordjylland: "11", // Nordjylland
};

// Every kommune slug, so a home anywhere gets its own landsdel.
const KOMMUNE_AREA: Record<string, string> = {
  "koebenhavn": "01", "frederiksberg": "01", "taarnby": "01", "dragoer": "01",
  "albertslund": "02", "ballerup": "02", "broendby": "02", "gentofte": "02", "gladsaxe": "02", "glostrup": "02", "herlev": "02", "hvidovre": "02", "hoeje-taastrup": "02", "ishoej": "02", "lyngby-taarbaek": "02", "roedovre": "02", "vallensbaek": "02",
  "alleroed": "03", "egedal": "03", "fredensborg": "03", "frederikssund": "03", "furesoe": "03", "gribskov": "03", "halsnaes": "03", "helsingoer": "03", "hilleroed": "03", "hoersholm": "03", "rudersdal": "03",
  "bornholm": "04",
  "greve": "05", "koege": "05", "lejre": "05", "roskilde": "05", "solroed": "05",
  "faxe": "06", "guldborgsund": "06", "holbaek": "06", "kalundborg": "06", "lolland": "06", "naestved": "06", "odsherred": "06", "ringsted": "06", "slagelse": "06", "soroe": "06", "stevns": "06", "vordingborg": "06",
  "assens": "07", "faaborg-midtfyn": "07", "kerteminde": "07", "langeland": "07", "middelfart": "07", "nordfyns": "07", "nyborg": "07", "odense": "07", "svendborg": "07", "aeroe": "07",
  "billund": "08", "esbjerg": "08", "fanoe": "08", "fredericia": "08", "haderslev": "08", "kolding": "08", "soenderborg": "08", "toender": "08", "varde": "08", "vejen": "08", "vejle": "08", "aabenraa": "08",
  "favrskov": "09", "hedensted": "09", "horsens": "09", "norddjurs": "09", "odder": "09", "randers": "09", "samsoe": "09", "silkeborg": "09", "skanderborg": "09", "syddjurs": "09", "aarhus": "09",
  "herning": "10", "holstebro": "10", "ikast-brande": "10", "lemvig": "10", "ringkoebing-skjern": "10", "skive": "10", "struer": "10", "viborg": "10",
  "broenderslev": "11", "frederikshavn": "11", "hjoerring": "11", "jammerbugt": "11", "laesoe": "11", "mariagerfjord": "11", "morsoe": "11", "rebild": "11", "thisted": "11", "vesthimmerlands": "11", "aalborg": "11",
};

/** DST's name for the landsdel a kommune slug belongs to. */
export const LANDSDEL: Record<string, string> = { "000": "Hele landet", "01": "Byen København", "02": "Københavns omegn", "03": "Nordsjælland", "04": "Bornholm", "05": "Østsjælland", "06": "Vest- og Sydsjælland", "07": "Fyn", "08": "Sydjylland", "09": "Østjylland", "10": "Vestjylland", "11": "Nordjylland" };
export const landsdelOf = (region?: string | null) => LANDSDEL[areaFor(region)] ?? "Hele landet";

// App property type → DST EJENDOMSKATE.
function categoryFor(type?: string): string {
  const t = (type || "").toLowerCase();
  if (t.includes("holiday") || t.includes("sommer")) return "0801"; // Sommerhuse
  if (t.includes("condo") || t.includes("apartment") || t.includes("cooperative") || t.includes("lejlighed"))
    return "2103"; // Ejerlejligheder
  return "0111"; // Enfamiliehuse (villa, terraced, farm, …)
}

function areaFor(region?: string | null): string {
  if (!region) return "000";
  return AREA[region.toLowerCase()] ?? KOMMUNE_AREA[region.toLowerCase()] ?? "000";
}

type Series = { period: string; value: number }[];

async function fetchIndexSeries(area: string, category: string): Promise<Series | null> {
  try {
    const url = `${DST}?OMR%C3%85DE=${area}&EJENDOMSKATE=${category}&TAL=100&Tid=*`;
    const res = await fetch(url, { next: { revalidate: 86400 } });
    if (!res.ok) return null;
    const d = await res.json();
    const ds = d?.dataset;
    const values: number[] = ds?.value ?? [];
    const labels: Record<string, string> = ds?.dimension?.Tid?.category?.label ?? {};
    const periods = Object.values(labels);
    if (!values.length || values.length !== periods.length) return null;
    return periods.map((period, i) => ({ period, value: values[i] })).filter((p) => Number.isFinite(p.value));
  } catch {
    return null;
  }
}

/**
 * Long-run annual appreciation (%) for a region+type, from DST's realized-sale
 * price index — computed as the CAGR over the most recent ~10 years available.
 * Clamped to a sane 0–8 % and rounded to 1 decimal. null if unavailable.
 */
export async function getDstAppreciationPct(region?: string | null, type?: string): Promise<number | null> {
  const series = await fetchIndexSeries(areaFor(region), categoryFor(type));
  if (!series || series.length < 8) return null;
  const window = series.slice(-40); // ~10 years of quarters
  const first = window[0].value;
  const last = window[window.length - 1].value;
  if (!(first > 0) || !(last > 0)) return null;
  const years = (window.length - 1) / 4;
  if (years <= 0) return null;
  const cagr = (Math.pow(last / first, 1 / years) - 1) * 100;
  if (!Number.isFinite(cagr)) return null;
  return Math.round(Math.min(8, Math.max(0, cagr)) * 10) / 10;
}

/** Latest year-over-year change (%) for recent market momentum. null if n/a. */
export async function getDstLatestYoY(region?: string | null, type?: string): Promise<number | null> {
  const series = await fetchIndexSeries(areaFor(region), categoryFor(type));
  if (!series || series.length < 5) return null;
  const last = series[series.length - 1].value;
  const yearAgo = series[series.length - 5].value; // 4 quarters back
  if (!(yearAgo > 0)) return null;
  const yoy = ((last - yearAgo) / yearAgo) * 100;
  return Number.isFinite(yoy) ? Math.round(yoy * 10) / 10 : null;
}
