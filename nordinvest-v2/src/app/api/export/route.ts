import { NextRequest } from "next/server";
import ExcelJS from "exceljs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Body = {
  address?: string;
  price: number;
  monthlyRent: number;
  downPaymentPct: number;
  interestRate: number;
  termYears: number;
  vacancyPct: number;
  maintenancePct: number;
  monthlyOpex: number;
  acqCostPct: number;
  appreciationPct: number;
  rentGrowthPct: number;
  holdYears: number;
};

const NAVY = "FF0F172A";
const BLUE = "FF2563EB";

export async function POST(req: NextRequest) {
  const b = (await req.json()) as Body;
  const hold = Math.min(Math.max(Math.round(b.holdYears) || 10, 1), 30);

  const wb = new ExcelJS.Workbook();
  wb.creator = "NordInvest";
  wb.created = new Date();

  /* ---------- Antagelser (editable inputs) ---------- */
  const a = wb.addWorksheet("Antagelser", { views: [{ showGridLines: false }] });
  a.columns = [{ width: 34 }, { width: 18 }, { width: 40 }];
  title(a, "Antagelser — ret cellerne, resten regner sig selv");
  a.getCell("A2").value = b.address || "Ejendomsanalyse";
  a.getCell("A2").font = { italic: true, color: { argb: "FF64748B" } };

  const inputs: [string, number, string?][] = [
    ["Købspris (kr)", b.price],
    ["Månedlig leje (kr)", b.monthlyRent],
    ["Udbetaling (%)", b.downPaymentPct],
    ["Rente (% p.a.)", b.interestRate],
    ["Løbetid (år)", b.termYears],
    ["Tomgang (%)", b.vacancyPct],
    ["Vedligehold (% af leje)", b.maintenancePct],
    ["Faste driftsudgifter (kr/md)", b.monthlyOpex],
    ["Købsomkostninger (%)", b.acqCostPct],
    ["Værdistigning (%/år)", b.appreciationPct],
    ["Lejevækst (%/år)", b.rentGrowthPct],
    ["Ejerperiode (år)", hold],
  ];
  // values start at row 3 → B3..B14
  inputs.forEach(([label, val], i) => {
    const r = 3 + i;
    a.getCell(`A${r}`).value = label;
    const c = a.getCell(`B${r}`);
    c.value = val;
    c.numFmt = "#,##0";
    c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFEF9C3" } };
    c.border = allBorder();
    c.font = { bold: true };
  });

  const P = "Antagelser!B3", R = "Antagelser!B4", DP = "Antagelser!B5", RATE = "Antagelser!B6",
    TERM = "Antagelser!B7", VAC = "Antagelser!B8", MNT = "Antagelser!B9", FIX = "Antagelser!B10",
    ACQ = "Antagelser!B11", APPR = "Antagelser!B12", RG = "Antagelser!B13";

  /* ---------- Analyse (summary, formulas) ---------- */
  const s = wb.addWorksheet("Analyse", { views: [{ showGridLines: false }] });
  s.columns = [{ width: 34 }, { width: 20 }];
  title(s, "Analyse — nøgletal");

  // rows: label + formula
  const rows: [string, string, "kr" | "pct" | "num"][] = [
    ["Årlig leje", `${R}*12`, "kr"], // B2
    ["Udbetaling", `${P}*${DP}/100`, "kr"], // B3
    ["Købsomkostninger", `${P}*${ACQ}/100`, "kr"], // B4
    ["Investeret kapital", `B3+B4`, "kr"], // B5
    ["Lån", `${P}-B3`, "kr"], // B6
    ["Månedlig ydelse", `PMT(${RATE}/100/12,${TERM}*12,-B6)`, "kr"], // B7
    ["Årlig ydelse", `B7*12`, "kr"], // B8
    ["Vedligehold (år)", `B2*${MNT}/100`, "kr"], // B9
    ["Faste driftsudgifter (år)", `${FIX}*12`, "kr"], // B10
    ["Tomgangstab (år)", `B2*${VAC}/100`, "kr"], // B11
    ["NOI (driftsresultat)", `B2-B11-B9-B10`, "kr"], // B12
    ["Årligt cash flow", `B12-B8`, "kr"], // B13
    ["Cash flow pr. md.", `B13/12`, "kr"], // B14
    ["Bruttoafkast", `B2/${P}`, "pct"], // B15
    ["Nettoafkast (cap rate)", `B12/${P}`, "pct"], // B16
    ["Kontantafkast (cash-on-cash)", `B13/B5`, "pct"], // B17
    ["Belåningsgrad (LTV)", `B6/${P}`, "pct"], // B18
    ["DSCR (gældsdækning)", `B12/B8`, "num"], // B19
    ["Break-even belægning", `(B8+B9+B10)/B2`, "pct"], // B20
  ];
  rows.forEach(([label, formula, kind], i) => {
    const r = 2 + i;
    s.getCell(`A${r}`).value = label;
    const c = s.getCell(`B${r}`);
    c.value = { formula };
    c.numFmt = kind === "kr" ? "#,##0 \"kr\"" : kind === "pct" ? "0.00%" : "0.00";
    if (["Årligt cash flow", "Cash flow pr. md.", "NOI (driftsresultat)", "Nettoafkast (cap rate)", "Kontantafkast (cash-on-cash)"].includes(label)) {
      s.getCell(`A${r}`).font = { bold: true };
      c.font = { bold: true };
    }
  });

  /* ---------- 10-års prognose (formulas) ---------- */
  const p = wb.addWorksheet("Prognose", { views: [{ showGridLines: false }] });
  p.columns = [
    { width: 8 }, { width: 16 }, { width: 16 }, { width: 16 }, { width: 16 },
    { width: 18 }, { width: 16 }, { width: 18 }, { width: 16 },
  ];
  title(p, "Cash flow- og friværdiprognose");
  const heads = ["År", "Leje (år)", "NOI", "Ydelse", "Cash flow", "Kumuleret", "Restgæld", "Ejendomsværdi", "Friværdi"];
  heads.forEach((h, i) => {
    const c = p.getRow(2).getCell(i + 1);
    c.value = h;
    c.font = { bold: true, color: { argb: "FFFFFFFF" } };
    c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: NAVY } };
    c.alignment = { horizontal: "center" };
  });
  for (let y = 1; y <= hold; y++) {
    const r = 2 + y;
    p.getCell(`A${r}`).value = y;
    p.getCell(`B${r}`).value = { formula: `Analyse!B2*(1+${RG}/100)^(A${r}-1)` };
    p.getCell(`C${r}`).value = { formula: `B${r}-B${r}*${VAC}/100-B${r}*${MNT}/100-Analyse!B10*(1.02)^(A${r}-1)` };
    p.getCell(`D${r}`).value = { formula: `Analyse!B8` };
    p.getCell(`E${r}`).value = { formula: `C${r}-D${r}` };
    p.getCell(`F${r}`).value = { formula: y === 1 ? `E${r}` : `F${r - 1}+E${r}` };
    // remaining balance (annuity)
    p.getCell(`G${r}`).value = {
      formula: `Analyse!B6*((1+${RATE}/100/12)^(${TERM}*12)-(1+${RATE}/100/12)^(A${r}*12))/((1+${RATE}/100/12)^(${TERM}*12)-1)`,
    };
    p.getCell(`H${r}`).value = { formula: `${P}*(1+${APPR}/100)^A${r}` };
    p.getCell(`I${r}`).value = { formula: `H${r}-G${r}` };
    for (const col of ["B", "C", "D", "E", "F", "G", "H", "I"]) p.getCell(`${col}${r}`).numFmt = "#,##0";
  }
  // total-return summary under the table
  const tr = 3 + hold + 1;
  p.getCell(`A${tr}`).value = "Samlet afkast ved salg efter ejerperioden";
  p.getCell(`A${tr}`).font = { bold: true, color: { argb: BLUE } };
  p.getCell(`A${tr + 1}`).value = "Nettoprovenu ved salg (÷ salgsomk. 1,5 %)";
  p.getCell(`B${tr + 1}`).value = { formula: `H${2 + hold}*0.985-G${2 + hold}` };
  p.getCell(`A${tr + 2}`).value = "Samlet gevinst (cash flow + salg − investeret)";
  p.getCell(`B${tr + 2}`).value = { formula: `F${2 + hold}+B${tr + 1}-Analyse!B5` };
  p.getCell(`A${tr + 3}`).value = "Equity multiple";
  p.getCell(`B${tr + 3}`).value = { formula: `(F${2 + hold}+B${tr + 1})/Analyse!B5` };
  for (const rr of [tr + 1, tr + 2]) p.getCell(`B${rr}`).numFmt = "#,##0 \"kr\"";
  p.getCell(`B${tr + 3}`).numFmt = "0.00\"x\"";
  for (const rr of [tr + 1, tr + 2, tr + 3]) p.getCell(`A${rr}`).font = { bold: true };

  const buf = await wb.xlsx.writeBuffer();
  const fname = `NordInvest-analyse-${new Date().toISOString().slice(0, 10)}.xlsx`;
  return new Response(buf, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${fname}"`,
    },
  });
}

function title(ws: ExcelJS.Worksheet, text: string) {
  const c = ws.getCell("A1");
  c.value = text;
  c.font = { bold: true, size: 14, color: { argb: NAVY } };
  ws.getRow(1).height = 22;
}
function allBorder(): Partial<ExcelJS.Borders> {
  const st = { style: "thin" as const, color: { argb: "FFCBD5E1" } };
  return { top: st, left: st, bottom: st, right: st };
}
