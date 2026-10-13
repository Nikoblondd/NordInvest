/*
 * Server-only per-member storage for the app's own records (search agents,
 * calendar events), kept as one private JSON file per member and kind in the
 * Supabase Storage bucket `member-data`. Only the service role can read it;
 * every route that uses this checks the member first and only ever passes the
 * signed-in member's own id.
 */

const BUCKET = "member-data";
const URL_ = () => process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const KEY = () => process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
const h = (json = false) => ({ Authorization: `Bearer ${KEY()}`, apikey: KEY(), ...(json ? { "Content-Type": "application/json" } : {}) });

export type Kind = "agents" | "events";
const path = (kind: Kind, userId: string) => `${kind}/${userId}.json`;
const validId = (id: string) => /^[0-9a-f-]{36}$/i.test(id);

let bucketReady = false;
async function ensureBucket() {
  if (bucketReady || !URL_() || !KEY()) return;
  const r = await fetch(`${URL_()}/storage/v1/bucket/${BUCKET}`, { headers: h(), cache: "no-store" }).catch(() => null);
  if (!r?.ok) {
    await fetch(`${URL_()}/storage/v1/bucket`, { method: "POST", headers: h(true), body: JSON.stringify({ id: BUCKET, name: BUCKET, public: false }) }).catch(() => null);
  }
  bucketReady = true;
}

export async function readStore<T>(kind: Kind, userId: string): Promise<T[]> {
  if (!validId(userId) || !URL_() || !KEY()) return [];
  const r = await fetch(`${URL_()}/storage/v1/object/${BUCKET}/${path(kind, userId)}`, { headers: h(), cache: "no-store" }).catch(() => null);
  if (!r?.ok) return [];
  const data = await r.json().catch(() => null);
  return Array.isArray(data) ? (data as T[]) : [];
}

export async function writeStore<T>(kind: Kind, userId: string, rows: T[]): Promise<boolean> {
  if (!validId(userId) || !URL_() || !KEY()) return false;
  await ensureBucket();
  const r = await fetch(`${URL_()}/storage/v1/object/${BUCKET}/${path(kind, userId)}`, {
    method: "POST",
    headers: { ...h(true), "x-upsert": "true", "cache-control": "no-cache" },
    body: JSON.stringify(rows),
  }).catch(() => null);
  return !!r?.ok;
}

/** Every member id that has a file of this kind (for the scheduled jobs). */
export async function storeOwners(kind: Kind): Promise<string[]> {
  if (!URL_() || !KEY()) return [];
  const out: string[] = [];
  for (let offset = 0; offset < 20000; offset += 1000) {
    const r = await fetch(`${URL_()}/storage/v1/object/list/${BUCKET}`, {
      method: "POST", headers: h(true), cache: "no-store",
      body: JSON.stringify({ prefix: `${kind}/`, limit: 1000, offset, sortBy: { column: "name", order: "asc" } }),
    }).catch(() => null);
    if (!r?.ok) break;
    const files = (await r.json()) as { name: string }[];
    out.push(...files.map((f) => f.name.replace(/\.json$/, "")).filter(validId));
    if (files.length < 1000) break;
  }
  return out;
}
