import { NextResponse } from "next/server";
import { buyerUser, denied } from "@/lib/buyer/gate";
import { readStore, writeStore } from "@/lib/app/store";
import { EMPTY_STATE, cleanState, type BuyerState } from "@/lib/buyer/state";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const json = (b: unknown, status = 200) => NextResponse.json(b, { status, headers: { "Cache-Control": "no-store" } });

/** GET: the signed-in person's map state. PUT: replace it (cleaned). */
export async function GET() {
  const user = await buyerUser();
  if (!user) return denied();
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
