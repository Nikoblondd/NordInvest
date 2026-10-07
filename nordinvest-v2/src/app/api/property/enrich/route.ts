/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";
import { getAddressToBFE } from "@/lib/dar";
import { getGrundByBFE, getBygningerByGrund, getEnhederByBygning, datafordelerConfigured } from "@/lib/datafordeler";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

// ── BBR code → Danish label (common values) ──────────────────────────────
const VARME: Record<string, string> = {
  "1": "Fjernvarme/blokvarme", "2": "Centralvarme (ét fyr)", "3": "Ovne",
  "5": "Varmepumpe", "6": "Centralvarme (to fyr)", "7": "Elovne/elpaneler",
  "8": "Gasradiatorer", "9": "Ingen varme", "99": "Blandet",
};
const YDERVAEG: Record<string, string> = {
  "1": "Mursten", "2": "Letbetonsten", "3": "Fibercement m. asbest", "4": "Bindingsværk",
  "5": "Træbeklædning", "6": "Betonelementer", "8": "Metalplader", "10": "Fibercement",
  "11": "Plastmaterialer", "12": "Glas", "90": "Andet",
};
const TAG: Record<string, string> = {
  "1": "Tagpap (fladt)", "2": "Tagpap (hældning)", "3": "Fibercement m. asbest",
  "4": "Fibercement", "5": "Betontagsten", "6": "Tegl", "7": "Metal", "10": "Levende tag",
  "11": "Glas", "12": "Stråtag", "20": "PVC", "90": "Andet",
};
const dec = (map: Record<string, string>, code: unknown) =>
  code == null ? null : map[String(code)] ?? String(code);
const numOr = (v: unknown) => (v == null || v === "" ? null : Number(v));

type Bygning = Record<string, any>;
type Enhed = Record<string, any>;

function merge(grund: any[], bygninger: Bygning[], enheder: Enhed[]) {
  // Pick the largest building as the primary one.
  const primary = [...bygninger].sort(
    (a, b) => (numOr(b.byg038SamletBygningsareal) ?? 0) - (numOr(a.byg038SamletBygningsareal) ?? 0),
  )[0] ?? {};
  const enhed = enheder[0] ?? {};

  return {
    byggeaar: numOr(primary.byg026Opførelsesår),
    ombygningsaar: numOr(primary.byg027OmTilbygningsår),
    samletBygningsareal_m2: numOr(primary.byg038SamletBygningsareal),
    boligareal_m2: numOr(primary.byg039BygningensSamledeBoligAreal) ?? numOr(enhed.enh027ArealTilBeboelse),
    bebyggetAreal_m2: numOr(primary.byg041BebyggetAreal),
    enhedsareal_m2: numOr(enhed.enh026EnhedensSamledeAreal),
    antalEtager: numOr(primary.byg054AntalEtager),
    antalVaerelser: numOr(enhed.enh031AntalVærelser),
    antalToiletter: numOr(enhed.enh065AntalVandskylledeToiletter),
    antalBadevaerelser: numOr(enhed.enh066AntalBadeværelser),
    opvarmning: dec(VARME, primary.byg056Varmeinstallation),
    ydervaeg: dec(YDERVAEG, primary.byg032YdervæggensMateriale),
    tag: dec(TAG, primary.byg033Tagdækningsmateriale),
    antalBygninger: bygninger.length,
    antalEnheder: enheder.length,
    // energimærke findes IKKE i BBR (ligger i energimærkeregisteret) — udelades bevidst.
  };
}

async function cacheGet(bfe: string) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  try {
    const res = await fetch(
      `${url}/rest/v1/property_cache?bfe=eq.${encodeURIComponent(bfe)}&select=data,cached_at`,
      { headers: { apikey: key, Authorization: `Bearer ${key}` }, cache: "no-store" },
    );
    const rows = await res.json();
    const row = Array.isArray(rows) ? rows[0] : null;
    if (!row) return null;
    if (Date.now() - new Date(row.cached_at).getTime() > CACHE_TTL_MS) return null;
    return row.data;
  } catch {
    return null;
  }
}

async function cacheSet(bfe: string, data: unknown) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return;
  try {
    await fetch(`${url}/rest/v1/property_cache`, {
      method: "POST",
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
        Prefer: "resolution=merge-duplicates",
      },
      body: JSON.stringify({ bfe, data, cached_at: new Date().toISOString() }),
    });
  } catch {
    /* cache is best-effort */
  }
}

export async function GET(req: Request) {
  const sp = new URL(req.url).searchParams;
  return enrich(sp.get("adresse") || sp.get("address"), sp.get("bfe"));
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  return enrich(body.adresse || body.address, body.bfe);
}

async function enrich(adresse: string | null, bfeIn: string | null) {
  let bfe = bfeIn?.trim() || null;
  let betegnelse: string | null = null;

  // Address → BFE (Datafordeler DAR + MAT)
  if (!bfe && adresse) {
    try {
      const r = await getAddressToBFE(adresse);
      bfe = r.bfe;
      betegnelse = r.betegnelse;
    } catch {
      /* fall through */
    }
  }

  if (!bfe) {
    return NextResponse.json({ enriched: false, reason: "no_bfe", bfe: null });
  }

  // Cache hit?
  const cached = await cacheGet(bfe);
  if (cached) {
    return NextResponse.json({ enriched: true, cached: true, bfe, betegnelse, bbr: cached });
  }

  if (!datafordelerConfigured()) {
    return NextResponse.json({ enriched: false, reason: "not_configured", bfe });
  }

  // Live BBR lookup: BFE → grund → bygninger → enheder. Fully graceful — any
  // failure returns enriched:false so the analyzer runs on scraped data alone.
  try {
    const grund = await getGrundByBFE(bfe).catch(() => []);
    const grundId = (grund[0] as any)?.id_lokalId;
    if (!grundId) {
      return NextResponse.json({ enriched: false, reason: "no_bbr_data", bfe });
    }

    const bygninger = await getBygningerByGrund(String(grundId)).catch(() => []);
    if (!Array.isArray(bygninger) || bygninger.length === 0) {
      return NextResponse.json({ enriched: false, reason: "no_bbr_data", bfe });
    }

    // Primary building = largest by total area (skips carports/sheds).
    const primary = [...bygninger].sort(
      (a: any, b: any) => (Number(b.byg038SamletBygningsareal) || 0) - (Number(a.byg038SamletBygningsareal) || 0),
    )[0] as any;
    const bygId = primary?.id_lokalId;
    const enheder = bygId ? await getEnhederByBygning(String(bygId)).catch(() => []) : [];

    const bbr = merge(grund as any[], bygninger as any[], enheder as any[]);
    await cacheSet(bfe, bbr);
    return NextResponse.json({ enriched: true, cached: false, bfe, betegnelse, bbr });
  } catch (err) {
    console.error("BBR enrich failed:", (err as Error).message);
    return NextResponse.json({ enriched: false, reason: "bbr_error", bfe });
  }
}
