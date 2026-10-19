import { createHmac, timingSafeEqual } from "crypto";

/*
 * Lifecycle emails to signed-up users. Service messages about their own
 * account only (Danish marketing law allows those without a marketing
 * consent): help to run the first analysis, and a notice when the free
 * analyses for the month are used. Each carries an unsubscribe link, and a
 * user gets each message at most once (the limit notice once a month).
 */

export type LifecycleKind = "activate" | "limit";

export const FREE_MONTHLY = 3;
const DAY = 86_400_000;

export const monthKey = (d: Date) => d.toISOString().slice(0, 7);

export type LifecycleUser = {
  createdAt: string;
  tier: string;
  unlimited: boolean;
  analysesTotal: number; // since signup (only needed for new users)
  analysesThisMonth: number;
  sent: Record<string, string>; // key -> ISO time sent
  optOut: boolean;
};

/** Which message (if any) a user is due, and the key it is recorded under. */
export function dueEmail(u: LifecycleUser, now: Date): { kind: LifecycleKind; key: string } | null {
  if (u.optOut) return null;
  const age = now.getTime() - new Date(u.createdAt).getTime();
  // Signed up 1-14 days ago and never ran an analysis: help them start.
  if (u.analysesTotal === 0 && age >= DAY && age <= 14 * DAY && !u.sent.activate) {
    return { kind: "activate", key: "activate" };
  }
  // Free plan, used this month's free analyses: tell them, once a month.
  const key = `limit:${monthKey(now)}`;
  if (!u.unlimited && u.tier === "free" && u.analysesThisMonth >= FREE_MONTHLY && !u.sent[key]) {
    return { kind: "limit", key };
  }
  return null;
}

const secret = () => process.env.LIFECYCLE_SECRET || process.env.CRON_SECRET || "";

export function unsubscribeToken(userId: string): string {
  return createHmac("sha256", secret()).update(`unsub:${userId}`).digest("hex").slice(0, 32);
}

export function validUnsubscribeToken(userId: string, token: string): boolean {
  if (!secret() || !token) return false;
  const a = Buffer.from(unsubscribeToken(userId));
  const b = Buffer.from(token);
  return a.length === b.length && timingSafeEqual(a, b);
}

// ── Templates ─────────────────────────────────────────────────────────────

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://nordinvest.io";

function layout(body: string, unsubUrl: string) {
  return `
  <div style="max-width:520px;margin:0 auto;padding:24px 16px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#0f1f3d;font-size:15px;line-height:1.6;">
    <p style="margin:0 0 20px;font-weight:700;font-size:16px;">NordInvest</p>
    ${body}
    <p style="margin:32px 0 0;padding-top:16px;border-top:1px solid #eef2f7;color:#94a3b8;font-size:12px;line-height:1.5;">
      Du får denne mail, fordi du har en konto på nordinvest.io.
      <a href="${unsubUrl}" style="color:#94a3b8;">Afmeld mails om din konto</a>.
    </p>
  </div>`;
}

function button(href: string, label: string) {
  return `<a href="${href}" style="display:inline-block;margin:8px 0 4px;padding:12px 20px;border-radius:10px;background:#2563eb;color:#fff;text-decoration:none;font-weight:600;">${label}</a>`;
}

const kr = (n: number) => `${Math.round(n).toLocaleString("da-DK")} kr.`;

export function activateEmail(p: {
  name: string | null;
  unsubUrl: string;
  topDeal?: { address: string; city: string; cashFlow: number; score: number; href: string } | null;
}) {
  const hi = p.name ? `Hej ${p.name.split(" ")[0]},` : "Hej,";
  const deal = p.topDeal
    ? `<p>Leder du efter en bolig at prøve med? Lige nu står <strong>${p.topDeal.address}</strong> øverst i Deal-motoren: ${
        p.topDeal.cashFlow >= 0 ? "+" : "−"
      }${kr(Math.abs(p.topDeal.cashFlow))} om måneden og score ${p.topDeal.score}. <a href="${SITE}${p.topDeal.href}" style="color:#2563eb;">Se analysen</a>.</p>`
    : "";
  return {
    subject: "Din første analyse tager under et minut",
    html: layout(
      `<p>${hi}</p>
      <p>Du har oprettet en konto på NordInvest, men har ikke regnet på en bolig endnu. Det er hurtigt: sæt et link ind fra Boligsiden, EDC, home eller en anden boligside, så får du cashflow, afkast og en klar dom.</p>
      ${button(`${SITE}/analyseren`, "Analysér en bolig")}
      ${deal}
      <p>Du har 3 gratis analyser om måneden.</p>`,
      p.unsubUrl,
    ),
  };
}

export function limitEmail(p: { name: string | null; unsubUrl: string; resetsOn: Date }) {
  const hi = p.name ? `Hej ${p.name.split(" ")[0]},` : "Hej,";
  const date = new Intl.DateTimeFormat("da-DK", { day: "numeric", month: "long", timeZone: "Europe/Copenhagen" }).format(p.resetsOn);
  return {
    subject: "Du har brugt dine 3 gratis analyser denne måned",
    html: layout(
      `<p>${hi}</p>
      <p>Du har brugt de 3 gratis analyser, der følger med din konto i denne måned. De kommer igen den ${date}.</p>
      <p>Regner du på flere boliger før det, giver Starter 10 analyser om måneden for 129 kr., eller 107,50 kr. om måneden med årlig betaling. Du kan opsige når som helst.</p>
      ${button(`${SITE}/priser`, "Se planerne")}
      <p style="color:#64748b;font-size:14px;">Deal-motoren er gratis og uden grænse, hvis du vil se, hvilke boliger der giver plus lige nu: <a href="${SITE}/deals" style="color:#2563eb;">nordinvest.io/deals</a>.</p>`,
      p.unsubUrl,
    ),
  };
}
