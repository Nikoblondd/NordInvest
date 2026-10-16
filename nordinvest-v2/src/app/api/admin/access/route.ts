import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/access";
import { generateLink, getAuthUser, setAccess } from "@/lib/supabase/admin";
import { brokerInvitationEmail, getRequest, invitationEmail, updateRequest, type RequestStatus } from "@/lib/access/requests";
import { PITCH_FROM } from "@/lib/outreach/schedule";
import { FIELD, INVITE_NEXT, linkUrl, newLink, type InviteKind } from "@/lib/access/invite-link";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/*
 * POST /api/admin/access: Nikolaj manages who is in.
 *  { action: "invite", email, name, requestId?, requestCreatedAt?, note?, kind?: "member" | "maegler" | "begge" }
 *  { action: "revoke" | "restore", userId }
 *  { action: "status", requestId, requestCreatedAt, status, note? }
 *  { action: "role", userId, role: "admin" | "member" }
 * Admin only. Invitations go out as a personal e-mail with a link that does
 * not expire before it is used (see lib/access/invite-link.ts).
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
    // "maegler": the broker tools only. "begge": the whole platform plus the broker tools.
    const kind: InviteKind = b.kind === "maegler" || b.kind === "begge" ? b.kind : "member";
    const next = INVITE_NEXT[kind];
    // Creates the account if it does not exist yet. Its one-time token is not mailed.
    const link = await generateLink(email, `${SITE}${next}`, name || undefined);
    if ("error" in link) return json({ ok: false, reason: link.error }, 502);
    const { token, record } = newLink(next, kind);
    const ok = await setAccess(link.userId, kind === "maegler" ? "maegler" : "member", {
      nordinvest_invited_at: new Date().toISOString(),
      nordinvest_broker: kind !== "member",
      nordinvest_kind: kind,
      [FIELD.invite]: record,
      ...(note ? { nordinvest_note: note } : {}),
    });
    if (!ok) return json({ ok: false, reason: "access_failed" }, 502);
    const url = linkUrl(SITE, link.userId, token);
    const mail = kind === "maegler" ? brokerInvitationEmail(name || email, url) : invitationEmail(name || email, url, kind === "begge");
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
    // Restore what they had: "begge" members keep the broker flag, brokers stay brokers.
    const kind = target.app_metadata?.nordinvest_kind ?? (target.app_metadata?.nordinvest_broker ? "maegler" : "member");
    const ok = await setAccess(b.userId, b.action === "revoke" ? "revoked" : kind === "maegler" ? "maegler" : "member");
    return json({ ok }, ok ? 200 : 502);
  }

  if (b.action === "role") {
    if (!b.userId || (b.role !== "admin" && b.role !== "member")) return json({ ok: false, reason: "bad" }, 422);
    // Nobody removes their own admin role by accident.
    if (b.userId === user.id && b.role !== "admin") return json({ ok: false, reason: "self" }, 422);
    const target = await getAuthUser(b.userId);
    if (!target) return json({ ok: false, reason: "user" }, 404);
    const ok = await setAccess(b.userId, "member", { nordinvest_role: b.role === "admin" ? "admin" : null });
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
