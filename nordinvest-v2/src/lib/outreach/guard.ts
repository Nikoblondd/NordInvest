import { createHmac } from "node:crypto";
import type { Pitch } from "./schedule";

/*
 * Deliverability rules for outreach mail (cold e-mails to agents, press and
 * the like). Written after the October 2026 batch landed in spam: a new
 * domain, near-identical mails and twenty-plus recipients at one company in a
 * few days. Every day's batch is checked here before anything is sent; if a
 * rule is broken, nothing goes out and the founder gets the reasons instead.
 */

export const LIMITS = {
  /** Mails per day in total. Raise slowly (warm-up) once replies come in. */
  perDay: 10,
  /** Mails per day to one company domain (edc.dk, danbolig.dk, ...). */
  perDomainPerDay: 2,
  /** Minutes between two mails. */
  minGapMinutes: 12,
  /** Links in a mail. One clear link reads as a person; several as a campaign. */
  maxLinks: 1,
  /** Characters of text. Short, personal mails do best. */
  maxChars: 1100,
} as const;

/** Words and patterns spam filters weigh against cold mail, in Danish and English. */
const RISKY: [RegExp, string][] = [
  [/\bgratis\b/i, "\"gratis\""],
  [/uden binding/i, "\"uden binding\""],
  [/\b100 ?%/i, "\"100 %\""],
  [/!!+/, "flere udråbstegn"],
  [/\b(KLIK|GRATIS|TILBUD|NU)\b/, "ord med versaler"],
  [/\b(free|guarantee|act now|limited time)\b/i, "engelske spamord"],
  [/bit\.ly|tinyurl|t\.co\//i, "forkortede links"],
];

const domainOf = (email: string) => email.split("@")[1]?.toLowerCase() ?? "";

export type GuardResult = { ok: boolean; problems: string[] };

/** Checks one day's batch. `sentToday` are mails already sent today (for the daily and per-domain limits). */
export function checkBatch(batch: Pitch[], suppressed: Set<string>, sentToday: Pitch[] = []): GuardResult {
  const problems: string[] = [];
  const all = [...sentToday, ...batch];
  if (all.length > LIMITS.perDay) problems.push(`${all.length} mails i dag. Grænsen er ${LIMITS.perDay}.`);

  const byDomain = new Map<string, number>();
  for (const p of all) byDomain.set(domainOf(p.to), (byDomain.get(domainOf(p.to)) ?? 0) + 1);
  byDomain.forEach((n, d) => { if (n > LIMITS.perDomainPerDay) problems.push(`${n} mails til @${d} samme dag. Grænsen er ${LIMITS.perDomainPerDay}.`); });

  const times = batch.map((p) => Date.parse(p.sendAt)).sort((a, b) => a - b);
  for (let i = 1; i < times.length; i++) {
    if (times[i] - times[i - 1] < LIMITS.minGapMinutes * 60000) { problems.push(`Under ${LIMITS.minGapMinutes} minutter mellem to mails.`); break; }
  }

  const seen = new Set<string>();
  for (const p of batch) {
    const who = p.to.toLowerCase();
    if (suppressed.has(who)) problems.push(`${p.to} har frabedt sig mails.`);
    if (seen.has(who)) problems.push(`${p.to} står to gange.`);
    seen.add(who);
    const links = (p.text.match(/https?:\/\/|nordinvest\.io\//g) ?? []).length;
    if (links > LIMITS.maxLinks) problems.push(`${p.to}: ${links} links. Højst ${LIMITS.maxLinks}.`);
    if (p.text.length > LIMITS.maxChars) problems.push(`${p.to}: ${p.text.length} tegn. Højst ${LIMITS.maxChars}.`);
    for (const [re, label] of RISKY) if (re.test(p.text) || re.test(p.subject)) problems.push(`${p.to}: indeholder ${label}.`);
  }

  // Near-identical mails are the strongest bulk signal. Compare word triples:
  // two mails sharing more than 60 % of them count as the same template.
  const grams = (t: string) => {
    const w = t.toLowerCase().replace(/https?:\/\/\S+|nordinvest\.io\/\S+/g, "").replace(/[^a-zæøå ]+/g, " ").split(/\s+/).filter(Boolean);
    const g = new Set<string>();
    for (let i = 0; i + 2 < w.length; i++) g.add(`${w[i]} ${w[i + 1]} ${w[i + 2]}`);
    return g;
  };
  const sets = batch.map((p) => grams(p.text));
  let similar = 0;
  for (let i = 0; i < sets.length; i++) for (let j = i + 1; j < sets.length; j++) {
    let common = 0;
    sets[i].forEach((g) => { if (sets[j].has(g)) common++; });
    if (common / Math.max(1, Math.min(sets[i].size, sets[j].size)) > 0.6) similar++;
  }
  if (similar > 0) problems.push(`${similar} par af mails er næsten ens. Skriv hver mail forskelligt.`);

  return { ok: problems.length === 0, problems };
}

/* ---------- Unsubscribe ---------- */

const secret = () => process.env.UNSUBSCRIBE_SECRET || process.env.CRON_SECRET || "";

export function unsubscribeToken(email: string): string {
  return createHmac("sha256", secret()).update(email.trim().toLowerCase()).digest("hex").slice(0, 32);
}

export function unsubscribeUrl(email: string, site = "https://nordinvest.io"): string {
  const e = Buffer.from(email.trim().toLowerCase()).toString("base64url");
  return `${site}/afmeld?e=${e}&t=${unsubscribeToken(email)}`;
}

/** Headers Gmail, Yahoo and Outlook look for on bulk and cold mail (RFC 8058 one-click). */
export function outreachHeaders(email: string, site = "https://nordinvest.io"): Record<string, string> {
  const url = unsubscribeUrl(email, site);
  return {
    "List-Unsubscribe": `<${url.replace("/afmeld?", "/api/afmeld?")}>, <mailto:contact@nordinvest.io?subject=Afmeld>`,
    "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
  };
}
