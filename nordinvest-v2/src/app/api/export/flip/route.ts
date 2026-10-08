import { NextRequest } from "next/server";
import ExcelJS from "exceljs";
import { createClient } from "@/lib/supabase/server";
import { effectiveLimit } from "@/lib/access";
import { limits } from "@/lib/pricing";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/*
 * The flip as a spreadsheet the buyer, the bank or a partner can work in.
 * Every result is a live formula; the yellow cells are inputs seeded with the
 * analysis' numbers. The renovation sheet carries every line with its
 * product link, and its totals feed the deal sheet.
 */

type ExportLine = {
  element: string;
  label: string;
  qty: number;
  unit: string;
  materials: number;
  hours: number;
  labour: number;
  diy: boolean;
  product?: { name: string; url: string; store: string } | null;
  estimate: boolean;
};

type Body = {
  address: string;
  zip: string;
  area: number;
  price: number;
  arv: number;
  arvNote: string;
  downPct: number; // 100 = kontant
  rate: number;
  months: number;
  monthlyRunning: number; // ejerudgift + forbrug pr. md.
  lawyer: number;
  reports: number;
  other: number;
  bufferPct: number;
  taxCase: "live_in" | "private" | "business";
  target: number;
  maxBid: number;
  lines: ExportLine[];
};

const NAVY = "FF0F172A";
const BLUE = "FF2563EB";
const YELLOW = "FFFEF9C3";
const GREY = "FFF1F5F9";
const KR = '#,##0" kr."';
const PCT_IN = '0.0" %"';
const PCT_R = "0.0%";

const TAX_NAME = { live_in: "Bo og flip", private: "Privat salg", business: "Næring" } as const;

async function paid(): Promise<boolean> {
  const supabase = createClient();
  if (!supabase) return false;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;
  const { data: profile } = await supabase.from("profiles").select("subscription_tier").eq("id", user.id).single();
  return effectiveLimit(profile?.subscription_tier, user.email) > limits.free;
}

export async function POST(req: NextRequest) {
  if (!(await paid())) return Response.json({ error: "paid_feature" }, { status: 402 });
  const b = (await req.json()) as Body;
  const wb = new ExcelJS.Workbook();
  wb.creator = "NordInvest";
  wb.created = new Date();

  // Renovation totals sit two rows under the last line; the deal sheet points there.
  const totRow = 4 + b.lines.length + 1;

  // ── Flip: the deal sheet ─────────────────────────────────────────────────────
  const ws = wb.addWorksheet("Flip", { views: [{ showGridLines: false }] });
  ws.columns = [{ width: 38 }, { width: 18 }, { width: 62 }];
  ws.getCell("A1").value = `Flip-kalkule · ${b.address}`;
  ws.getCell("A1").font = { bold: true, size: 16, color: { argb: NAVY } };
  ws.getCell("A2").value = `Gule felter kan rettes, resten er formler. Lavet af NordInvest ${new Date().toLocaleDateString("da-DK")}.`;
  ws.getCell("A2").font = { italic: true, color: { argb: "FF64748B" } };

  const R = (n: number) => `B${n}`;
  const head = (n: number, t: string) => {
    ws.getCell(`A${n}`).value = t;
    ws.getRow(n).font = { bold: true, color: { argb: "FFFFFFFF" } };
    for (const c of ["A", "B", "C"]) ws.getCell(`${c}${n}`).fill = { type: "pattern", pattern: "solid", fgColor: { argb: NAVY } };
  };
  const input = (n: number, label: string, v: number | string, fmt: string, note = "") => {
    ws.getCell(`A${n}`).value = label;
    const c = ws.getCell(R(n));
    c.value = v;
    c.numFmt = fmt;
    c.font = { color: { argb: BLUE }, bold: true };
    c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: YELLOW } };
    ws.getCell(`C${n}`).value = note;
  };
  const calc = (n: number, label: string, formula: string, fmt: string, note = "", strong = false) => {
    ws.getCell(`A${n}`).value = label;
    const c = ws.getCell(R(n));
    c.value = { formula };
    c.numFmt = fmt;
    if (strong) { ws.getCell(`A${n}`).font = { bold: true }; c.font = { bold: true }; }
    ws.getCell(`C${n}`).value = note;
    ws.getCell(`C${n}`).font = { color: { argb: "FF64748B" } };
  };

  head(4, "KØB");
  input(5, "Købspris", b.price, KR, "Udbudsprisen. Skriv dit bud her.");
  input(6, "Udbetaling", b.downPct, PCT_IN, "100 = kontant køb");
  calc(7, "Lån", `${R(5)}*(1-${R(6)}/100)`, KR);
  calc(8, "Tinglysning af skøde", `1850+${R(5)}*0.6%`, KR, "1.850 kr. + 0,6 % af købsprisen");
  calc(9, "Tinglysning af pantebrev", `IF(${R(7)}>0,1825+${R(7)}*1.25%,0)`, KR, "1.825 kr. + 1,25 % af lånet (fra 1.1.2026)");
  input(10, "Køberrådgiver / advokat", b.lawyer, KR, "Skøn");
  calc(11, "Købsomkostninger i alt", `SUM(${R(8)}:${R(10)})`, KR, "", true);

  head(13, "RENOVERING");
  calc(14, "Materialer", `Renovering!E${totRow}`, KR, "Fra fanen Renovering, butikspriser inkl. moms");
  calc(15, "Håndværkere", `Renovering!G${totRow}`, KR, "Fra fanen Renovering, timepriser inkl. moms");
  input(16, "Buffer til uforudsete udgifter", b.bufferPct, PCT_IN, "10 % opfriskning, 15 % køkken og bad, 20 % total");
  calc(17, "Buffer", `(${R(14)}+${R(15)})*${R(16)}/100`, KR);
  calc(18, "Renovering i alt", `${R(14)}+${R(15)}+${R(17)}`, KR, "", true);

  head(20, "EJERTID");
  input(21, "Måneder fra køb til salg", b.months, "0", "");
  input(22, "Rente", b.rate, PCT_IN, "Hele lånet, om året");
  input(23, "Ejerudgift og forbrug pr. md.", b.monthlyRunning, KR, "Ejerudgift fra annoncen + 1.200 kr. forbrug");
  calc(24, "Renter", `${R(7)}*${R(22)}/100*${R(21)}/12`, KR);
  calc(25, "Ejerudgift og forbrug", `${R(23)}*${R(21)}`, KR);
  calc(26, "Ejertid i alt", `${R(24)}+${R(25)}`, KR, "", true);

  head(28, "SALG");
  input(29, "Salgspris efter renovering", b.arv, KR, b.arvNote);
  calc(30, "Mægler", `MAX(35000,${R(29)}*1.5%)`, KR, "1,5 %, mindst 35.000 kr. (skøn)");
  input(31, "Tilstands- og elinstallationsrapport", b.reports, KR, "Skøn");
  input(32, "Markedsføring, ejerskifte, advokat", b.other, KR, "Skøn");
  calc(33, "Salgsomkostninger i alt", `SUM(${R(30)}:${R(32)})`, KR, "", true);

  head(35, "RESULTAT");
  calc(36, "Samlede omkostninger", `${R(5)}+${R(11)}+${R(18)}+${R(26)}+${R(33)}`, KR);
  calc(37, "Fortjeneste før skat", `${R(29)}-${R(36)}`, KR, "", true);
  input(38, "Skat", TAX_NAME[b.taxCase], "@", "Vælg: Bo og flip, Privat salg eller Næring");
  ws.getCell(R(38)).dataValidation = { type: "list", allowBlank: false, formulae: ['"Bo og flip,Privat salg,Næring"'] };
  calc(39, "Ejendomsavance", `${R(29)}-${R(33)}-(${R(5)}+${R(11)})-${R(18)}-10000*ROUNDUP(MAX(${R(21)}/12,1/12),0)`, KR, "Salgspris minus salgs-, købs- og forbedringsudgifter, minus 10.000 kr. pr. år");
  calc(40, "Skat", `IF(${R(38)}="Bo og flip",0,IF(${R(38)}="Næring",MAX(0,${R(37)})*52%,MAX(0,MAX(0,${R(39)})*42%-${R(24)}*33%)))`, KR, "Privat: 42 % af avancen minus rentefradrag (33 %). Næring: ca. 52 %. Vejledende.");
  calc(41, "Fortjeneste efter skat", `${R(37)}-${R(40)}`, KR, "", true);
  calc(42, "Fortjeneste af salgsprisen", `IF(${R(29)}>0,${R(41)}/${R(29)},0)`, PCT_R);
  calc(43, "Egen kapital bundet", `${R(5)}-${R(7)}+${R(11)}+${R(18)}+${R(26)}`, KR);
  calc(44, "Afkast på egen kapital", `IF(${R(43)}>0,${R(41)}/${R(43)},0)`, PCT_R, "", true);
  input(45, "Krævet fortjeneste", b.target, PCT_IN, "Af salgsprisen");
  ws.getCell("A46").value = "Dit maksimale bud";
  ws.getCell(R(46)).value = b.maxBid;
  ws.getCell(R(46)).numFmt = KR;
  ws.getCell("A46").font = { bold: true };
  ws.getCell(R(46)).font = { bold: true };
  ws.getCell("C46").value = "Beregnet af NordInvest ved dine tal. Prøv selv: sæt købsprisen i B5, og se B42 nå kravet i B45.";
  ws.getCell("C46").font = { color: { argb: "FF64748B" } };
  for (const n of [41, 44]) ws.getCell(R(n)).border = { top: { style: "thin" }, bottom: { style: "double" } };
  ws.getCell(`A48`).value = "Skatten er vejledende og afhænger af din øvrige indkomst. Tal med en revisor, før du køber.";
  ws.getCell(`A48`).font = { italic: true, size: 9, color: { argb: "FF64748B" } };

  // ── Renovering: every line, totals feed the deal sheet ───────────────────────
  const rs = wb.addWorksheet("Renovering", { views: [{ state: "frozen", ySplit: 3 }] });
  rs.columns = [{ width: 18 }, { width: 38 }, { width: 9 }, { width: 8 }, { width: 15 }, { width: 9 }, { width: 15 }, { width: 46 }];
  rs.getCell("A1").value = `Renoveringsbudget · ${b.address}`;
  rs.getCell("A1").font = { bold: true, size: 14, color: { argb: NAVY } };
  rs.getRow(3).values = ["Del af boligen", "Post", "Antal", "Enhed", "Materialer", "Timer", "Håndværk", "Produkt"];
  rs.getRow(3).font = { bold: true };
  rs.getRow(3).fill = { type: "pattern", pattern: "solid", fgColor: { argb: GREY } };
  let r = 4;
  for (const l of b.lines) {
    const row = rs.getRow(r);
    row.values = [l.element, l.label + (l.estimate ? " (skøn)" : ""), l.qty, l.unit, Math.round(l.materials), l.hours || null, Math.round(l.labour), l.product?.name ?? ""];
    for (const c of [5, 7]) { row.getCell(c).numFmt = KR; row.getCell(c).fill = { type: "pattern", pattern: "solid", fgColor: { argb: YELLOW } }; }
    if (l.diy) row.getCell(7).note = "Du laver det selv";
    if (l.product?.url) row.getCell(8).value = { text: `${l.product.name} (${l.product.store})`, hyperlink: l.product.url };
    if (l.product?.url) row.getCell(8).font = { color: { argb: BLUE }, underline: true };
    r++;
  }
  const last = r - 1;
  rs.getCell(`B${totRow}`).value = "I alt";
  rs.getCell(`E${totRow}`).value = { formula: `SUM(E4:E${last})` };
  rs.getCell(`G${totRow}`).value = { formula: `SUM(G4:G${last})` };
  for (const c of ["B", "E", "G"]) rs.getCell(`${c}${totRow}`).font = { bold: true };
  for (const c of ["E", "G"]) rs.getCell(`${c}${totRow}`).numFmt = KR;

  const buf = await wb.xlsx.writeBuffer();
  const name = `NordInvest-flip-${b.address.replace(/[^A-Za-z0-9æøåÆØÅ]+/g, "-").replace(/^-|-$/g, "").slice(0, 60)}.xlsx`;
  return new Response(buf, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${encodeURIComponent(name)}"`,
    },
  });
}
