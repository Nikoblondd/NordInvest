/* eslint-disable @typescript-eslint/no-explicit-any */
import { getAddressToBFE } from "@/lib/dar";
import { datafordelerConfigured, getBygningerByGrund, getGrundByBFE } from "@/lib/datafordeler";

/*
 * Building year, renovation year and floor area of the main building at an
 * address, from BBR (Datafordeler). Used for the maintenance allowance on
 * investment properties. Best effort: null when BBR is not configured, the
 * address cannot be resolved or the lookup takes too long.
 */

export type BuildingFacts = { builtYear: number | null; renovatedYear: number | null; area: number | null };

const RETIRED = new Set(["9", "10", "11", "12", "14"]);
const num = (v: unknown) => (v == null || v === "" || !Number.isFinite(Number(v)) ? null : Number(v));

async function lookup(address: string): Promise<BuildingFacts | null> {
  if (!datafordelerConfigured()) return null;
  const { bfe } = await getAddressToBFE(address);
  if (!bfe) return null;
  const grund = ((await getGrundByBFE(bfe).catch(() => [])) as any[]).filter((g) => !RETIRED.has(String(g?.status ?? "")));
  for (const g of grund.slice(0, 3)) {
    const byg = ((await getBygningerByGrund(String(g.id_lokalId)).catch(() => [])) as any[]).filter((b) => !RETIRED.has(String(b?.status ?? "")));
    if (!byg.length) continue;
    const main = [...byg].sort((a, b) => (num(b.byg038SamletBygningsareal) ?? 0) - (num(a.byg038SamletBygningsareal) ?? 0))[0];
    const total = byg.reduce((s, b) => s + (num(b.byg038SamletBygningsareal) ?? 0), 0);
    const built = num(main.byg026Opførelsesår), reno = num(main.byg027OmTilbygningsår);
    return {
      builtYear: built && built > 1600 && built <= new Date().getFullYear() ? built : null,
      renovatedYear: reno && built && reno > built ? reno : null,
      area: total > 0 ? total : null,
    };
  }
  return null;
}

export async function buildingFacts(address: string, timeoutMs = 8000): Promise<BuildingFacts | null> {
  return Promise.race([
    lookup(address).catch(() => null),
    new Promise<null>((r) => setTimeout(() => r(null), timeoutMs)),
  ]);
}
