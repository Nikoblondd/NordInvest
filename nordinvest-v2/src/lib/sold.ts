/*
 * Tinglyste salgspriser per postnummer and type, from the sold_prices table
 * the market agent fills (agent/ejf.mjs). Only ordinary sales from the last
 * 24 months count. Returns null until there is enough data, so every caller
 * keeps working on asking prices until then.
 */

const TYPE: Record<string, string> = { villa: "villa", condo: "condo", terraced: "terraced house", "terraced house": "terraced house" };

export type SoldStats = { n: number; medianM2: number; medianDiscount: number | null; asOf: string };

const median = (xs: number[]) => {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

export async function getSoldStats(zip: string, type: string): Promise<SoldStats | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key || !/^\d{4}$/.test(zip)) return null;
  const since = new Date(Date.now() - 730 * 86400_000).toISOString().slice(0, 10);
  try {
    const res = await fetch(
      `${url}/rest/v1/sold_prices?select=price_m2,discount_pct,transfer,sale_date&zip=eq.${zip}&type=eq.${encodeURIComponent(TYPE[type] ?? type)}&sale_date=gte.${since}&limit=1000`,
      { headers: { apikey: key, Authorization: `Bearer ${key}` }, next: { revalidate: 21_600 }, signal: AbortSignal.timeout(6000) },
    );
    if (!res.ok) return null; // table not there yet
    const rows = (await res.json()) as { price_m2: number; discount_pct: number | null; transfer: string | null; sale_date: string }[];
    // Family transfers and other non-market sales would drag prices down.
    const free = rows.filter((r) => !r.transfer || /fri handel/i.test(r.transfer));
    if (free.length < 5) return null;
    const m2 = median(free.map((r) => r.price_m2).filter((x) => x > 0));
    if (!m2) return null;
    const disc = median(free.map((r) => r.discount_pct).filter((x): x is number => x != null && x > -30 && x < 60));
    return { n: free.length, medianM2: Math.round(m2), medianDiscount: disc != null ? Math.round(disc * 10) / 10 : null, asOf: free.map((r) => r.sale_date).sort().pop() ?? "" };
  } catch {
    return null;
  }
}
