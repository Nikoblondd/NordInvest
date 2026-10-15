/*
 * Addresses that asked not to get outreach mail, kept in the private Storage
 * bucket (member-data/outreach/suppressed.json). Read before every send.
 */
const BUCKET = "member-data";
const PATH = "outreach/suppressed.json";
const URL_ = () => process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const KEY = () => process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
const h = (json = false) => ({ Authorization: `Bearer ${KEY()}`, apikey: KEY(), ...(json ? { "Content-Type": "application/json" } : {}) });

export async function readSuppressed(): Promise<Set<string>> {
  if (!URL_() || !KEY()) return new Set();
  const r = await fetch(`${URL_()}/storage/v1/object/${BUCKET}/${PATH}`, { headers: h(), cache: "no-store" }).catch(() => null);
  const list = r?.ok ? ((await r.json().catch(() => [])) as string[]) : [];
  return new Set(Array.isArray(list) ? list.map((e) => e.toLowerCase()) : []);
}

export async function suppress(email: string): Promise<boolean> {
  if (!URL_() || !KEY()) return false;
  const set = await readSuppressed();
  set.add(email.trim().toLowerCase());
  const r = await fetch(`${URL_()}/storage/v1/object/${BUCKET}/${PATH}`, {
    method: "POST", headers: { ...h(true), "x-upsert": "true", "cache-control": "no-cache" }, body: JSON.stringify(Array.from(set)),
  }).catch(() => null);
  return !!r?.ok;
}
