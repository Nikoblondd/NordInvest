import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/access";
import { generateLink, getAuthUser, setAccess } from "@/lib/supabase/admin";
import { getRequest, invitationEmail, updateRequest, type RequestStatus } from "@/lib/access/requests";
import { PITCH_FROM } from "@/lib/outreach/schedule";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/*
 * POST /api/admin/access: Nikolaj manages who is in.
 *  { action: "invite", email, name, requestId?, requestCreatedAt?, note? }
 *  { action: "revoke" | "restore", userId }
 *  { action: "status", requestId, requestCreatedAt, status, note? }
 * Admin only. Invitations go out as a personal e-mail with a one-time link.
 */
const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://nordinvest.io";
const json = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });

export async function POST(req: Request) {
  const supabase = createClient();
  const user = supabase ? (await supabase.auth.getUser()).data.user : null;
  if (!user || !isAdmin(user)) return json({ ok: false, reason: "no_access" }, 403);

  const b = (await req.json().catch(() => ({}))) as Record<string, string | undefined>;
  const note = typeof b.note === "string" ? b.note.slice(0, 1000) : undefined;

  if (b.action === "invite") {
    const email = String(b.email ?? "").trim().toLowerCase();
    const name = String(b.name ?? "").trim().slice(0, 120);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return json({ ok: false, reason: "email" }, 422);
    const link = await generateLink(email, `${SITE}/app/velkommen`, name || undefined);
    if ("error" in link) return json({ ok: false, reason: link.error }, 502);
    const ok = await setAccess(link.userId, "member", { nordinvest_invited_at: new Date().toISOString(), ...(note ? { nordinvest_note: note } : {}) });
    if (!ok) return json({ ok: false, reason: "access_failed" }, 502);
    const url = `${SITE}/auth/confirm?token_hash=${encodeURIComponent(link.tokenHash)}&type=${link.type}&next=${encodeURIComponent("/app/velkommen")}`;
    const mail = invitationEmail(name || email, url);
    const key = process.env.RESEND_API_KEY;
    const sent = key
      ? await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
          body: JSON.stringify({ from: PITCH_FROM, to: [email], reply_to: "contact@nordinvest.io", subject: mail.subject, html: mail.html }),
        }).then((r) => r.ok).catch(() => false)
      : false;
    if (b.requestId && b.requestCreatedAt) {
      const r = await getRequest(b.requestId, b.requestCreatedAt);
      if (r) await updateRequest({ ...r, status: "inviteret", invitedUserId: link.userId, ...(note ? { adminNote: note } : {}) });
    }
    // If the mail could not be sent, hand the link back so it can be sent by hand.
    return json({ ok: true, userId: link.userId, sent, ...(sent ? {} : { link: url }) });
  }

  if (b.action === "revoke" || b.action === "restore") {
    if (!b.userId) return json({ ok: false, reason: "user" }, 422);
    const target = await getAuthUser(b.userId);
    if (!target) return json({ ok: false, reason: "user" }, 404);
    if (isAdmin(target)) return json({ ok: false, reason: "admin" }, 422);
    const ok = await setAccess(b.userId, b.action === "revoke" ? "revoked" : "member");
    return json({ ok }, ok ? 200 : 502);
  }

  if (b.action === "status") {
    const status = b.status as RequestStatus;
    if (!b.requestId || !b.requestCreatedAt || !["ny", "kontaktet", "inviteret", "afvist"].includes(status)) return json({ ok: false, reason: "bad" }, 422);
    const r = await getRequest(b.requestId, b.requestCreatedAt);
    if (!r) return json({ ok: false, reason: "not_found" }, 404);
    const ok = await updateRequest({ ...r, status, ...(note !== undefined ? { adminNote: note } : {}) });
    return json({ ok }, ok ? 200 : 502);
  }

  return json({ ok: false, reason: "action" }, 400);
}
