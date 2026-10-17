/*
 * Account mail (approval, login links, receipts) sent through Resend. Kept
 * apart from outreach: its own sender address, a plain-text part next to the
 * HTML (HTML-only mail scores worse with spam filters), retries on rate limits
 * and server errors, and the Resend id back so delivery can be checked.
 */

export const ACCOUNT_FROM = "NordInvest <adgang@nordinvest.io>";
export const ACCOUNT_REPLY_TO = "contact@nordinvest.io";

export type SendResult = { ok: boolean; id?: string; error?: string };

/** Plain-text version of our simple mail HTML: paragraphs, line breaks and links as "label: url". */
export function htmlToText(html: string): string {
  return html
    .replace(/<a\s[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi, (_m, href: string, label: string) => {
      const l = label.replace(/<[^>]+>/g, "").trim();
      return !l || l === href || href.startsWith("mailto:") ? href.replace(/^mailto:/, "") : `${l}: ${href}`;
    })
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|h\d|li|tr|table)>/gi, "\n\n")
    .replace(/<td[^>]*>/gi, " ")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, "\"").replace(/&#39;/g, "'")
    .replace(/[ \t]+\n/g, "\n").replace(/\n[ \t]+/g, "\n").replace(/\n{3,}/g, "\n\n")
    .trim();
}

export async function sendMail(m: {
  to: string; subject: string; html: string; text?: string;
  from?: string; replyTo?: string; idempotencyKey?: string;
}): Promise<SendResult> {
  const key = process.env.RESEND_API_KEY;
  if (!key) return { ok: false, error: "resend_not_configured" };
  const body = JSON.stringify({
    from: m.from ?? ACCOUNT_FROM, to: [m.to], reply_to: m.replyTo ?? ACCOUNT_REPLY_TO,
    subject: m.subject, html: m.html, text: m.text ?? htmlToText(m.html),
  });
  let error = "failed";
  for (let attempt = 0; attempt < 3; attempt++) {
    if (attempt) await new Promise((r) => setTimeout(r, attempt * 1200));
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json", ...(m.idempotencyKey ? { "Idempotency-Key": m.idempotencyKey } : {}) },
      body,
    }).catch((e: Error) => { error = e.message; return null; });
    if (res?.ok) {
      const d = (await res.json().catch(() => ({}))) as { id?: string };
      return { ok: true, id: d.id };
    }
    if (res) {
      const d = (await res.json().catch(() => ({}))) as { message?: string };
      error = d.message ?? `http_${res.status}`;
      // 4xx other than rate limiting will not change on a retry.
      if (res.status !== 429 && res.status < 500) break;
    }
  }
  return { ok: false, error };
}

export type MailStatus = "sendt" | "leveret" | "forsinket" | "afvist" | "spam" | "ukendt";

/** What Resend knows about a sent mail: accepted by the recipient's server, bounced, marked as spam, ... */
export async function mailStatus(id: string): Promise<{ status: MailStatus; to?: string; at?: string }> {
  const key = process.env.RESEND_API_KEY;
  if (!key || !/^[0-9a-f-]{20,60}$/i.test(id)) return { status: "ukendt" };
  const res = await fetch(`https://api.resend.com/emails/${id}`, { headers: { Authorization: `Bearer ${key}` }, cache: "no-store" }).catch(() => null);
  if (!res?.ok) return { status: "ukendt" };
  const d = (await res.json().catch(() => ({}))) as { last_event?: string; to?: string[]; created_at?: string };
  const map: Record<string, MailStatus> = {
    queued: "sendt", scheduled: "sendt", sent: "sendt", delivered: "leveret", opened: "leveret", clicked: "leveret",
    delivery_delayed: "forsinket", bounced: "afvist", failed: "afvist", complained: "spam",
  };
  return { status: map[d.last_event ?? ""] ?? "ukendt", to: d.to?.[0], at: d.created_at };
}
