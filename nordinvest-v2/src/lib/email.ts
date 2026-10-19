// Email delivery via Resend (simple REST — no SDK needed).
// Every function degrades gracefully when RESEND_API_KEY is not set, so the
// cron never crashes just because email isn't configured yet.

const RESEND_ENDPOINT = "https://api.resend.com/emails";
// Until nordinvest.io is verified in Resend, `onboarding@resend.dev` sends to
// the account owner's own address. Override with EMAIL_FROM once verified.
const FROM = process.env.EMAIL_FROM ?? "NordInvest <onboarding@resend.dev>";
const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://nordinvest.io";

export type SendResult = { ok: true; id: string } | { ok: false; reason: string };

export async function sendEmail(opts: { to: string; subject: string; html: string; replyTo?: string }): Promise<SendResult> {
  const key = process.env.RESEND_API_KEY;
  if (!key) return { ok: false, reason: "not_configured" };
  try {
    const res = await fetch(RESEND_ENDPOINT, {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: FROM,
        to: [opts.to],
        subject: opts.subject,
        html: opts.html,
        ...(opts.replyTo ? { reply_to: opts.replyTo } : {}),
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { ok: false, reason: data?.message || `http_${res.status}` };
    return { ok: true, id: data?.id ?? "sent" };
  } catch (err) {
    return { ok: false, reason: (err as Error).message };
  }
}

const dk = (n: number | null | undefined) =>
  n == null || !Number.isFinite(n) ? "–" : `${Math.round(n).toLocaleString("da-DK")} kr`;

// New-matches email for a saved search ("Vagt på søgning").
export function savedSearchEmail(params: {
  name: string | null;
  label: string;
  matches: { address: string; price: number; score: number; url: string }[];
  total: number;
}): { subject: string; html: string } {
  const greeting = params.name ? `Hej ${params.name.split(" ")[0]},` : "Hej,";
  const n = params.total;
  const subject = `${n} ny${n === 1 ? "" : "e"} handel${n === 1 ? "" : "er"} matcher “${params.label}”`;
  const rows = params.matches
    .slice(0, 5)
    .map(
      (m) => `
      <tr>
        <td style="padding:10px 0;border-top:1px solid #eef2f7;">
          <div style="font-weight:600;color:#0f1f3d;font-size:14px;">${m.address}</div>
          <div style="color:#64748b;font-size:13px;">${dk(m.price)} · score ${m.score}/100</div>
        </td>
        <td style="padding:10px 0;border-top:1px solid #eef2f7;text-align:right;vertical-align:middle;">
          <a href="${m.url}" style="color:#2563eb;text-decoration:none;font-weight:600;font-size:13px;">Se analyse →</a>
        </td>
      </tr>`,
    )
    .join("");
  const html = `
  <div style="margin:0;padding:0;background:#f1f5f9;">
    <div style="max-width:520px;margin:0 auto;padding:24px 16px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#0f1f3d;">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:20px;">
        <span style="display:inline-block;width:28px;height:28px;background:#0f1f3d;color:#fff;border-radius:7px;text-align:center;line-height:28px;font-weight:700;font-size:13px;">Ni</span>
        <span style="font-weight:700;font-size:16px;color:#0f1f3d;">NordInvest</span>
      </div>
      <div style="background:#ffffff;border:1px solid #e2e8f0;border-radius:16px;padding:24px;">
        <div style="font-size:12px;font-weight:600;letter-spacing:.04em;text-transform:uppercase;color:#2563eb;">Vagt på søgning</div>
        <h1 style="margin:6px 0 4px;font-size:20px;line-height:1.3;color:#0f1f3d;">${n} ny${n === 1 ? "" : "e"} handel${n === 1 ? "" : "er"} matcher din søgning</h1>
        <p style="margin:0 0 8px;color:#334155;font-size:14px;">${greeting} nye boliger matcher <b>“${params.label}”</b>:</p>
        <table style="width:100%;border-collapse:collapse;">${rows}</table>
        <div style="margin-top:20px;">
          <a href="${SITE}/deals" style="display:inline-block;background:#2563eb;color:#fff;text-decoration:none;font-weight:600;font-size:14px;padding:11px 20px;border-radius:999px;">Åbn Deal-motoren →</a>
        </div>
      </div>
      <p style="margin:16px 4px 0;color:#94a3b8;font-size:11px;line-height:1.5;">
        Du modtager denne mail, fordi du har gemt en søgning i NordInvest. Fjern søgningen på dit dashboard for at stoppe beskederne. Dette er ikke finansiel rådgivning.
      </p>
    </div>
  </div>`;
  return { subject, html };
}

// A clean, branded Danish alert email. Kept inline-styled so it renders in every
// mail client, and deliberately simple — one message, one clear action.
export function vagtAlertEmail(params: {
  name: string | null;
  address: string | null;
  alert: string;
  currentPrice: number | null;
  currentScore: number | null;
  listingUrl: string;
}): { subject: string; html: string } {
  const addr = params.address || "din overvågede bolig";
  const greeting = params.name ? `Hej ${params.name.split(" ")[0]},` : "Hej,";
  const scoreLine =
    params.currentScore != null
      ? `<tr><td style="padding:4px 0;color:#64748b;">Investment score nu</td><td style="padding:4px 0;text-align:right;font-weight:700;color:#0f1f3d;">${params.currentScore}/100</td></tr>`
      : "";

  const subject = `Prisændring på ${addr}`;
  const html = `
  <div style="margin:0;padding:0;background:#f1f5f9;">
    <div style="max-width:520px;margin:0 auto;padding:24px 16px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#0f1f3d;">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:20px;">
        <span style="display:inline-block;width:28px;height:28px;background:#0f1f3d;color:#fff;border-radius:7px;text-align:center;line-height:28px;font-weight:700;font-size:13px;">Ni</span>
        <span style="font-weight:700;font-size:16px;color:#0f1f3d;">NordInvest</span>
      </div>
      <div style="background:#ffffff;border:1px solid #e2e8f0;border-radius:16px;padding:24px;">
        <div style="font-size:12px;font-weight:600;letter-spacing:.04em;text-transform:uppercase;color:#2563eb;">Vagt · prisændring</div>
        <h1 style="margin:6px 0 4px;font-size:20px;line-height:1.3;color:#0f1f3d;">${addr}</h1>
        <p style="margin:0 0 16px;color:#334155;font-size:14px;">${greeting}</p>
        <div style="background:#ecfdf5;border:1px solid #a7f3d0;border-radius:12px;padding:14px 16px;color:#065f46;font-size:14px;line-height:1.5;">
          ${params.alert}
        </div>
        <table style="width:100%;border-collapse:collapse;margin-top:16px;font-size:14px;">
          <tr><td style="padding:4px 0;color:#64748b;">Aktuel pris</td><td style="padding:4px 0;text-align:right;font-weight:700;color:#0f1f3d;">${dk(params.currentPrice)}</td></tr>
          ${scoreLine}
        </table>
        <div style="margin-top:20px;">
          <a href="${SITE}/analyseren?url=${encodeURIComponent(params.listingUrl)}" style="display:inline-block;background:#2563eb;color:#fff;text-decoration:none;font-weight:600;font-size:14px;padding:11px 20px;border-radius:999px;">Se den opdaterede analyse →</a>
        </div>
        <a href="${SITE}/dashboard" style="display:inline-block;margin-top:12px;color:#2563eb;text-decoration:none;font-size:13px;">Åbn dit dashboard</a>
      </div>
      <p style="margin:16px 4px 0;color:#94a3b8;font-size:11px;line-height:1.5;">
        Du modtager denne mail, fordi du har sat en vagt på denne bolig i NordInvest.
        Fjern vagten på dit dashboard for at stoppe beskederne. Dette er ikke finansiel rådgivning.
      </p>
    </div>
  </div>`;
  return { subject, html };
}
