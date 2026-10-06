import { ImageResponse } from "next/og";
import { getUdlejerindeks, pct, dkn } from "@/lib/udlejerindeks";
import { dateDa } from "@/components/deals/DealsSeo";

/*
 * Share image for the Udlejerindeks: the top 10 (or, with ?vis=bund, the
 * biggest kommuner where nothing gives plus) as bars. ?format=linkedin gives a
 * 1080×1350 portrait for the feed; the default is a 1200×630 link preview.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const sp = new URL(req.url).searchParams;
  const tall = sp.get("format") === "linkedin";
  const bottom = sp.get("vis") === "bund";
  const [W, H] = tall ? [1080, 1350] : [1200, 630];
  const idx = await getUdlejerindeks();
  const ranked = idx?.rows.filter((r) => r.rank != null) ?? [];
  const rows = bottom
    ? ranked.filter((r) => r.positive === 0).sort((a, b) => b.scanned - a.scanned).slice(0, tall ? 10 : 6)
    : ranked.slice(0, tall ? 10 : 6);
  const max = Math.max(...ranked.map((r) => r.share), 0.01);
  const title = bottom ? "Her giver ikke én bolig plus" : "Her kan lejen betale lånet";
  const sub = bottom
    ? `${idx?.zero ?? 0} kommuner uden én bolig til salg med positivt cashflow`
    : `Andel af boliger til salg med positivt cashflow som udlejning`;
  const rowH = tall ? 84 : 56;

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", background: "#0a0e16", color: "#fff", padding: tall ? "72px 64px" : "48px 64px", fontFamily: "sans-serif" }}>
        <div style={{ display: "flex", fontSize: tall ? 30 : 24, fontWeight: 700, color: "#93b4f5" }}>NordInvest Udlejerindeks</div>
        <div style={{ display: "flex", fontSize: tall ? 66 : 48, fontWeight: 700, letterSpacing: -1.5, marginTop: 14, lineHeight: 1.05 }}>{title}</div>
        <div style={{ display: "flex", fontSize: tall ? 28 : 22, color: "#94a3b8", marginTop: 12 }}>{sub}</div>
        <div style={{ display: "flex", flexDirection: "column", marginTop: tall ? 48 : 26, flex: 1 }}>
          {rows.map((r) => (
            <div key={r.slug} style={{ display: "flex", alignItems: "center", height: rowH }}>
              <div style={{ display: "flex", width: tall ? 60 : 50, fontSize: tall ? 30 : 24, color: "#64748b", fontWeight: 700 }}>{bottom ? "" : r.rank}</div>
              <div style={{ display: "flex", width: tall ? 300 : 280, fontSize: tall ? 34 : 26, fontWeight: 700 }}>{r.name}</div>
              {bottom ? (
                <div style={{ display: "flex", flex: 1 }} />
              ) : (
                <div style={{ display: "flex", flex: 1, height: tall ? 30 : 22, background: "#1e293b", borderRadius: 999, marginRight: 24 }}>
                  <div style={{ display: "flex", width: `${Math.max(3, (r.share / max) * 100)}%`, height: "100%", background: "#10b981", borderRadius: 999 }} />
                </div>
              )}
              <div style={{ display: "flex", width: bottom ? (tall ? 300 : 260) : tall ? 230 : 210, justifyContent: "flex-end", fontSize: tall ? 30 : 24, fontWeight: 700 }}>
                {bottom ? `0 af ${dkn(r.scanned)} boliger` : `${pct(r.share)} %`}
              </div>
            </div>
          ))}
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: tall ? 24 : 18, color: "#64748b" }}>
          <div style={{ display: "flex" }}>{idx ? `${dkn(idx.positive)} af ${dkn(idx.scanned)} boliger · ${dateDa(idx.updated)}` : ""}</div>
          <div style={{ display: "flex" }}>nordinvest.io/udlejerindeks</div>
        </div>
      </div>
    ),
    { width: W, height: H, headers: { "Cache-Control": "public, max-age=3600, s-maxage=3600" } },
  );
}
