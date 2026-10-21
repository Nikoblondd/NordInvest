import { NextResponse } from "next/server";
import { buyerUser, denied } from "@/lib/buyer/gate";
import { readStore, writeStore } from "@/lib/app/store";
import { EMPTY_STATE, cleanState, type BuyerState } from "@/lib/buyer/state";
import { isAdmin } from "@/lib/access";
import { getAuthUser } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const json = (b: unknown, status = 200) => NextResponse.json(b, { status, headers: { "Cache-Control": "no-store" } });

/**
 * GET: the signed-in person's map state. An admin can pass ?som=<user id> to
 * see the app exactly as that person does (their saved homes, filters and
 * area), or ?som=ny for a brand-new buyer. Preview answers are read-only:
 * the browser never saves while previewing, and PUT ignores it.
 */
export async function GET(req: Request) {
  const user = await buyerUser();
  if (!user) return denied();
  const som = new URL(req.url).searchParams.get("som");
  if (som && isAdmin(user)) {
    if (som === "ny") return json({ ok: true, state: EMPTY_STATE, email: "ny@boligkoeber", name: "Ny boligkøber", preview: { name: "en ny boligkøber" } });
    const target = await getAuthUser(som);
    if (!target) return json({ ok: false, reason: "user" }, 404);
    const [st] = await readStore<BuyerState>("boligkoeb", target.id);
    const name = (target.user_metadata?.full_name as string | undefined) ?? null;
    return json({ ok: true, state: st ? cleanState(st, { ...EMPTY_STATE, mailedAt: st.mailedAt ?? null }) : EMPTY_STATE, email: target.email, name, preview: { name: name ?? target.email ?? "brugeren" } });
  }
  const [state] = await readStore<BuyerState>("boligkoeb", user.id);
  return json({ ok: true, state: state ? cleanState(state, { ...EMPTY_STATE, mailedAt: state.mailedAt ?? null }) : EMPTY_STATE, email: user.email, name: (user.user_metadata?.full_name as string | undefined) ?? null });
}

export async function PUT(req: Request) {
  const user = await buyerUser();
  if (!user) return denied();
  const body = await req.json().catch(() => null);
  if (!body) return json({ ok: false, reason: "bad" }, 400);
  const [prev] = await readStore<BuyerState>("boligkoeb", user.id);
  const next = cleanState(body, prev ? { ...EMPTY_STATE, ...prev } : EMPTY_STATE);
  const ok = await writeStore("boligkoeb", user.id, [next]);
  return json({ ok }, ok ? 200 : 502);
}
