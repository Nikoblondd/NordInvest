/* eslint-disable @typescript-eslint/no-explicit-any */
import { getAddressToBFE } from "@/lib/dar";
import { datafordelerConfigured, getBygningerByGrund, getEnhederByBygning, getGrundByBFE } from "@/lib/datafordeler";
import { getValuation } from "@/lib/vur";
import { estimateMonthlyRent } from "@/lib/rent-estimate";
import landTax from "@/data/grundskyld.json";

/*
 * The public record of one investment property, gathered once and stored with
 * the analysis: units and areas from BBR (each flat, each commercial unit),
 * building materials and heating as risk flags, the public valuation (VUR),
 * an estimate of the land tax from the land value and the municipality's
 * rate (Danmarks Statistik, PSKAT), and a market-rent check per flat.
 * Every part degrades to null; nothing here blocks an analysis.
 */

export type Risk = { title: string; note: string; level: "hoej" | "middel" };

export type Dossier = {
  bfe: string;
  kommunekode: string | null;
  kommune: string | null;
  valuation: { year: number; propertyValue: number | null; landValue: number | null } | null;
  landTax: { promille: number; year: number; annual: number } | null;
  units: { residential: number; residentialArea: number; commercial: number; commercialArea: number; flats: number[] } | null;
  building: { builtYear: number | null; renovatedYear: number | null; area: number | null; floors: number | null; roof: string | null; wall: string | null; heating: string | null; fuel: string | null } | null;
  risks: Risk[];
  /** Market rent for the flats, from their BBR sizes and the postnummer (kr. a year). Residential only. */
  marketRent: { annual: number; flats: number; zip: number } | null;
  fetchedAt: string;
};

const RETIRED = new Set(["9", "10", "11", "12", "14"]);
const live = (rows: any[]) => rows.filter((r) => !RETIRED.has(String(r?.status ?? "")));
const num = (v: unknown) => (v == null || v === "" || !Number.isFinite(Number(v)) ? null : Number(v));
const isHome = (code: unknown) => { const c = Number(code); return c >= 110 && c < 200; };

const ROOF: Record<string, string> = { "1": "Tagpap, fladt", "2": "Tagpap med hældning", "3": "Fibercement med asbest", "4": "Fibercement", "5": "Betontagsten", "6": "Tegl", "7": "Metal", "10": "Levende tag", "11": "Glas", "12": "Strå", "20": "PVC", "90": "Andet" };
const WALL: Record<string, string> = { "1": "Mursten", "2": "Letbeton", "3": "Fibercement med asbest", "4": "Bindingsværk", "5": "Træ", "6": "Betonelementer", "8": "Metal", "10": "Fibercement", "11": "Plast", "12": "Glas", "90": "Andet" };
const HEAT: Record<string, string> = { "1": "Fjernvarme", "2": "Centralvarme med eget fyr", "3": "Ovne", "5": "Varmepumpe", "6": "Centralvarme med to fyr", "7": "Elvarme", "8": "Gasradiatorer", "9": "Ingen varme", "99": "Blandet" };
const FUEL: Record<string, string> = { "1": "El", "2": "Gasværksgas", "3": "Olie", "4": "Fast brændsel", "6": "Halm", "7": "Naturgas", "9": "Andet" };
const label = (m: Record<string, string>, v: unknown) => (v == null ? null : m[String(v)] ?? null);

const RATES = landTax.rates as Record<string, { name: string; promille: number }>;

async function build(address: string, zip: number | null): Promise<Dossier | null> {
  if (!datafordelerConfigured()) return null;
  let a = await getAddressToBFE(address).catch(() => null);
  // Ranges and double addresses ("Hallandsgade 2-4/Amagerbrogade 38", "Jernbanegade 5A-C"):
  // try the first house number on its own.
  if (!a?.bfe) {
    const parts = address.split(",").map((x) => x.trim());
    const first = parts[0].split("/")[0].replace(/(\d+[A-Za-z]?)\s*-\s*\w+\b/, "$1").trim();
    const zipCity = parts.slice(1).find((x) => /\b\d{4}\b/.test(x));
    if (first !== parts[0] && zipCity) a = await getAddressToBFE(`${first}, ${zipCity}`).catch(() => null);
  }
  if (!a?.bfe) return null;
  const kommunekode = a.kommunekode ? a.kommunekode.padStart(4, "0") : null;
  const rate = kommunekode ? RATES[kommunekode] ?? null : null;

  const [vur, grund] = await Promise.all([
    getValuation(Number(a.bfe)).catch(() => null),
    getGrundByBFE(a.bfe).then((g) => live(g as any[])).catch(() => [] as any[]),
  ]);

  let buildings: any[] = [];
  for (const g of grund.slice(0, 3)) {
    buildings = live((await getBygningerByGrund(String(g.id_lokalId)).catch(() => [])) as any[]).filter((b) => (num(b.byg038SamletBygningsareal) ?? 0) > 0);
    if (buildings.length) break;
  }
  const units = (await Promise.all(buildings.slice(0, 8).map((b) => getEnhederByBygning(String(b.id_lokalId)).catch(() => [])))).flatMap((u) => live(u as any[]));
  const main = [...buildings].sort((x, y) => (num(y.byg038SamletBygningsareal) ?? 0) - (num(x.byg038SamletBygningsareal) ?? 0))[0];

  const homes = units.filter((u) => isHome(u.enh020EnhedensAnvendelse) && (num(u.enh026EnhedensSamledeAreal) ?? 0) > 0);
  const work = units.filter((u) => !isHome(u.enh020EnhedensAnvendelse) && (num(u.enh026EnhedensSamledeAreal) ?? 0) > 0);
  const flats = homes.map((u) => num(u.enh026EnhedensSamledeAreal)!).sort((x, y) => x - y);
  const sum = (xs: any[]) => xs.reduce((s, u) => s + (num(u.enh026EnhedensSamledeAreal) ?? 0), 0);

  const built = num(main?.byg026Opførelsesår), reno = num(main?.byg027OmTilbygningsår);
  const building = main ? {
    builtYear: built && built > 1600 ? built : null,
    renovatedYear: reno && built && reno > built ? reno : null,
    area: buildings.reduce((s, b) => s + (num(b.byg038SamletBygningsareal) ?? 0), 0) || null,
    floors: num(main.byg054AntalEtager),
    roof: label(ROOF, main.byg033Tagdækningsmateriale),
    wall: label(WALL, main.byg032YdervæggensMateriale),
    heating: label(HEAT, main.byg056Varmeinstallation),
    fuel: label(FUEL, main.byg057Opvarmningsmiddel),
  } : null;

  const risks: Risk[] = [];
  for (const b of buildings) {
    if (String(b.byg033Tagdækningsmateriale) === "3") { risks.push({ level: "hoej", title: "Asbest i taget", note: "BBR registrerer tag af fibercement med asbest. Udskiftning kræver anmeldelse og særlig håndtering og bør indgå i vedligeholdelsesplanen." }); break; }
  }
  for (const b of buildings) {
    if (String(b.byg032YdervæggensMateriale) === "3") { risks.push({ level: "hoej", title: "Asbest i facaden", note: "BBR registrerer ydervægge af fibercement med asbest." }); break; }
  }
  if (main && String(main.byg057Opvarmningsmiddel) === "3") risks.push({ level: "hoej", title: "Oliefyr", note: "Bygningen opvarmes med olie ifølge BBR. Regn med udskiftning til varmepumpe eller fjernvarme." });
  if (main && (String(main.byg057Opvarmningsmiddel) === "7" || String(main.byg056Varmeinstallation) === "8")) risks.push({ level: "middel", title: "Gasopvarmning", note: "Bygningen opvarmes med gas ifølge BBR. Mange kommuner udfaser gas i de kommende år, så tjek kommunens varmeplan." });
  if (main && (String(main.byg056Varmeinstallation) === "7" || String(main.byg057Opvarmningsmiddel) === "1") && String(main.byg056Varmeinstallation) !== "5") risks.push({ level: "middel", title: "Elvarme", note: "Bygningen opvarmes med el ifølge BBR. Det giver høje varmeudgifter for lejerne og kan presse lejen." });
  if (main && String(main.byg033Tagdækningsmateriale) === "1") risks.push({ level: "middel", title: "Fladt tagpaptag", note: "Tagpap på fladt tag holder typisk 20-30 år. Spørg til, hvornår taget sidst er udskiftet." });
  if (built && built < 1940 && !(reno && reno > 1990)) risks.push({ level: "middel", title: `Bygget ${built} uden registreret ombygning siden 1990`, note: "Ældre installationer (el, vand, afløb) og vinduer bør gennemgås af en byggesagkyndig." });

  const latest = vur?.latest ?? null;
  // Grundskyld is levied on 80 % of the land value (the 20 % prudence discount since 2024)
  // at the municipality's rate. The real bill can be lower (tax ceiling) and commercial
  // property may also pay dækningsafgift, so it is shown as an estimate.
  const tax = latest?.landValue && rate ? { promille: rate.promille, year: landTax.year, annual: Math.round(latest.landValue * 0.8 * rate.promille / 1000) } : null;
  const marketRent = flats.length && zip ? { annual: flats.reduce((s, m) => s + estimateMonthlyRent(zip, m), 0) * 12, flats: flats.length, zip } : null;

  return {
    bfe: a.bfe, kommunekode, kommune: rate?.name ?? null,
    valuation: latest ? { year: latest.year, propertyValue: latest.propertyValue, landValue: latest.landValue } : null,
    landTax: tax,
    units: units.length ? { residential: homes.length, residentialArea: sum(homes), commercial: work.length, commercialArea: sum(work), flats } : null,
    building, risks, marketRent, fetchedAt: new Date().toISOString(),
  };
}

export async function dossier(address: string, zip: number | null, timeoutMs = 20000): Promise<Dossier | null> {
  return Promise.race([build(address, zip).catch(() => null), new Promise<null>((r) => setTimeout(() => r(null), timeoutMs))]);
}

export const zipOf = (addr: string) => { const m = addr.match(/\b(\d{4})\b(?!.*\b\d{4}\b)/); return m ? Number(m[1]) : null; };
