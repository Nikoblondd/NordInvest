import { ImageResponse } from "next/og";
import { analyze } from "@/lib/analysis";
import { getLink } from "@/lib/broker/links";
import { TEXTS, badgeSize, readBadge } from "@/lib/broker/badge";

export const runtime = "nodejs";

/*
 * GET /api/badge/<slug>?tema&tekst&tal&str&hj: the button image an agent puts
 * on a listing page, with the NordInvest mark, a call to action and (optionally)
 * the two numbers investors look at first. Plain PNG, so it works in any
 * website builder, newsletter or e-mail.
 */

const PAL = {
  lys: { bg: "#ffffff", border: "#d9e1ec", fg: "#0b1b33", sub: "#5b6b82", accent: "#2155d6", tile: "#f1f5fb" },
  moerk: { bg: "#0b1b33", border: "#0b1b33", fg: "#ffffff", sub: "#a9b8cf", accent: "#8fb0ff", tile: "#ffffff" },
  blaa: { bg: "#2155d6", border: "#2155d6", fg: "#ffffff", sub: "#d4e0ff", accent: "#ffffff", tile: "#ffffff" },
} as const;

// Liberation Sans (SIL OFL), served from /fonts, loaded once per instance.
let fonts: Promise<{ name: string; data: ArrayBuffer; weight: 400 | 700; style: "normal" }[]> | null = null;
function loadFonts(origin: string) {
  fonts ??= Promise.all([
    fetch(`${origin}/fonts/LiberationSans-Regular.ttf`).then((r) => r.arrayBuffer()),
    fetch(`${origin}/fonts/LiberationSans-Bold.ttf`).then((r) => r.arrayBuffer()),
  ]).then(([reg, bold]) => [
    { name: "Badge", data: reg, weight: 400 as const, style: "normal" as const },
    { name: "Badge", data: bold, weight: 700 as const, style: "normal" as const },
  ]).catch(() => { fonts = null; return []; });
  return fonts;
}

const pct = (n: number) => n.toLocaleString("da-DK", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const kr = (n: number) => Math.round(n).toLocaleString("da-DK");

export async function GET(req: Request, { params }: { params: { slug: string } }) {
  const url = new URL(req.url);
  const slug = params.slug.replace(/\.png$/i, "");
  const o = readBadge(url.searchParams);
  const link = await getLink(slug);
  const { w, h, k } = badgeSize(o);
  const S = 2 * k; // drawn at 2x
  const p = PAL[o.tema];

  let sub = "Afkast, cash flow og renterisiko";
  if (o.tal && link) {
    const r = analyze({ price: link.price, monthlyRent: link.rent, downPaymentPct: 30, interestRate: 5, monthlyOpex: 0, vacancyPct: 0, maintenancePct: 0 });
    sub = r.cashFlow >= 0 ? `${pct(r.capRate)} % afkast · +${kr(r.cashFlow)} kr./md.` : `${pct(r.capRate)} % afkast · se renterisikoen`;
  }
  const logo = `${url.origin}/nordinvest-logo.png`;
  const loaded = await loadFonts(url.origin);

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", background: p.bg, border: `${S}px solid ${p.border}`, borderRadius: (o.hj === "rund" ? 12 : 4) * S, padding: `0 ${14 * S}px 0 ${10 * S}px`, fontFamily: loaded.length ? "Badge" : "sans-serif" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: (o.tal ? 42 : 36) * S, height: (o.tal ? 42 : 36) * S, borderRadius: 9 * S, background: p.tile, flexShrink: 0 }}>
          {/* eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text */}
          <img src={logo} width={(o.tal ? 30 : 26) * S} height={(o.tal ? 30 : 26) * S} style={{ objectFit: "contain" }} />
        </div>
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", marginLeft: 11 * S, flexGrow: 1, minWidth: 0 }}>
          <div style={{ display: "flex", fontSize: 16 * S, fontWeight: 700, color: p.fg, letterSpacing: -0.2 * S, lineHeight: 1.15 }}>{TEXTS[o.tekst]}</div>
          <div style={{ display: "flex", fontSize: 12.5 * S, color: p.sub, marginTop: 3 * S, lineHeight: 1.15 }}>{o.tal ? sub : "Beregnet af NordInvest"}</div>
          {o.tal && <div style={{ display: "flex", fontSize: 10.5 * S, color: p.sub, marginTop: 2 * S, opacity: 0.85 }}>NordInvest</div>}
        </div>
        <div style={{ display: "flex", fontSize: 20 * S, color: p.accent, marginLeft: 8 * S, fontWeight: 700 }}>→</div>
      </div>
    ),
    {
      width: w * 2,
      ...(loaded.length ? { fonts: loaded } : {}),
      height: h * 2,
      headers: { "Cache-Control": "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800" },
    },
  );
}
