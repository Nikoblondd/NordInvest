import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getDealSnapshot } from "@/lib/deals-snapshot";
import { dealCity } from "@/lib/deal-cities";

/*
 * "Månedens bedste køb i <by>": the widget local news sites put on their own
 * pages in an iframe (code on /widget). Live top 3 for the kommune with the
 * market figure, every link back to NordInvest. Edge-cached like /deals.
 */

export const dynamic = "force-dynamic";
export const maxDuration = 60;
export const metadata: Metadata = { robots: { index: false, follow: true }, title: "Månedens bedste køb" };

const kr = (n: number) => `${Math.round(n).toLocaleString("da-DK")} kr.`;
const TYPE: Record<string, string> = { condo: "Ejerlejlighed", villa: "Villa", "terraced house": "Rækkehus" };

export default async function EmbedDeals({ params, searchParams }: { params: { by: string }; searchParams: Record<string, string | undefined> }) {
  const c = dealCity(params.by);
  if (!c) notFound();
  const snap = await getDealSnapshot(c.slug, 3);
  const dark = searchParams.tema === "mork";
  const ref = `utm_source=${encodeURIComponent(searchParams.kilde ?? "widget")}&utm_medium=widget&utm_campaign=bedste-koeb`;
  const link = (href: string) => `https://nordinvest.io${href}${href.includes("?") ? "&" : "?"}${ref}`;
  const month = new Intl.DateTimeFormat("da-DK", { month: "long", year: "numeric" }).format(new Date());

  const ink = dark ? "#f8fafc" : "#0f172a";
  const muted = dark ? "#94a3b8" : "#475569";
  const line = dark ? "#1e293b" : "#e2e8f0";

  return (
    <div style={{ background: dark ? "#0a0e16" : "#ffffff", color: ink, fontFamily: "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif", padding: 16, minHeight: "100vh", boxSizing: "border-box" }}>
      <div style={{ border: `1px solid ${line}`, borderRadius: 16, overflow: "hidden" }}>
        <div style={{ padding: "16px 18px 12px" }}>
          <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#25345a" }}>Månedens bedste køb · {month}</div>
          <div style={{ fontSize: 21, fontWeight: 700, letterSpacing: "-0.02em", marginTop: 6 }}>Bedste udlejningsboliger {c.in}</div>
          {snap && (
            <div style={{ fontSize: 14, color: muted, marginTop: 4, lineHeight: 1.45 }}>
              {snap.positive.toLocaleString("da-DK")} af {snap.scanned.toLocaleString("da-DK")} helårsboliger til salg {c.in} giver plus som udlejning.
            </div>
          )}
        </div>
        <ol style={{ listStyle: "none", margin: 0, padding: 0 }}>
          {(snap?.top ?? []).slice(0, 3).map((d, i) => (
            <li key={d.href} style={{ borderTop: `1px solid ${line}` }}>
              <a href={link(d.href)} target="_blank" rel="noopener" style={{ display: "flex", gap: 12, alignItems: "center", padding: "12px 18px", color: ink, textDecoration: "none" }}>
                <span style={{ width: 18, fontSize: 14, fontWeight: 700, color: muted }}>{i + 1}</span>
                {d.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={d.image} alt="" width={72} height={54} loading="lazy" style={{ width: 72, height: 54, objectFit: "cover", borderRadius: 8, flex: "none" }} />
                ) : null}
                <span style={{ minWidth: 0, flex: 1 }}>
                  <span style={{ display: "block", fontSize: 15, fontWeight: 650, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{d.address.split(",")[0]}</span>
                  <span style={{ display: "block", fontSize: 13, color: muted, marginTop: 2 }}>
                    {TYPE[d.type] ?? "Bolig"} · {kr(d.price)}
                    {d.area ? ` · ${d.area} m²` : ""}
                  </span>
                </span>
                <span style={{ textAlign: "right", flex: "none" }}>
                  <span style={{ display: "block", fontSize: 15, fontWeight: 700, color: d.cashFlow >= 0 ? "#059669" : "#e11d48", fontVariantNumeric: "tabular-nums" }}>
                    {d.cashFlow >= 0 ? "+" : "−"}{Math.round(Math.abs(d.cashFlow)).toLocaleString("da-DK")} kr
                  </span>
                  <span style={{ display: "block", fontSize: 11, color: muted }}>pr. md.</span>
                </span>
              </a>
            </li>
          ))}
          {!snap?.top?.length && <li style={{ padding: "14px 18px", fontSize: 14, color: muted, borderTop: `1px solid ${line}` }}>Ingen boliger at vise lige nu.</li>}
        </ol>
        <a href={link(`/deals/${c.slug}`)} target="_blank" rel="noopener" style={{ display: "flex", justifyContent: "space-between", gap: 12, padding: "12px 18px", borderTop: `1px solid ${line}`, fontSize: 13, color: muted, textDecoration: "none" }}>
          <span>Cash flow med 20 % udbetaling og 5 % rente. Lejen er et estimat.</span>
          <span style={{ fontWeight: 700, color: "#25345a", whiteSpace: "nowrap" }}>Data: NordInvest →</span>
        </a>
      </div>
    </div>
  );
}
