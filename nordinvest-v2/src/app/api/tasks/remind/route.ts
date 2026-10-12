import { NextResponse } from "next/server";
import { cronAuthorized } from "@/lib/gate";
import { hasToolAccess } from "@/lib/access";
import { getAuthUser } from "@/lib/supabase/admin";
import { fmtDue, type Mappe, type Task } from "@/lib/mappe/checklist";
import { PITCH_FROM } from "@/lib/outreach/schedule";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

/*
 * Daily at 07.00 (Danish time): every member gets one e-mail with the tasks
 * due tomorrow across their properties ("Besked dagen før"). Members only,
 * one mail per person, nothing sent when there is nothing due.
 */
const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://nordinvest.io";
const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

/** Tomorrow's date in Copenhagen as YYYY-MM-DD. */
function tomorrowDk(): string {
  const d = new Date(Date.now() + 86400000);
  return new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Copenhagen", year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
}

export async function GET(req: Request) {
  if (!cronAuthorized(req)) return NextResponse.json({ ok: false }, { status: 401 });
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const resend = process.env.RESEND_API_KEY;
  if (!base || !key || !resend) return NextResponse.json({ ok: false, reason: "not_configured" });
  const headers = { apikey: key, Authorization: `Bearer ${key}` };

  const day = tomorrowDk();
  const rows = (await fetch(`${base}/rest/v1/analyses?select=id,user_id,property_url,property_data&saved_to_portfolio=eq.true&limit=10000`, { headers, cache: "no-store" })
    .then((r) => r.json()).catch(() => [])) as { id: string; user_id: string; property_url: string | null; property_data: { address?: string; mappe?: Mappe } | null }[];

  // Tomorrow's open tasks, grouped per member.
  const byUser = new Map<string, { t: Task; id: string; address: string }[]>();
  for (const r of Array.isArray(rows) ? rows : []) {
    const m = r.property_data?.mappe;
    if (!m || m.stage === "droppet") continue;
    for (const t of m.tasks ?? []) {
      if (t.done || !t.due || t.due.slice(0, 10) !== day) continue;
      const list = byUser.get(r.user_id) ?? [];
      list.push({ t, id: r.id, address: (r.property_data?.address || r.property_url || "Bolig").split(",")[0] });
      byUser.set(r.user_id, list);
    }
  }

  let sent = 0;
  for (const [userId, items] of Array.from(byUser.entries())) {
    const user = await getAuthUser(userId);
    if (!user?.email || !hasToolAccess(user)) continue;
    const first = String(user.user_metadata?.full_name ?? "").split(" ")[0];
    items.sort((a, b) => (a.t.due ?? "").localeCompare(b.t.due ?? ""));
    const list = items.map(({ t, id, address }) => `<tr><td style="padding:10px 0;border-top:1px solid #eef2f7"><div style="font-weight:600;color:#0f172a">${esc(t.title)}</div><div style="color:#64748b;font-size:13px">${esc(address)} · ${esc(fmtDue(t.due!))}</div></td><td style="padding:10px 0;border-top:1px solid #eef2f7;text-align:right"><a href="${SITE}/app/ejendomme/${id}?fane=opgaver" style="color:#2563eb;font-weight:600;font-size:13px;text-decoration:none">Åbn</a></td></tr>`).join("");
    const html = `<div style="font-family:-apple-system,Segoe UI,sans-serif;max-width:520px;color:#0f172a;font-size:15px;line-height:1.6"><p>Hej${first ? ` ${esc(first)}` : ""},</p><p>I morgen har du ${items.length === 1 ? "én opgave" : `${items.length} opgaver`} i NordInvest:</p><table style="width:100%;border-collapse:collapse">${list}</table><p style="margin-top:20px"><a href="${SITE}/app/opgaver" style="display:inline-block;background:#2563eb;color:#fff;text-decoration:none;font-weight:600;padding:11px 18px;border-radius:8px">Se alle opgaver</a></p><p style="font-size:12px;color:#94a3b8">Du får denne påmindelse, fordi du har opgaver med dato i NordInvest.</p></div>`;
    const ok = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${resend}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: PITCH_FROM, to: [user.email], reply_to: "contact@nordinvest.io", subject: items.length === 1 ? `I morgen: ${items[0].t.title}` : `I morgen: ${items.length} opgaver`, html }),
    }).then((r) => r.ok).catch(() => false);
    if (ok) sent++;
  }
  return NextResponse.json({ ok: true, day, members: byUser.size, sent });
}
