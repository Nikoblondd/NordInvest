// Address → BFE (Bestemt Fast Ejendom) number + coordinates.
//
// DAWA (api.dataforsyningen.dk / dawa.aws.dk) is shut down — every endpoint
// answers 410 Gone. The replacement is Datafordeler's GraphQL "FlexibleCurrent"
// service, which allows filtering on non-id fields and only returns currently
// valid objects:
//   DAR_Husnummer (adgangsadressebetegnelse startsWith "Vej 12,")
//     → DAR_Adressepunkt.position                    (EPSG:25832 point)
//     → MAT_Jordstykke.samletFastEjendomLokalId      (= BFE) + kommuneLokalId
// Auth is the API key of the Datafordeler tjenestebruger "NordInvest"
// (DATAFORDELER_API_KEY). Server-side only. Every step degrades to null.

const GQL = "https://graphql.datafordeler.dk/FlexibleCurrent/v1";
const TIMEOUT_MS = 8000;

export type AddressResolution = {
  bfe: string | null;
  husnummerId: string | null;
  kommunekode: string | null;
  betegnelse: string | null;
};

export type ResolvedAddress = AddressResolution & {
  /** Adgangspunkt in UTM32 (EPSG:25832). */
  x: number | null;
  y: number | null;
};

async function gql<T>(query: string, variables: Record<string, unknown>): Promise<T | null> {
  const key = process.env.DATAFORDELER_API_KEY;
  if (!key) return null;
  try {
    const res = await fetch(`${GQL}?apiKey=${encodeURIComponent(key)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query, variables: { ...variables, t: new Date().toISOString() } }),
      cache: "no-store",
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!res.ok) return null;
    const json = (await res.json()) as { data?: T; errors?: unknown[] };
    if (json.errors?.length) return null;
    return json.data ?? null;
  } catch {
    return null;
  }
}

type Husnummer = {
  id_lokalId: string;
  adgangsadressebetegnelse: string;
  adgangspunkt: string | null;
  jordstykke: string | null;
  status: string | null;
};

const HUSNUMMER_Q = `query($p: String!, $t: DafDateTime!) {
  DAR_Husnummer(first: 100, virkningstid: $t, where: { adgangsadressebetegnelse: { startsWith: $p } }) {
    nodes { id_lokalId adgangsadressebetegnelse adgangspunkt jordstykke status }
  }
}`;

const PUNKT_Q = `query($id: String!, $t: DafDateTime!) {
  DAR_Adressepunkt(first: 1, virkningstid: $t, where: { id_lokalId: { eq: $id } }) {
    nodes { position { wkt } }
  }
}`;

const JORDSTYKKE_Q = `query($id: String!, $t: DafDateTime!) {
  MAT_Jordstykke(first: 1, virkningstid: $t, where: { id_lokalId: { eq: $id } }) {
    nodes { samletFastEjendomLokalId kommuneLokalId }
  }
}`;

/** Split free text ("Nørrebrogade 40, 3. th, 2200 København N") into the
 *  husnummer prefix DAR indexes on ("Nørrebrogade 40") and the postnummer.
 *  Floor/door tokens fall away because only street + husnr + postnr are kept. */
export function parseAddress(input: string): { vejHusnr: string; postnr: string | null } | null {
  const s = input.replace(/\s+/g, " ").trim();
  const m = s.match(/^(.+?\D)\s*(\d{1,4})\s*([A-Za-zÆØÅæøå])?(?=[\s,.]|$)/);
  if (!m) return null;
  const vej = m[1].replace(/[\s,]+$/, "").trim();
  if (vej.length < 2) return null;
  const husnr = m[2] + (m[3] ? m[3].toUpperCase() : "");
  const postnr = s.slice(m[0].length).match(/\b(\d{4})\b/)?.[1] ?? null;
  return { vejHusnr: `${vej} ${husnr}`, postnr };
}

async function findHusnummer(adresse: string): Promise<Husnummer | null> {
  const parsed = parseAddress(adresse);
  if (!parsed) return null;
  const { vejHusnr, postnr } = parsed;

  // DAR matching is case-sensitive; retry "nørrebrogade 40" as "Nørrebrogade 40".
  const prefixes = [vejHusnr];
  const cap = vejHusnr.charAt(0).toUpperCase() + vejHusnr.slice(1);
  if (cap !== vejHusnr) prefixes.push(cap);

  for (const p of prefixes) {
    const data = await gql<{ DAR_Husnummer: { nodes: Husnummer[] } }>(HUSNUMMER_Q, { p: `${p},` });
    // status 2 = foreløbig, 3 = gældende.
    const nodes = (data?.DAR_Husnummer.nodes ?? []).filter((n) => !n.status || n.status === "2" || n.status === "3");
    if (nodes.length === 0) continue;
    if (postnr) {
      const hit = nodes.find((n) => n.adgangsadressebetegnelse.includes(`, ${postnr} `));
      if (hit) return hit;
      continue;
    }
    // No postnummer: only trust an unambiguous match — a wrong BFE is worse than none.
    return nodes.length === 1 ? nodes[0] : null;
  }
  return null;
}

/** Full resolution: husnummer → coordinates + BFE + kommunekode. */
export async function resolveAddress(adresse: string): Promise<ResolvedAddress | null> {
  if (!adresse?.trim()) return null;
  const hit = await findHusnummer(adresse);
  if (!hit) return null;

  const [punkt, jord] = await Promise.all([
    hit.adgangspunkt
      ? gql<{ DAR_Adressepunkt: { nodes: { position: { wkt: string } | null }[] } }>(PUNKT_Q, { id: hit.adgangspunkt })
      : null,
    hit.jordstykke
      ? gql<{ MAT_Jordstykke: { nodes: { samletFastEjendomLokalId: string; kommuneLokalId: string }[] } }>(
          JORDSTYKKE_Q,
          { id: hit.jordstykke },
        )
      : null,
  ]);

  const wkt = punkt?.DAR_Adressepunkt.nodes[0]?.position?.wkt ?? "";
  const xy = wkt.match(/POINT\s*\(\s*([\d.]+)\s+([\d.]+)/);
  const js = jord?.MAT_Jordstykke.nodes[0];

  return {
    bfe: js?.samletFastEjendomLokalId ? String(js.samletFastEjendomLokalId) : null,
    husnummerId: hit.id_lokalId,
    kommunekode: js?.kommuneLokalId ?? null,
    betegnelse: hit.adgangsadressebetegnelse,
    x: xy ? Number(xy[1]) : null,
    y: xy ? Number(xy[2]) : null,
  };
}

export async function getAddressToBFE(adresse: string): Promise<AddressResolution> {
  const r = await resolveAddress(adresse);
  if (!r) return { bfe: null, husnummerId: null, kommunekode: null, betegnelse: null };
  return { bfe: r.bfe, husnummerId: r.husnummerId, kommunekode: r.kommunekode, betegnelse: r.betegnelse };
}
