import { ImageResponse } from "next/og";
import { analyze } from "@/lib/analysis";

/*
 * The preview image for a shared analysis link (/analyseren?…): address,
 * price and what the property gives each month, recalculated from the link's
 * own numbers. Without numbers it falls back to a plain NordInvest card.
 */

export const runtime = "edge";

const dk = (n: number) => Math.round(n).toLocaleString("da-DK");

export async function GET(req: Request) {
  const sp = new URL(req.url).searchParams;
  const price = Number(sp.get("price")) || 0;
  const rent = Number(sp.get("rent")) || 0;
  const addr = (sp.get("addr") || "").split(",")[0].slice(0, 60);
  const r =
    price > 0 && rent > 0
      ? analyze({
          price,
          monthlyRent: rent,
          monthlyOpex: Number(sp.get("opex")) || undefined,
          downPaymentPct: Number(sp.get("downPaymentPct")) || 20,
          interestRate: Number(sp.get("interestRate")) || 5,
        })
      : null;
  const cf = r ? r.cashFlow : null;
  const good = cf != null && cf >= 0;

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", background: "#0a0e16", color: "#fff", padding: "64px 72px", fontFamily: "sans-serif" }}>
        <div style={{ display: "flex", fontSize: 30, fontWeight: 700, color: "#93b4f5" }}>NordInvest · analyse</div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", fontSize: 58, fontWeight: 700, letterSpacing: -1.5 }}>{addr || "Analyse af en bolig"}</div>
          {price > 0 && <div style={{ display: "flex", fontSize: 34, color: "#cbd5e1", marginTop: 12 }}>{`${dk(price)} kr${rent ? ` · leje ${dk(rent)} kr/md.` : ""}`}</div>}
          {cf != null ? (
            <div style={{ display: "flex", alignItems: "baseline", marginTop: 36 }}>
              <div style={{ display: "flex", fontSize: 120, fontWeight: 700, letterSpacing: -4, color: good ? "#34d399" : "#fb7185" }}>{`${good ? "+" : "−"}${dk(Math.abs(cf))}`}</div>
              <div style={{ display: "flex", fontSize: 40, color: "#94a3b8", marginLeft: 16 }}>kr/md. i cash flow</div>
            </div>
          ) : (
            <div style={{ display: "flex", fontSize: 44, color: "#cbd5e1", marginTop: 30 }}>Se om boligen tjener penge, før du køber den.</div>
          )}
        </div>
        <div style={{ display: "flex", fontSize: 28, color: "#94a3b8" }}>Regnet igennem på nordinvest.io · tryk for at se hele analysen</div>
      </div>
    ),
    { width: 1200, height: 630, headers: { "Cache-Control": "public, max-age=86400, s-maxage=604800" } },
  );
}
