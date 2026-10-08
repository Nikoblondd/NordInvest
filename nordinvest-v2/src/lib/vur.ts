/*
 * Offentlig ejendomsvurdering (VUR) from Datafordeler's GraphQL service:
 * BFE → VUR_BFEKrydsreference → VUR_Ejendomsvurdering. Free data, read with
 * the API key (DATAFORDELER_API_KEY), server-side only. Every step degrades
 * to null so an analysis never waits on it.
 */

const GQL = "https://graphql.datafordeler.dk/FlexibleCurrent/v1";

export type Valuation = { year: number; propertyValue: number | null; landValue: number | null; lotArea: number | null };
export type VurResult = { bfe: number; latest: Valuation; history: Valuation[] };

async function gql<T>(query: string): Promise<T | null> {
  const key = process.env.DATAFORDELER_API_KEY;
  if (!key) return null;
  try {
    const res = await fetch(`${GQL}?apiKey=${encodeURIComponent(key)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query }),
      // Not cached here: a rejected key must never stick. The route caches
      // successful answers at the edge instead.
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) return null;
    const j = (await res.json()) as { data?: T; errors?: unknown[] };
    return j.errors?.length ? null : j.data ?? null;
  } catch {
    return null;
  }
}

export async function getValuation(bfe: number): Promise<VurResult | null> {
  if (!Number.isInteger(bfe) || bfe <= 0) return null;
  const t = new Date().toISOString();
  const kryds = await gql<{ VUR_BFEKrydsreference: { nodes: { fkEjendomsvurderingID: number }[] } }>(
    `{ VUR_BFEKrydsreference(first: 100, virkningstid: "${t}", where: { BFEnummer: { eq: ${bfe} } }) { nodes { fkEjendomsvurderingID } } }`,
  );
  const ids = Array.from(new Set((kryds?.VUR_BFEKrydsreference.nodes ?? []).map((n) => n.fkEjendomsvurderingID).filter(Boolean)));
  if (!ids.length) return null;
  const vur = await gql<{ VUR_Ejendomsvurdering: { nodes: { aar: number; ejendomvaerdiBeloeb: number | null; grundvaerdiBeloeb: number | null; vurderetAreal: number | null }[] } }>(
    `{ VUR_Ejendomsvurdering(first: 100, virkningstid: "${t}", where: { id: { in: [${ids.join(",")}] } }) { nodes { aar ejendomvaerdiBeloeb grundvaerdiBeloeb vurderetAreal } } }`,
  );
  // One valuation per year: the highest value wins when a year has several
  // (a re-assessment), and years without any amount are dropped.
  const byYear = new Map<number, Valuation>();
  for (const n of vur?.VUR_Ejendomsvurdering.nodes ?? []) {
    if (!n.aar || (!n.ejendomvaerdiBeloeb && !n.grundvaerdiBeloeb)) continue;
    const v: Valuation = { year: n.aar, propertyValue: n.ejendomvaerdiBeloeb || null, landValue: n.grundvaerdiBeloeb || null, lotArea: n.vurderetAreal || null };
    const prev = byYear.get(n.aar);
    if (!prev || (v.propertyValue ?? 0) > (prev.propertyValue ?? 0)) byYear.set(n.aar, v);
  }
  const history = Array.from(byYear.values()).sort((a, b) => a.year - b.year);
  if (!history.length) return null;
  return { bfe, latest: history[history.length - 1], history };
}
