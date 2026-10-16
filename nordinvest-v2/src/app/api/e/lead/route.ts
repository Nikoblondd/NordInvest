import { NextResponse } from "next/server";
import { getLink } from "@/lib/broker/links";
import { addLead, validateLead } from "@/lib/broker/leads";
import { getAuthUser } from "@/lib/supabase/admin";
import { REPORT_TO } from "@/lib/outreach/schedule";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/*
 * POST /api/e/lead { slug, name, email, phone?, message, consent, website, t }
 * A buyer writes to the agent from the shared analysis. The mail goes to the
 * agent who made the link (reply goes straight to the buyer), or to NordInvest
 * for the hand-made links, which forwards it. The buyer gets a receipt, and the
 * lead shows up in the agent's /maegler dashboard. `website` is a honeypot and
 * `t` the time the form was shown, so bots that fill it instantly are dropped.
 */
const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://nordinvest.io";
const FROM = "NordInvest <contact@nordinvest.io>";
const json = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });
const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);
const wrap = (inner: string) => `<div style="font-family:-apple-system,Segoe UI,sans-serif;max-width:560px;color:#0f172a;font-size:15px;line-height:1.6">${inner}</div>`;

async function send(to: string, subject: string, html: string, replyTo?: string): Promise<boolean> {
  const key = process.env.RESEND_API_KEY;
  if (!key) return false;
  const r = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: FROM, to: [to], subject, html, ...(replyTo ? { reply_to: replyTo } : {}) }),
  }).catch(() => null);
  return !!r?.ok;
}

export async function POST(req: Request) {
  const b = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  // Bots: a filled honeypot or a form sent within 3 seconds of being shown. Answer as if it worked.
  if (String(b.website ?? "") !== "" || (typeof b.t === "number" && Date.now() - b.t < 3000)) return json({ ok: true });
  const slug = String(b.slug ?? "");
  const link = /^[a-z0-9-]{3,90}$/.test(slug) ? await getLink(slug) : null;
  if (!link) return json({ ok: false, reason: "not_found" }, 404);
  const v = validateLead(b);
  if (!v.ok) return json({ ok: false, reason: "invalid", errors: v.errors }, 422);
  const lead = v.lead;

  const stored = await addLead(slug, lead);
  if (!stored.ok) return json({ ok: false, reason: stored.duplicate ? "duplicate" : "busy" }, stored.duplicate ? 409 : 429);

  const owner = link.ownerId ? await getAuthUser(link.ownerId) : null;
  const agentEmail = owner?.email ?? null;
  const to = agentEmail ?? "contact@nordinvest.io";
  const street = link.addr.split(",")[0];
  const page = `${SITE}/e/${slug}`;
  const details = `<table style="border-collapse:collapse;margin:12px 0">
<tr><td style="padding:4px 12px 4px 0;color:#64748b">Navn</td><td style="padding:4px 0"><b>${esc(lead.name)}</b></td></tr>
<tr><td style="padding:4px 12px 4px 0;color:#64748b">E-mail</td><td style="padding:4px 0">${esc(lead.email)}</td></tr>
${lead.phone ? `<tr><td style="padding:4px 12px 4px 0;color:#64748b">Telefon</td><td style="padding:4px 0">${esc(lead.phone)}</td></tr>` : ""}
</table>
<p style="white-space:pre-line;background:#f1f5f9;border-radius:8px;padding:12px 14px">${esc(lead.message)}</p>`;

  const toAgent = agentEmail
    ? wrap(`<p>Hej,</p><p>En køber har læst investoranalysen af <b>${esc(link.addr)}</b> og skrevet til dig:</p>${details}<p>Svar direkte på denne mail, så går dit svar til køberen.</p><p style="font-size:13px;color:#64748b">Analysen: <a href="${page}">${page.replace(/^https?:\/\//, "")}</a>. Du kan se alle henvendelser i <a href="${SITE}/maegler">mæglerværktøjet</a>.</p><p>Venlig hilsen<br>NordInvest</p>`)
    : wrap(`<p>Ny henvendelse fra en køber på en delt analyse, der ikke har en mægler-konto. Send den videre til mægleren på sagen.</p><p><b>${esc(link.addr)}</b><br><a href="${link.url}">${esc(link.url)}</a></p>${details}<p style="font-size:13px;color:#64748b">Analysen: ${page}</p>`);
  const sentAgent = await send(to, `Ny henvendelse om ${street} via NordInvest`, toAgent, lead.email);
  // If the agent's mail bounces at Resend, NordInvest gets it instead and forwards it by hand.
  const delivered = sentAgent || (to !== "contact@nordinvest.io" && (await send("contact@nordinvest.io", `Videresend: henvendelse om ${street} (mail til ${to} fejlede)`, toAgent, lead.email)));

  await send(
    lead.email,
    `Din besked om ${street} er sendt`,
    wrap(`<p>Hej ${esc(lead.name.split(" ")[0])},</p><p>Tak for din besked om <b>${esc(link.addr)}</b>. ${agentEmail ? "Den er sendt direkte til mægleren på sagen, som svarer dig på mail." : "Vi sender den videre til mægleren på sagen, som svarer dig på mail."}</p>${details}<p>Du kan altid finde analysen igen her: <a href="${page}">${page.replace(/^https?:\/\//, "")}</a></p><p>Venlig hilsen<br>NordInvest</p>`),
  );
  // Nikolaj sees every lead, so he knows the channel works.
  if (agentEmail) await send(REPORT_TO, `Lead på ${street} sendt til ${agentEmail}`, wrap(`<p>En køber skrev til mægleren fra analysen af ${esc(link.addr)}.</p>${details}<p>${page}</p>`));

  return json({ ok: true, delivered });
}
