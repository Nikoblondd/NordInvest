/**
 * Udgifts-tjek — P4 from the r/investering user research. The single most
 * specific, actionable line from the thread's core source (Ok-Psychology-3006,
 * who built their own DD tool):
 *
 *   "Mægler har jo lavet et budget, og det kan du starte med at kvalificere.
 *    Uden at sige for meget er udgiftssiden ofte sat for lavt."
 *
 * i.e. the broker's stated monthly expenses (ejerudgift) are frequently
 * under-budgeted, and buyers have no independent way to check that without
 * manually pulling comparable listings. We already do exactly that for price
 * ([[nordinvest-comparables]]) — same Boligsiden pool carries `monthlyExpense`
 * for every listing, so we can benchmark opex per m² the same way.
 */
const BS_BASE = "https://api.boligsiden.dk/search/cases";

const TYPE_MAP: Record<string, string> = {
  condo: "condo",
  villa: "villa",
  terraced: "terraced",
  cooperative: "cooperative",
  holiday: "holidayHouse",
  farm: "farm",
  houseWithFlat: "houseWithFlat",
  villa_apartment: "villaApartment",
};

export type ExpenseCheckResult =
  | {
      ok: true;
      sampleSize: number;
      medianExpensePerM2: number;
      statedExpense: number;
      statedExpensePerM2: number;
      /** % below (-) or above (+) the comparable median. */
      deltaPct: number;
      verdict: "undervurderet" | "normal" | "høj";
    }
  | { ok: false; reason: "no_matches" | "bad_input" | "fetch_failed" };

function median(sorted: number[]): number {
  if (sorted.length === 0) return 0;
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

export async function checkExpense(
  zip: string,
  internalType: string,
  areaM2: number,
  statedMonthlyExpense: number,
): Promise<ExpenseCheckResult> {
  if (!zip || !areaM2 || areaM2 <= 10 || statedMonthlyExpense == null || statedMonthlyExpense < 0) {
    return { ok: false, reason: "bad_input" };
  }
  const bsType = TYPE_MAP[internalType] ?? "condo";
  const minArea = Math.floor(areaM2 * 0.7);
  const maxArea = Math.ceil(areaM2 * 1.3);
  const url =
    `${BS_BASE}?zipCodes=${encodeURIComponent(zip)}` +
    `&addressTypes=${bsType}` +
    `&housingArea=${minArea}-${maxArea}` +
    `&per_page=40`;

  let json: unknown;
  try {
    const res = await fetch(url, {
      headers: { "user-agent": "nordinvest/1.0" },
      next: { revalidate: 86_400 },
    });
    if (!res.ok) return { ok: false, reason: "fetch_failed" };
    json = await res.json();
  } catch {
    return { ok: false, reason: "fetch_failed" };
  }

  const cases: unknown[] = Array.isArray((json as { cases?: unknown[] })?.cases)
    ? (json as { cases: unknown[] }).cases
    : [];

  const perM2: number[] = [];
  for (const raw of cases) {
    const c = raw as Record<string, unknown>;
    const exp = Number(c.monthlyExpense);
    const area = Number(c.housingArea);
    if (!exp || exp <= 0 || !area || area <= 10) continue;
    perM2.push(exp / area);
  }

  if (perM2.length < 3) return { ok: false, reason: "no_matches" };

  perM2.sort((a, b) => a - b);
  const med = median(perM2);
  const statedPerM2 = statedMonthlyExpense / areaM2;
  const delta = med > 0 ? ((statedPerM2 - med) / med) * 100 : 0;

  let verdict: "undervurderet" | "normal" | "høj";
  if (delta <= -20) verdict = "undervurderet";
  else if (delta >= 25) verdict = "høj";
  else verdict = "normal";

  return {
    ok: true,
    sampleSize: perM2.length,
    medianExpensePerM2: med,
    statedExpense: statedMonthlyExpense,
    statedExpensePerM2: statedPerM2,
    deltaPct: delta,
    verdict,
  };
}
