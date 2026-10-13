/* eslint-disable @typescript-eslint/no-explicit-any */
import { GET as searchDeals } from "@/app/api/deals/search/route";
import { INTERNAL_HEADER, internalToken } from "@/lib/internal";
import { dealHref, investHref } from "@/lib/deal-links";
import { PITCH_FROM } from "@/lib/outreach/schedule";
import { MAX_HITS, criteriaChips, nextRun, scheduleLabel, searchParams, type Agent, type Hit } from "./agents";

/*
 * Server only: runs one search agent. The Deal-motor search is called
 * in-process (with the per-process internal token, so it gets the full,
 * unlocked result), matches already seen are skipped, new ones go to the top
 * of the agent's list, and the member is e-mailed when something new came in.
 * The first run of a new agent only records what is on the market already.
 */

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://nordinvest.io";
const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);
const kr = (n: number) => `${Math.round(n).toLocaleString("da-DK")} kr.`;

/** Runs the agent's search and returns the scored listings (best first). */
export async function searchFor(agent: Pick<Agent, "criteria">): Promise<{ ok: boolean; deals: any[] }> {
  const q = searchParams(agent.criteria);
  const req = new Request(`${SITE}/api/deals/search?${q.toString()}`, { headers: { [INTERNAL_HEADER]: internalToken } });
  try {
    const res = await searchDeals(req);
    const data = await res.json();
    return { ok: !!data?.ok, deals: Array.isArray(data?.deals) ? data.deals : [] };
  } catch {
    return { ok: false, deals: [] };
  }
}

function toHit(d: any, market: string, fresh: boolean, at: string): Hit {
  const inv = market === "investering";
  const href = (inv ? investHref(d, "30", "5") : dealHref(d, "20", "5")).replace(/^\/analyseren/, "/app/analyser");
  return {
    id: String(d.id),
    foundAt: at,
    fresh,
    status: fresh ? "ny" : "set",
    address: String(d.address ?? d.road ?? ""),
    road: String(d.road || d.title || d.address || "Bolig"),
    zip: Number(d.zip) || 0,
    city: String(d.city ?? ""),
    price: Number(d.price) || 0,
    area: d.area ?? null,
    rooms: d.rooms ?? null,
    score: Number(d.score) || 0,
    cashFlow: Number(d.cashFlow) || 0,
    capRate: Number(d.capRate) || 0,
    rent: inv ? (d.noi ? Math.round(d.noi / 12) : null) : (d.estRent ?? null),
    image: d.image ?? null,
    url: String(d.url ?? ""),
    source: String(d.source ?? ""),
    href,
    priceChangePct: d.priceChangePct ?? null,
  };
}

/**
 * Runs an agent and returns the updated agent plus the new hits. `first`
 * means the agent was just made: what matches now is shown but not mailed.
 */
export async function runAgent(agent: Agent, opts: { first?: boolean } = {}): Promise<{ agent: Agent; fresh: Hit[]; ok: boolean }> {
  const now = new Date();
  const at = now.toISOString();
  const { ok, deals } = await searchFor(agent);
  const plausible = deals.filter((d) => d?.id && !d.suspect);
  const seen = new Set(agent.seen);
  const isFirst = opts.first || agent.lastRunAt == null;
  const newOnes = plausible.filter((d) => !seen.has(String(d.id)));
  const fresh = isFirst ? [] : newOnes.map((d) => toHit(d, agent.criteria.market, true, at));
  const initial = isFirst ? plausible.slice(0, 30).map((d) => toHit(d, agent.criteria.market, false, at)) : [];

  const known = new Set(agent.hits.map((h) => h.id));
  const hits = [...fresh, ...initial].filter((h) => !known.has(h.id)).concat(agent.hits).slice(0, MAX_HITS);
  const allSeen = Array.from(new Set([...plausible.map((d) => String(d.id)), ...agent.seen])).slice(0, 1500);

  const next: Agent = {
    ...agent,
    hits,
    seen: ok ? allSeen : agent.seen,
    lastRunAt: at,
    nextRunAt: nextRun(agent.schedule, now),
    runs: [{ at, matches: plausible.length, fresh: fresh.length, emailed: false, ok }, ...agent.runs].slice(0, 30),
  };
  return { agent: next, fresh, ok };
}

/** The e-mail for new matches. */
export function agentEmail(agent: Agent, fresh: Hit[], firstName: string): { subject: string; html: string } {
  const top = fresh.slice(0, 8);
  const rows = top.map((h) => {
    const img = h.image ? `<img src="${esc(h.image)}" width="88" height="66" alt="" style="display:block;width:88px;height:66px;object-fit:cover;border-radius:8px;background:#f1f5f9">` : `<div style="width:88px;height:66px;border-radius:8px;background:#f1f5f9"></div>`;
    const cf = `${h.cashFlow >= 0 ? "+" : "-"}${Math.round(Math.abs(h.cashFlow)).toLocaleString("da-DK")} kr./md.`;
    return `<tr><td style="padding:12px 12px 12px 0;border-top:1px solid #eef2f7;vertical-align:top;width:88px">${img}</td>
<td style="padding:12px 0;border-top:1px solid #eef2f7;vertical-align:top"><div style="font-weight:600;color:#0f172a">${esc(h.road)}</div>
<div style="color:#64748b;font-size:13px">${h.zip} ${esc(h.city)} · ${kr(h.price)}${h.area ? ` · ${h.area} m²` : ""}</div>
<div style="font-size:13px;margin-top:4px"><span style="color:${h.cashFlow >= 0 ? "#047857" : "#e11d48"};font-weight:600">${cf}</span> <span style="color:#64748b">· score ${h.score}</span></div>
<a href="${SITE}${esc(h.href)}" style="display:inline-block;margin-top:6px;color:#2563eb;font-weight:600;font-size:13px;text-decoration:none">Se analysen</a></td></tr>`;
  }).join("");
  const more = fresh.length > top.length ? `<p style="color:#64748b;font-size:14px">Og ${fresh.length - top.length} mere.</p>` : "";
  return {
    subject: fresh.length === 1 ? `Ny bolig til "${agent.name}": ${fresh[0].road}` : `${fresh.length} nye boliger til "${agent.name}"`,
    html: `<div style="font-family:-apple-system,Segoe UI,sans-serif;max-width:560px;color:#0f172a;font-size:15px;line-height:1.55">
<p>Hej${firstName ? ` ${esc(firstName)}` : ""},</p>
<p>Din søgeagent <b>${esc(agent.name)}</b> har fundet ${fresh.length === 1 ? "en ny bolig" : `${fresh.length} nye boliger`}, der er kommet på markedet siden sidst.</p>
<p style="color:#64748b;font-size:13px;margin:0 0 8px">${criteriaChips(agent.criteria).map(esc).join(" · ")}</p>
<table style="width:100%;border-collapse:collapse">${rows}</table>${more}
<p style="margin-top:20px"><a href="${SITE}/app/find/agenter/${agent.id}" style="display:inline-block;background:#2563eb;color:#fff;text-decoration:none;font-weight:600;padding:12px 20px;border-radius:8px">Åbn agenten i NordInvest</a></p>
<p style="font-size:12px;color:#94a3b8">Agenten kører ${esc(scheduleLabel(agent.schedule).toLowerCase())}. Du kan ændre tidspunktet eller slå mails fra under Find boliger → Søgeagenter.</p></div>`,
  };
}

export async function sendAgentEmail(to: string, mail: { subject: string; html: string }): Promise<boolean> {
  const key = process.env.RESEND_API_KEY;
  if (!key) return false;
  return fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: PITCH_FROM, to: [to], reply_to: "contact@nordinvest.io", subject: mail.subject, html: mail.html }),
  }).then((r) => r.ok).catch(() => false);
}

/**
 * Puts a finished run into the newest stored copy of the agent: the run's
 * hits, seen list and times, but the member's own settings and any status
 * they gave a listing while the run was going.
 */
export function mergeRun(latest: Agent, run: Agent): Agent {
  const status = new Map(latest.hits.map((h) => [h.id, h]));
  return {
    ...latest,
    hits: run.hits.map((h) => { const s = status.get(h.id); return s ? { ...h, status: s.status, savedId: s.savedId } : h; }),
    seen: run.seen,
    runs: run.runs,
    lastRunAt: run.lastRunAt,
    nextRunAt: latest.active ? run.nextRunAt : null,
  };
}
