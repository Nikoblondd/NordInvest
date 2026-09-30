import { createClient } from "@/lib/supabase/server";
import { isAdminEmail } from "@/lib/access";
import { getAnalytics } from "@/lib/analytics-data";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// CSV export of the analytics (admin only). ?period=month|year controls the label.
export async function GET(req: Request) {
  const supabase = createClient();
  if (!supabase) return new Response("unauthorized", { status: 401 });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !isAdminEmail(user.email)) return new Response("Ingen adgang", { status: 403 });

  const period = new URL(req.url).searchParams.get("period") === "year" ? "aar" : "maaned";
  const a = await getAnalytics();

  const esc = (v: unknown) => {
    const s = String(v ?? "");
    return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines: string[] = [];
  lines.push("NØGLETAL;Værdi");
  lines.push(`Brugere i alt;${a.totalUsers}`);
  lines.push(`Nye brugere (7 dage);${a.newUsers7}`);
  lines.push(`Nye brugere (30 dage);${a.newUsers30}`);
  lines.push(`Betalende brugere;${a.payingUsers}`);
  lines.push(`Konvertering (%);${a.conversionPct}`);
  lines.push(`MRR (kr/md);${a.mrr}`);
  lines.push(`ARR (kr/år);${a.arr}`);
  lines.push(`Analyser i alt;${a.totalAnalyses}`);
  lines.push(`Aktive brugere (30 dage);${a.activeUsers30}`);
  lines.push(`Vagter;${a.watches}`);
  lines.push(`Gemte søgninger;${a.savedSearches}`);
  lines.push("");
  lines.push("BRUGERE");
  lines.push(["Navn", "E-mail", "Telefon", "Plan", "Analyser", "Oprettet"].join(";"));
  for (const u of a.users) {
    lines.push([u.name, u.email, u.phone ?? "", u.tier, u.analyses, u.createdAt].map(esc).join(";"));
  }
  lines.push("");
  lines.push("DAGLIG UDVIKLING (30 dage)");
  lines.push(["Dato", "Nye brugere", "Analyser"].join(";"));
  for (const d of a.series) lines.push([d.date, d.signups, d.analyses].join(";"));

  const csv = "﻿" + lines.join("\n"); // BOM so Excel reads æøå correctly
  const fname = `nordinvest-analytics-${period}-${new Date().toISOString().slice(0, 10)}.csv`;
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${fname}"`,
      "Cache-Control": "no-store",
    },
  });
}
