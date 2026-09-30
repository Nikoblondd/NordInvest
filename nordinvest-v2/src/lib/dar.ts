// Address → BFE (Bestemt Fast Ejendom) number.
//
// The Datafordeler DAR_BFE_Public service requires the same tjenestebruger auth
// as BBR. To keep this step reliable and auth-free we resolve the BFE through
// the official, free DAWA API (Danmarks Adressers Web API):
//   address → adgangsadresse → matrikel (ejerlav+matrikelnr) → jordstykke.bfenummer
// The DAR base URL is kept for reference / future certificate-based access.

/* eslint-disable @typescript-eslint/no-explicit-any */
export const DAR_BASE = "https://services.datafordeler.dk/DAR/DAR_BFE_Public/1/REST";
const DAWA = "https://api.dataforsyningen.dk";

export type AddressResolution = {
  bfe: string | null;
  husnummerId: string | null;
  kommunekode: string | null;
  betegnelse: string | null;
};

async function j(url: string): Promise<any> {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`DAWA HTTP ${res.status}`);
  return res.json();
}

export async function getAddressToBFE(adresse: string): Promise<AddressResolution> {
  const empty: AddressResolution = { bfe: null, husnummerId: null, kommunekode: null, betegnelse: null };
  if (!adresse?.trim()) return empty;

  // 1) Free-text → best matching access address.
  const matches = await j(`${DAWA}/adgangsadresser?q=${encodeURIComponent(adresse)}&per_side=1&struktur=mini`);
  const hit = Array.isArray(matches) ? matches[0] : null;
  if (!hit?.id) return empty;

  const base: AddressResolution = {
    bfe: null,
    husnummerId: hit.id,
    kommunekode: hit.kommunekode ?? null,
    betegnelse: hit.betegnelse ?? null,
  };

  // 2) Full record → matrikel (ejerlav + matrikelnr).
  const full = await j(`${DAWA}/adgangsadresser/${hit.id}`).catch(() => null);
  const jord = full?.jordstykke;
  const ejerlav = jord?.ejerlav?.kode;
  const matrikelnr = jord?.matrikelnr;
  if (!ejerlav || !matrikelnr) return base;

  // 3) Matrikel → jordstykke → BFE number.
  const stk = await j(
    `${DAWA}/jordstykker?ejerlavkode=${encodeURIComponent(ejerlav)}&matrikelnr=${encodeURIComponent(matrikelnr)}`,
  ).catch(() => []);
  const bfe = Array.isArray(stk) && stk[0]?.bfenummer ? String(stk[0].bfenummer) : null;

  return { ...base, bfe };
}
