// Fremtidige byrder — the public data no Danish property analyzer surfaces
// today but every professional investor accounts for before signing:
//
//   • Lokalplan-forslag  → a proposed municipal plan that could change what's
//     allowed on THIS property, or on the neighbour's plot, in the near future.
//   • Lokalplan vedtaget → the plan currently in force (context for what CAN
//     change).
//   • Kommuneplanramme   → municipal-plan zoning caps (max bebygpct, height,
//     use category) that constrain any future re-development.
//   • Kloakopland        → sewer classification. Fælleskloakering (combined
//     sewer) usually means future separatkloakering with 40-100k+ owner cost.
//
// All queries hit plandata's public WFS at geoserver.plandata.dk — no auth,
// no quota, GeoJSON responses. The address→coord step goes through DAWA in
// UTM32 (EPSG:25832) so we can drop a POINT filter straight onto the WFS.

const DAWA = "https://api.dataforsyningen.dk";
const WFS = "https://geoserver.plandata.dk/geoserver/ows";

const wfsQuery = (typeName: string, x: number, y: number, count = 5) =>
  `${WFS}?service=WFS&version=2.0.0&request=GetFeature` +
  `&typeNames=${encodeURIComponent(typeName)}` +
  `&outputFormat=application/json` +
  `&count=${count}` +
  `&CQL_FILTER=${encodeURIComponent(`INTERSECTS(geometri,POINT(${x} ${y}))`)}`;

// Also fetch nearby (500 m radius) proposed plans — a neighbour lokalplan-
// forslag can dramatically change what your property is worth next door to.
const wfsRadiusQuery = (typeName: string, x: number, y: number, radiusMeters = 500, count = 5) =>
  `${WFS}?service=WFS&version=2.0.0&request=GetFeature` +
  `&typeNames=${encodeURIComponent(typeName)}` +
  `&outputFormat=application/json` +
  `&count=${count}` +
  `&CQL_FILTER=${encodeURIComponent(`DWITHIN(geometri,POINT(${x} ${y}),${radiusMeters},meters)`)}`;

/** Strip floor/door tokens ("1.tv", "st. th", "2 mf") so DAWA's building-
 *  level `/adgangsadresser` finds the address. The plandata lookups are
 *  point-in-polygon, so building-level precision is enough. */
function stripFloorAndDoor(address: string): string {
  return address
    // remove tokens like " 1.tv", " 1 tv", " 1.th.", " 2.mf.", " st.", " kl.", " -1"
    .replace(/\s+(?:st(?:uen)?|kld|kl|nord|syd|vest|oest|øst|tv|th|mf|ov|nd)\b\.?/gi, "")
    .replace(/\s+\d{1,2}(?:\.|\s)(?:st|kld|kl|tv|th|mf|ov|nd|nord|syd|vest|oest|øst)\b\.?/gi, "")
    .replace(/\s+\d{1,2}\.(?=\s)/g, " ") // lone " 2." between street and zip
    .replace(/\s{2,}/g, " ")
    .trim();
}

/** DAWA → adgangspunkt in EPSG:25832 (UTM32). The `mini` struct returns
 *  coordinates flat as `x`/`y` when `srid=25832`; the full struct nests them
 *  under `adgangspunkt.koordinater`. Read both. */
async function addressToCoord(address: string): Promise<{
  x: number;
  y: number;
  kommunekode: string | null;
  betegnelse: string;
} | null> {
  const clean = stripFloorAndDoor(address);
  try {
    const q = `${DAWA}/adgangsadresser?q=${encodeURIComponent(clean)}&per_side=1&srid=25832&struktur=mini`;
    const res = await fetch(q, { next: { revalidate: 60 * 60 * 24 * 7 } });
    if (!res.ok) return null;
    const rows = (await res.json()) as Array<{
      x?: number;
      y?: number;
      adgangspunkt?: { koordinater?: [number, number] };
      betegnelse?: string;
      kommunekode?: string;
    }>;
    const hit = rows?.[0];
    if (!hit) return null;
    let x: number | undefined;
    let y: number | undefined;
    if (Number.isFinite(hit.x) && Number.isFinite(hit.y)) {
      x = hit.x;
      y = hit.y;
    } else if (hit.adgangspunkt?.koordinater?.length === 2) {
      x = hit.adgangspunkt.koordinater[0];
      y = hit.adgangspunkt.koordinater[1];
    }
    if (x == null || y == null) return null;
    return {
      x,
      y,
      kommunekode: hit.kommunekode ?? null,
      betegnelse: hit.betegnelse ?? address,
    };
  } catch {
    return null;
  }
}

type WfsFeature = {
  properties: Record<string, string | number | null | undefined>;
};

async function wfs(url: string): Promise<WfsFeature[]> {
  try {
    const res = await fetch(url, { next: { revalidate: 60 * 60 * 24 } });
    if (!res.ok) return [];
    const j = (await res.json()) as { features?: WfsFeature[] };
    return Array.isArray(j.features) ? j.features : [];
  } catch {
    return [];
  }
}

// Format YYYYMMDD → "22. jan. 2024".
function fmtPlanDate(raw: string | number | null | undefined): string | null {
  if (raw == null) return null;
  const s = String(raw).slice(0, 8);
  if (!/^\d{8}$/.test(s)) return null;
  const y = Number(s.slice(0, 4));
  const m = Number(s.slice(4, 6));
  const d = Number(s.slice(6, 8));
  const months = ["jan.", "feb.", "mar.", "apr.", "maj", "jun.", "jul.", "aug.", "sep.", "okt.", "nov.", "dec."];
  if (m < 1 || m > 12) return null;
  return `${d}. ${months[m - 1]} ${y}`;
}

// Kloakopland: severity is decided by the PLAN change (plankode != null and
// != nuvkode implies future separatkloakering or similar work with a grundejer-
// andel typically 40-100k+ kr) — not just by the current status. The current
// status feeds context. Both come with human-readable teksts on the feature
// itself, so we don't hardcode codelists.
function severityForKloak(nuvtekst: string, plantekst: string | null): "safe" | "watch" | "burden" {
  // A planned change is the loudest signal.
  if (plantekst && plantekst.trim() && plantekst !== nuvtekst) return "burden";
  const t = nuvtekst.toLowerCase();
  if (t.includes("separat")) return "safe";
  if (t.includes("fælles") || t.includes("faelles")) return "burden";
  if (t.includes("ikke kloak") || t.includes("privat")) return "burden";
  return "watch";
}

export type Burden = {
  kind: "lokalplan-forslag" | "lokalplan-vedtaget" | "kommuneplanramme" | "kloakopland" | "lokalplan-forslag-nabolag";
  severity: "safe" | "watch" | "burden";
  title: string;
  detail: string;
  meta: string | null;
  planNr?: string | number | null;
  planDate?: string | null;
  planLink?: string | null;
};

export type FutureBurdens = {
  address: string;
  kommunekode: string | null;
  burdens: Burden[];
  hasData: boolean;
  checkedAt: string;
};

function plandataInfoLink(komnr: string | number | null | undefined, plannr: string | number | null | undefined): string | null {
  // Plandata's public plan-info page. Robust to komnr being null.
  if (!plannr) return null;
  return `https://planinfo.erhvervsstyrelsen.dk/plandata${komnr ? `?komnr=${komnr}` : ""}${plannr ? `&plannr=${plannr}` : ""}`;
}

export async function getFutureBurdens(address: string): Promise<FutureBurdens | null> {
  const coord = await addressToCoord(address);
  if (!coord) return null;

  const [
    lpForslag,
    lpVedtaget,
    lpForslagRadius,
    kpramme,
    kloak,
  ] = await Promise.all([
    wfs(wfsQuery("pdk:theme_pdk_lokalplan_forslag", coord.x, coord.y, 3)),
    wfs(wfsQuery("pdk:theme_pdk_lokalplan_vedtaget", coord.x, coord.y, 3)),
    wfs(wfsRadiusQuery("pdk:theme_pdk_lokalplan_forslag", coord.x, coord.y, 500, 5)),
    wfs(wfsQuery("pdk:theme_pdk_kommuneplanramme_vedtaget", coord.x, coord.y, 2)),
    wfs(wfsQuery("pdk:theme_pdk_kloakopland_vedtaget", coord.x, coord.y, 2)),
  ]);

  const burdens: Burden[] = [];

  // 1. Lokalplan-forslag PÅ ejendommen — the loudest alarm bell
  for (const f of lpForslag) {
    const p = f.properties;
    const name = String(p.plannavn ?? "Ikke-navngivet forslag");
    burdens.push({
      kind: "lokalplan-forslag",
      severity: "burden",
      title: `Lokalplan-forslag på ejendommen: ${name}`,
      detail: `Et lokalplan-forslag er i offentliggørelse på denne matrikel. Bebyggelsesregler, anvendelse og evt. udnyttelse kan ændres ved vedtagelse.`,
      meta: fmtPlanDate(p.datoforsl) ? `Offentliggjort ${fmtPlanDate(p.datoforsl)}` : "Aktuelt forslag",
      planNr: p.plannr ?? null,
      planDate: fmtPlanDate(p.datoforsl),
      planLink: plandataInfoLink(p.komnr, p.plannr),
    });
  }

  // 2. Lokalplan-forslag i 500 m radius — only if none directly on the property
  //    (skip duplicates)
  if (lpForslag.length === 0) {
    // dedupe by plannr
    const seen = new Set<string>();
    for (const f of lpForslagRadius) {
      const p = f.properties;
      const key = `${p.komnr}:${p.plannr}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const name = String(p.plannavn ?? "Ikke-navngivet forslag");
      burdens.push({
        kind: "lokalplan-forslag-nabolag",
        severity: "watch",
        title: `Lokalplan-forslag i nabolaget: ${name}`,
        detail: `Et lokalplan-forslag er i offentliggørelse i nærområdet (indenfor 500 m). Kan påvirke udsigt, trafik eller nabo-byggeri.`,
        meta: fmtPlanDate(p.datoforsl) ? `Offentliggjort ${fmtPlanDate(p.datoforsl)}` : "Aktuelt forslag",
        planNr: p.plannr ?? null,
        planDate: fmtPlanDate(p.datoforsl),
        planLink: plandataInfoLink(p.komnr, p.plannr),
      });
    }
  }

  // 3. Kloakopland — read the plain-text status (nuvtekst) + any planned change
  //    (plantekst). Planned change = future burden (separatkloakering costs
  //    grundejeren typically 40-100k+ kr).
  for (const f of kloak) {
    const p = f.properties;
    const nuv = String(p.nuvtekst ?? "");
    const plan = p.plantekst ? String(p.plantekst) : null;
    if (!nuv) continue;
    const severity = severityForKloak(nuv, plan);
    const plannedYear = p.ikraftaar ?? p.startaar ?? null;
    const detail =
      plan && plan !== nuv
        ? `Kommunen har planlagt at ændre status til: ${plan}${plannedYear ? ` (planlagt ikrafttræden ${plannedYear})` : ""}. Kan udløse en grundejerandel til nyt kloaknet.`
        : nuv.toLowerCase().includes("separat")
        ? "Regn- og spildevand er allerede adskilt — ingen kommende separeringsbyrde."
        : nuv.toLowerCase().includes("fælles")
        ? "Kombineret kloaknet. Kommuner udruller løbende separatkloakering — hold øje med spildevandsplanen."
        : "Se kommunens spildevandsplan for detaljer om tilslutning og evt. planlagte ændringer.";
    // Weblink often points straight to the kommune's spildevands-side.
    const weblink = p.weblink ? String(p.weblink) : null;
    burdens.push({
      kind: "kloakopland",
      severity,
      title: `Kloak-status: ${nuv}${plan && plan !== nuv ? ` → ${plan}` : ""}`,
      detail,
      meta: fmtPlanDate(p.datovedt) ? `Vedtaget ${fmtPlanDate(p.datovedt)}` : null,
      planNr: p.plannr ?? null,
      planDate: fmtPlanDate(p.datovedt),
      planLink: weblink,
    });
  }

  // 4. Kommuneplan-rammer — the constraints ANY future re-development lives under
  for (const f of kpramme) {
    const p = f.properties;
    const name = String(p.plannavn ?? "Kommuneplan-ramme");
    const bebygpct = p.maxbebygpct ?? p.maxbebygprocent ?? null;
    const height = p.maxbygningshoejde ?? null;
    const parts: string[] = [];
    if (bebygpct) parts.push(`Max bebyggelse ${bebygpct} %`);
    if (height) parts.push(`Max højde ${height} m`);
    const detail =
      parts.length > 0
        ? `Rammen sætter loft over hvad der kan bygges: ${parts.join(", ")}.`
        : "Rammen sætter loft over hvad der kan bygges på matriklen.";
    burdens.push({
      kind: "kommuneplanramme",
      severity: "safe",
      title: `Kommuneplan-ramme: ${name}`,
      detail,
      meta: fmtPlanDate(p.datovedt) ? `Vedtaget ${fmtPlanDate(p.datovedt)}` : null,
      planNr: p.plannr ?? null,
      planDate: fmtPlanDate(p.datovedt),
      planLink: plandataInfoLink(p.komnr, p.plannr),
    });
  }

  // 5. Lokalplan vedtaget — always show as context (not a burden per se)
  for (const f of lpVedtaget) {
    const p = f.properties;
    const name = String(p.plannavn ?? "Vedtaget lokalplan");
    burdens.push({
      kind: "lokalplan-vedtaget",
      severity: "safe",
      title: `Gældende lokalplan: ${name}`,
      detail: `Denne lokalplan er den nuværende ramme for hvad der er tilladt på ejendommen.`,
      meta: fmtPlanDate(p.datovedt) ? `Vedtaget ${fmtPlanDate(p.datovedt)}` : null,
      planNr: p.plannr ?? null,
      planDate: fmtPlanDate(p.datovedt),
      planLink: plandataInfoLink(p.komnr, p.plannr),
    });
  }

  return {
    address: coord.betegnelse,
    kommunekode: coord.kommunekode,
    burdens,
    hasData: burdens.length > 0,
    checkedAt: new Date().toISOString(),
  };
}
