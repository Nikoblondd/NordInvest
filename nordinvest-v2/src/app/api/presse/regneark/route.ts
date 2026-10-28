import { NextRequest } from "next/server";
import ExcelJS from "exceljs";
import { analyzedHomes } from "@/lib/deals-snapshot";
import { dealCity } from "@/lib/deal-cities";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/*
 * GET /api/presse/regneark?kommuner=hedensted,horsens,vejle: the Deal-motor's
 * full numbers for journalists as one Excel file. An overview sheet, one sheet
 * per kommune with every home it counts, and the method. The counts are worked
 * out exactly as on /deals/<kommune>, at the moment of download.
 */

const TYPE: Record<string, string> = { condo: "Ejerlejlighed", villa: "Villa", "terraced house": "Rækkehus" };
const median = (xs: number[]) => { const s = xs.filter(Number.isFinite).sort((a, b) => a - b); if (!s.length) return null; const m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };

export async function GET(req: NextRequest) {
  const slugs = (req.nextUrl.searchParams.get("kommuner") ?? "").split(",").map((s) => s.trim().toLowerCase()).filter(Boolean).slice(0, 12);
  const cities = slugs.map((s) => dealCity(s)).filter((c): c is NonNullable<ReturnType<typeof dealCity>> => !!c);
  if (!cities.length) return new Response("Angiv kommuner, fx ?kommuner=hedensted,horsens", { status: 400 });

  const now = new Date();
  const stamp = new Intl.DateTimeFormat("da-DK", { dateStyle: "long", timeStyle: "short", timeZone: "Europe/Copenhagen" }).format(now);
  const data = await Promise.all(cities.map(async (c) => ({ c, homes: (await analyzedHomes(c.slug)).sort((a, b) => b.cashFlow - a.cashFlow) })));

  const wb = new ExcelJS.Workbook();
  wb.creator = "NordInvest";
  const head = (ws: ExcelJS.Worksheet) => { const r = ws.getRow(1); r.font = { bold: true, color: { argb: "FFFFFFFF" } }; r.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0B1B33" } }; ws.views = [{ state: "frozen", ySplit: 1 }]; };

  const o = wb.addWorksheet("Oversigt");
  o.columns = [
    { header: "Kommune", key: "k", width: 18 }, { header: "Helårsboliger regnet igennem", key: "n", width: 28 }, { header: "Giver plus som udlejning", key: "p", width: 24 },
    { header: "Andel med plus", key: "s", width: 16, style: { numFmt: "0%" } }, { header: "Medianpris pr. m² (kr)", key: "m", width: 22, style: { numFmt: "#,##0" } },
    { header: "Median bruttoafkast", key: "g", width: 20, style: { numFmt: "0.0\" %\"" } }, { header: "Side med boligerne", key: "u", width: 40 },
  ];
  for (const { c, homes } of data) {
    const plus = homes.filter((h) => h.cashFlow > 0).length;
    o.addRow({ k: c.name, n: homes.length, p: plus, s: homes.length ? Math.round((plus / homes.length) * 1000) / 1000 : 0, m: Math.round(median(homes.filter((h) => h.area).map((h) => h.price / (h.area as number))) ?? 0), g: Math.round((median(homes.map((h) => h.grossYield)) ?? 0) * 10) / 10, u: { text: `nordinvest.io/deals/${c.slug}`, hyperlink: `https://nordinvest.io/deals/${c.slug}` } });
  }
  head(o);
  o.addRow([]);
  o.addRow([`Opgjort ${stamp}. Kilde: NordInvest (nordinvest.io). Se fanen Metode for forudsætningerne.`]).font = { italic: true, color: { argb: "FF475569" } };

  for (const { c, homes } of data) {
    const ws = wb.addWorksheet(c.name.slice(0, 31));
    ws.columns = [
      { header: "Adresse", key: "a", width: 34 }, { header: "Postnr.", key: "z", width: 9 }, { header: "By", key: "by", width: 16 }, { header: "Type", key: "t", width: 14 },
      { header: "Pris (kr)", key: "pr", width: 13, style: { numFmt: "#,##0" } }, { header: "Areal (m²)", key: "ar", width: 11 }, { header: "Værelser", key: "v", width: 10 }, { header: "Byggeår", key: "y", width: 9 },
      { header: "Pris pr. m² (kr)", key: "pm", width: 15, style: { numFmt: "#,##0" } }, { header: "Anslået leje pr. md. (kr)", key: "l", width: 22, style: { numFmt: "#,##0" } },
      { header: "Faste udgifter pr. md. (kr)", key: "fu", width: 24, style: { numFmt: "#,##0" } },
      { header: "Cash flow pr. md. (kr)", key: "cf", width: 20, style: { numFmt: "#,##0;[Red]-#,##0" } }, { header: "Giver plus", key: "plus", width: 11 },
      { header: "Bruttoafkast", key: "g", width: 13, style: { numFmt: "0.0\" %\"" } }, { header: "Nettoafkast", key: "n", width: 12, style: { numFmt: "0.0\" %\"" } },
      { header: "Annonce", key: "url", width: 40 },
    ];
    for (const h of homes) {
      ws.addRow({
        a: h.road || h.address, z: h.zip, by: h.city, t: TYPE[h.type] ?? h.type, pr: h.price, ar: h.area, v: h.rooms, y: h.yearBuilt, pm: h.area ? Math.round(h.price / h.area) : null,
        l: Math.round(h.estRent), fu: h.monthlyExpense ?? Math.round(((h.area ?? 0) * 35) / 50) * 50, cf: Math.round(h.cashFlow), plus: h.cashFlow > 0 ? "Ja" : "Nej", g: Math.round(h.grossYield * 10) / 10, n: Math.round(h.capRate * 10) / 10,
        url: h.url ? { text: "Se annoncen", hyperlink: h.url } : "",
      });
    }
    head(ws);
    ws.autoFilter = { from: "A1", to: "P1" };
  }

  const m = wb.addWorksheet("Metode");
  m.getColumn(1).width = 110;
  for (const line of [
    "Sådan er tallene regnet",
    "",
    "Hvilke boliger: alle ejerlejligheder, villaer og rækkehuse til salg i kommunen (helårsboliger). Fritidshuse og andelsboliger er ikke med.",
    "Boliger med tal, der ikke kan passe (fx forkert areal eller pris i annoncen), er sorteret fra med de samme regler som på nordinvest.io.",
    "Finansiering: 20 % udbetaling og 5 % rente på lånet.",
    "Leje: anslået markedsleje ud fra postnummer og boligens størrelse (samme lejeestimat som i resten af NordInvest).",
    "Faste udgifter: ejerudgiften fra annoncen, når den er oplyst, ellers et skøn på 35 kr. pr. m² om måneden.",
    "Giver plus: lejen dækker lån, ydelse og alle faste udgifter, så cash flow pr. måned er over 0 kr.",
    "Bruttoafkast: årlig leje i procent af prisen. Nettoafkast: årlig leje minus faste udgifter i procent af prisen.",
    "",
    `Opgjort ${stamp}. Tallene ændrer sig, når boliger kommer til eller bliver solgt.`,
    "Kilde ved brug: NordInvest (nordinvest.io). Spørgsmål: Nikolaj Blond, contact@nordinvest.io, 20 99 37 97.",
  ]) m.addRow([line]);
  m.getRow(1).font = { bold: true, size: 14 };

  const buf = await wb.xlsx.writeBuffer();
  const name = `NordInvest-${cities.map((c) => c.slug).join("-")}-${now.toISOString().slice(0, 10)}.xlsx`;
  return new Response(buf as ArrayBuffer, { headers: { "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "Content-Disposition": `attachment; filename="${name}"`, "Cache-Control": "no-store" } });
}
