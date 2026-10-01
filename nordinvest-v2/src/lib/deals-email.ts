import { FEATURED_COMMERCIAL, FEATURED_MONTH_LABEL, FEATURED_RESIDENTIAL, type FeaturedDeal } from "@/lib/featured-deals";

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://nordinvest.io";
const kr = (n: number) => `${Math.round(n).toLocaleString("da-DK")} kr.`;
const pct = (n: number) => `${n.toFixed(1).replace(".", ",")} %`;

function card(d: FeaturedDeal) {
  const facts = [kr(d.price), `${d.area} m²`, `score ${d.score}`, d.cashFlowMonth != null ? `${d.cashFlowMonth >= 0 ? "+" : "−"}${kr(Math.abs(d.cashFlowMonth))}/md.` : `afkast ${pct(d.yieldPct)}`].join(" · ");
  return `<tr><td style="padding:0 0 18px;">
    <a href="${SITE}${d.analyzeUrl}" style="text-decoration:none;color:#0f1f3d;">
      <img src="${d.image}" alt="${d.address}, ${d.city}" width="488" style="display:block;width:100%;max-width:488px;height:auto;border-radius:12px;" />
      <p style="margin:10px 0 2px;font-weight:700;font-size:16px;">${d.address}, ${d.zip} ${d.city}</p>
      <p style="margin:0;color:#475569;font-size:14px;">${d.typeLabel} · ${facts}</p>
      <p style="margin:4px 0 0;color:#334155;font-size:14px;">${d.highlight}</p>
    </a></td></tr>`;
}

/** The monthly deals email, built from the month's curated featured deals. */
export function dealsEmail(p: { name: string | null; unsubUrl: string }) {
  const hi = p.name ? `Hej ${p.name.split(" ")[0]},` : "Hej,";
  const month = FEATURED_MONTH_LABEL.split(" ")[0].toLowerCase();
  return {
    subject: `Månedens deals for ${month}: 3 boliger og 3 erhvervsejendomme`,
    html: `<div style="max-width:520px;margin:0 auto;padding:24px 16px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#0f1f3d;font-size:15px;line-height:1.6;">
      <p style="margin:0 0 20px;font-weight:700;font-size:16px;">NordInvest</p>
      <p>${hi}</p>
      <p>Deal-motoren har regnet hele markedet igennem igen. Her er ${month}s bedste boliger og erhvervsejendomme, regnet med 20 % udbetaling og 5 % rente (erhverv 30 %). Lejen er et estimat, så regn den efter, før du byder.</p>
      <p style="margin:24px 0 10px;font-weight:700;">Boliger</p>
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0">${FEATURED_RESIDENTIAL.map(card).join("")}</table>
      <p style="margin:8px 0 10px;font-weight:700;">Erhverv</p>
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0">${FEATURED_COMMERCIAL.map(card).join("")}</table>
      <a href="${SITE}/deals" style="display:inline-block;margin:8px 0 4px;padding:12px 20px;border-radius:10px;background:#2563eb;color:#fff;text-decoration:none;font-weight:600;">Se hele Deal-motoren</a>
      <p style="margin:32px 0 0;padding-top:16px;border-top:1px solid #eef2f7;color:#94a3b8;font-size:12px;line-height:1.5;">
        Du får denne mail, fordi du har bedt om månedens deals fra NordInvest (NordInvest v/ Nikolaj Blond, CVR 44701898).
        <a href="${p.unsubUrl}" style="color:#94a3b8;">Afmeld månedens deals</a>.
      </p>
    </div>`,
  };
}
