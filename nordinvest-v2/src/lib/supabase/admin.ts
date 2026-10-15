/*
 * Server-only Supabase admin calls with the service role (never import this
 * from a client component). Used to invite members and to set or remove their
 * access in app_metadata, which users themselves cannot change.
 */

const URL_ = () => process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const KEY = () => process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
const h = () => ({ Authorization: `Bearer ${KEY()}`, apikey: KEY(), "Content-Type": "application/json" });

export const adminConfigured = () => !!URL_() && !!KEY();

export type AdminUser = {
  id: string;
  email?: string;
  created_at: string;
  last_sign_in_at?: string | null;
  app_metadata?: Record<string, unknown>;
  user_metadata?: Record<string, unknown>;
};

export async function getAuthUser(id: string): Promise<AdminUser | null> {
  if (!adminConfigured()) return null;
  const r = await fetch(`${URL_()}/auth/v1/admin/users/${encodeURIComponent(id)}`, { headers: h(), cache: "no-store" }).catch(() => null);
  return r?.ok ? ((await r.json()) as AdminUser) : null;
}

/** Every account, newest first (paged through the admin API). */
export async function listAuthUsers(): Promise<AdminUser[]> {
  if (!adminConfigured()) return [];
  const out: AdminUser[] = [];
  for (let page = 1; page <= 20; page++) {
    const r = await fetch(`${URL_()}/auth/v1/admin/users?page=${page}&per_page=200`, { headers: h(), cache: "no-store" }).catch(() => null);
    if (!r?.ok) break;
    const data = await r.json();
    const users = (data.users ?? []) as AdminUser[];
    out.push(...users);
    if (users.length < 200) break;
  }
  return out.sort((a, b) => b.created_at.localeCompare(a.created_at));
}

export async function setAccess(id: string, access: "member" | "revoked" | "maegler", extra: Record<string, unknown> = {}): Promise<boolean> {
  if (!adminConfigured()) return false;
  const cur = await getAuthUser(id);
  const app_metadata = { ...(cur?.app_metadata ?? {}), nordinvest_access: access, nordinvest_access_at: new Date().toISOString(), ...extra };
  const r = await fetch(`${URL_()}/auth/v1/admin/users/${encodeURIComponent(id)}`, { method: "PUT", headers: h(), body: JSON.stringify({ app_metadata }) }).catch(() => null);
  return !!r?.ok;
}

/**
 * Creates the account if needed and returns a one-time token for our own
 * /auth/confirm link (verified on our server, so the session lands in cookies).
 * "invite" for new addresses, "magiclink" for existing accounts.
 */
export async function generateLink(email: string, redirectTo: string, fullName?: string, only?: "magiclink"): Promise<{ tokenHash: string; type: "invite" | "magiclink"; userId: string } | { error: string }> {
  if (!adminConfigured()) return { error: "not_configured" };
  const call = async (type: "invite" | "magiclink") => {
    const r = await fetch(`${URL_()}/auth/v1/admin/generate_link`, {
      method: "POST", headers: h(),
      body: JSON.stringify({ type, email, redirect_to: redirectTo, ...(type === "invite" && fullName ? { data: { full_name: fullName } } : {}) }),
    }).catch(() => null);
    const data = r ? await r.json().catch(() => ({})) : {};
    return { ok: !!r?.ok, data, type };
  };
  // An existing account cannot be invited again; it gets a sign-in link instead.
  let res = only === "magiclink" ? await call("magiclink") : await call("invite");
  if (!res.ok && only !== "magiclink") res = await call("magiclink");
  if (!res.ok) return { error: String(res.data?.msg ?? res.data?.message ?? res.data?.error_description ?? "link_failed") };
  const d = res.data as { hashed_token?: string; properties?: { hashed_token?: string }; id?: string; user?: { id?: string } };
  const tokenHash = d.hashed_token ?? d.properties?.hashed_token;
  const userId = d.id ?? d.user?.id;
  if (!tokenHash || !userId) return { error: "link_failed" };
  return { tokenHash, type: res.type, userId };
}
