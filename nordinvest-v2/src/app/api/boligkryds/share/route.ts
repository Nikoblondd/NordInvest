import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { buyerUser, denied } from "@/lib/buyer/gate";
import { readStore, writeDoc, writeStore } from "@/lib/app/store";
import { EMPTY_STATE, type BuyerState } from "@/lib/buyer/state";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/*
 * Sharing a list, like a wish list: POST makes (or returns) a link that shows
 * the person's saved homes and the places they searched, always as they are
 * right now. DELETE stops it; the old link then shows nothing.
 */
const json = (b: unknown, status = 200) => NextResponse.json(b, { status, headers: { "Cache-Control": "no-store" } });

export async function POST() {
  const user = await buyerUser();
  if (!user) return denied();
  const [st] = await readStore<BuyerState>("boligkoeb", user.id);
  const state: BuyerState = { ...EMPTY_STATE, ...(st ?? {}) };
  if (state.shareToken) return json({ ok: true, token: state.shareToken });
  const token = randomBytes(9).toString("base64url");
  const name = String(user.user_metadata?.full_name ?? "").split(" ")[0] || null;
  if (!(await writeDoc(`boligkryds-share/${token}`, { owner: user.id, name, createdAt: new Date().toISOString(), revoked: false }))) return json({ ok: false }, 502);
  await writeStore("boligkoeb", user.id, [{ ...state, shareToken: token }]);
  return json({ ok: true, token });
}

export async function DELETE() {
  const user = await buyerUser();
  if (!user) return denied();
  const [st] = await readStore<BuyerState>("boligkoeb", user.id);
  if (!st?.shareToken) return json({ ok: true });
  await writeDoc(`boligkryds-share/${st.shareToken}`, { owner: user.id, revoked: true });
  await writeStore("boligkoeb", user.id, [{ ...st, shareToken: null }]);
  return json({ ok: true });
}
