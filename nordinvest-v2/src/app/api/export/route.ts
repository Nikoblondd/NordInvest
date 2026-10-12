import { NextRequest } from "next/server";
import ExcelJS from "exceljs";
import { createClient } from "@/lib/supabase/server";
import { effectiveLimit } from "@/lib/access";
import { limits } from "@/lib/pricing";
import { gateApi } from "@/lib/gate";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Body = {
  address?: string;
  area?: number | null;
  units?: number | null;
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
const YELLOW = "FFFEF9C3";
const GREY = "FFF1F5F9";

// ── number formats ────────────────────────────────────────────────────────────
const KR = '#,##0" kr"';
const KR0 = "#,##0";
const PCT_IN = '0.0"%"'; // an INPUT percent stored as a whole number (4 → 4,0 %)
const PCT_R = "0.00%"; // a COMPUTED ratio stored as a fraction (0,05 → 5,00 %)
const NUMX = '0.00"x"';
const NUM2 = "0.00";
const INT = "0";

/**
 * Builds a full, editable investment model. Every result is a live Excel formula,
 * so the user can change any yellow input on "Antagelser" and the whole model —
 * financing, drift, key ratios, the 10-year projection and the sensitivity grids —
 * recalculates. Seeded with the real numbers from the analysis.
 */
// The Excel model is a paid feature (Starter and up, or an admin account).
async function paid(): Promise<boolean> {
  const supabase = createClient();
  if (!supabase) return false;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;
  const { data: profile } = await supabase.from("profiles").select("subscription_tier").eq("id", user.id).single();
  return effectiveLimit(profile?.subscription_tier, user.email) > limits.free;
}

export async function POST(req: NextRequest) {
  const denied = await gateApi(req);
  if (denied) return denied;
  if (!(await paid())) return Response.json({ error: "paid_feature" }, { status: 402 });
  const b = (await req.json()) as Body;
  const hold = Math.min(Math.max(Math.round(b.holdYears) || 10, 1), 40);
  const area = Number.isFinite(Number(b.area)) && Number(b.area) > 0 ? Math.round(Number(b.area)) : 0;
  const units = Number.isFinite(Number(b.units)) && Number(b.units)! > 0 ? Math.round(Number(b.units)) : 1;
  const rkSharePct = Math.max(0, Math.min(80, 100 - b.downPaymentPct)); // realkredit up to 80 % LTV
  const bankRateSeed = Math.round((b.interestRate + 2) * 10) / 10;

  const wb = new ExcelJS.Workbook();
  wb.creator = "NordInvest";
  wb.created = new Date();

  // A tiny per-sheet builder that tracks the current row and records cell refs so
  // other sheets can reference inputs/results by name (fully-qualified & quoted).
  type B = {
    ws: ExcelJS.Worksheet;
    refs: Record<string, string>;
    title: (t: string, sub?: string) => void;
    sec: (t: string) => void;
    inp: (key: string, label: string, value: number, fmt: string, note?: string) => void;
    comp: (key: string, label: string, formula: string, fmt: string, opts?: { strong?: boolean; tone?: "pos" | "neg" | "blue" }) => void;
    spacer: () => void;
    row: () => number;
  };
  const make = (ws: ExcelJS.Worksheet, sheet: string): B => {
    let r = 0;
    const refs: Record<string, string> = {};
    const q = (cell: string) => `'${sheet}'!${cell}`;
    return {
      ws,
      refs,
      row: () => r,
      title(t, sub) {
        r += 1;
        const c = ws.getCell(`A${r}`);
        c.value = t;
        c.font = { bold: true, size: 15, color: { argb: NAVY } };
        ws.getRow(r).height = 24;
        if (sub) {
          r += 1;
          const s = ws.getCell(`A${r}`);
          s.value = sub;
          s.font = { italic: true, size: 10, color: { argb: "FF64748B" } };
        }
        r += 1; // blank line
      },
      sec(t) {
        r += 1;
        for (const col of ["A", "B", "C"]) {
          const c = ws.getCell(`${col}${r}`);
          c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: NAVY } };
        }
        const c = ws.getCell(`A${r}`);
        c.value = t;
        c.font = { bold: true, size: 10.5, color: { argb: "FFFFFFFF" } };
        ws.getRow(r).height = 18;
      },
      inp(key, label, value, fmt, note) {
        r += 1;
        ws.getCell(`A${r}`).value = label;
        const c = ws.getCell(`B${r}`);
        c.value = value;
        c.numFmt = fmt;
        c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: YELLOW } };
        c.border = border();
        c.font = { bold: true };
        if (note) {
          const n = ws.getCell(`C${r}`);
          n.value = note;
          n.font = { italic: true, size: 9, color: { argb: "FF94A3B8" } };
        }
        refs[key] = q(`B${r}`);
      },
      comp(key, label, formula, fmt, opts) {
        r += 1;
        const a = ws.getCell(`A${r}`);
        a.value = label;
        const c = ws.getCell(`B${r}`);
        c.value = { formula };
        c.numFmt = fmt;
        if (opts?.strong) {
          a.font = { bold: true, color: { argb: NAVY } };
          c.font = { bold: true };
        }
        if (opts?.tone === "blue") c.font = { bold: true, color: { argb: BLUE } };
        if (opts?.tone === "pos") c.font = { bold: true, color: { argb: "FF059669" } };
        if (opts?.tone === "neg") c.font = { bold: true, color: { argb: "FFE11D48" } };
        refs[key] = q(`B${r}`);
      },
      spacer() {
        r += 1;
      },
    };
  };

  /* ═══════════════ 1) ANTAGELSER (editable inputs) ═══════════════ */
  const A = make(wb.addWorksheet("Antagelser", { views: [{ showGridLines: false }] }), "Antagelser");
  A.ws.columns = [{ width: 38 }, { width: 18 }, { width: 46 }];
  A.title("Antagelser", "Ret de gule celler — hele modellen regner sig selv. " + (b.address || "Ejendomsanalyse"));

  A.sec("EJENDOM");
  A.inp("price", "Købspris (kr)", b.price, KR0);
  A.inp("area", "Størrelse (m²)", area, INT, area ? undefined : "Ukendt — udfyld for korrekt leje/m² og vedligehold");
  A.inp("units", "Antal lejemål", units, INT);
  A.inp("rentMd", "Månedlig leje i alt (kr)", b.monthlyRent, KR0);

  A.sec("FINANSIERING");
  A.inp("dpPct", "Egenfinansiering / udbetaling (%)", b.downPaymentPct, PCT_IN);
  A.inp("rkPct", "Realkredit — andel af købspris (%)", rkSharePct, PCT_IN, "Typisk maks. 80 %");
  A.inp("rkRate", "Realkredit — rente (% p.a.)", b.interestRate, PCT_IN);
  A.inp("rkBidrag", "Realkredit — bidragssats (% p.a.)", 0.8, PCT_IN);
  A.inp("rkTerm", "Realkredit — løbetid (år)", b.termYears, INT);
  A.inp("bankRate", "Bank — rente (% p.a.)", bankRateSeed, PCT_IN, "Bruges kun hvis udbetaling < 20 %");
  A.inp("bankTerm", "Bank — løbetid (år)", 20, INT);
  A.inp("sellerKr", "Sælgerfinansiering (kr)", 0, KR0);
  A.inp("sellerRate", "Sælger — rente (% p.a.)", 2, PCT_IN);
  A.inp("sellerTerm", "Sælger — løbetid (år)", 10, INT);

  A.sec("DRIFT (år 1)");
  A.inp("vacancy", "Tomgang (%)", b.vacancyPct, PCT_IN);
  A.inp("maintM2", "Vedligehold (kr/m²/år)", 75, KR0, area ? undefined : "Ganges med m² — udfyld areal ovenfor");
  A.inp("tax", "Grundskyld / ejendomsskat (kr/år)", 0, KR0);
  A.inp("renovation", "Renovation (kr/år)", 0, KR0);
  A.inp("insurance", "Forsikring (kr/år)", 0, KR0);
  A.inp("admin", "Administration (kr/år)", 0, KR0);
  A.inp("caretaker", "Vicevært (kr/år)", 0, KR0);
  A.inp("utilities", "Vand / varme (ejer) (kr/år)", 0, KR0);
  A.inp("otherFixed", "Øvrige faste udgifter / ejerudgift (kr/år)", Math.round((b.monthlyOpex || 0) * 12), KR0, "Sat fra annoncens ejerudgift");

  A.sec("KØBS- & FINANSIERINGSOMKOSTNINGER");
  A.inp("stiftPct", "Stiftelsesprovision realkredit (% af lån)", 1.0, PCT_IN);
  A.inp("loanFee", "Lånesagsgebyr (kr)", 0, KR0);
  A.inp("lawyer", "Advokat / rådgiver (kr)", 0, KR0);
  A.inp("otherAcq", "Øvrige købsomkostninger (kr)", 0, KR0, "Tinglysning beregnes automatisk (statslige satser)");

  A.sec("SKAT, AFKASTKRAV & PROGNOSE");
  A.inp("taxPct", "Skat af resultat (%)", 22, PCT_IN, "Selskabsskat 22 % — sæt 0 for personlig fri leje");
  A.inp("yieldReq", "Afkastkrav (%)", 5.0, PCT_IN, "Bruges til at værdiansætte ejendommen (NOI ÷ afkastkrav)");
  A.inp("appr", "Værdistigning (%/år)", b.appreciationPct, PCT_IN);
  A.inp("rentGrowth", "Lejevækst (%/år)", b.rentGrowthPct, PCT_IN);
  A.inp("hold", "Ejerperiode (år)", hold, INT);

  const R = A.refs; // shorthand for referencing Antagelser cells

  /* ═══════════════ 2) FINANSIERING ═══════════════ */
  const F = make(wb.addWorksheet("Finansiering", { views: [{ showGridLines: false }] }), "Finansiering");
  F.ws.columns = [{ width: 40 }, { width: 20 }, { width: 40 }];
  F.title("Finansiering", "Finansieringsbehov, -plan og de samlede købsomkostninger.");

  F.sec("FINANSIERINGSPLAN");
  F.comp("downPay", "Udbetaling / egenfinansiering", `${R.price}*${R.dpPct}/100`, KR);
  F.comp("rkLoan", "Realkreditlån", `${R.price}*${R.rkPct}/100`, KR);
  F.comp("sellerLoan", "Sælgerfinansiering", `${R.sellerKr}`, KR);
  F.comp("bankLoan", "Bankfinansiering (rest)", `MAX(0,${R.price}-${F.refs.downPay}-${F.refs.rkLoan}-${F.refs.sellerLoan})`, KR);
  F.comp("totalDebt", "Samlet lån", `${F.refs.rkLoan}+${F.refs.bankLoan}+${F.refs.sellerLoan}`, KR, { strong: true });
  F.comp("checkSum", "Kontrol: udbetaling + lån", `${F.refs.downPay}+${F.refs.totalDebt}`, KR, { tone: "blue" });

  F.spacer();
  F.sec("KØBS- & FINANSIERINGSOMKOSTNINGER");
  F.comp("tinglSkode", "Tinglysning, skøde (0,6 % + 1.850 kr)", `${R.price}*0.006+1850`, KR);
  F.comp("tinglRk", "Tinglysning, realkreditpant (1,45 % + 1.825 kr)", `IF(${F.refs.rkLoan}>0,${F.refs.rkLoan}*0.0145+1825,0)`, KR);
  F.comp("tinglBank", "Tinglysning, bankpant (1,45 % + 1.825 kr)", `IF(${F.refs.bankLoan}>0,${F.refs.bankLoan}*0.0145+1825,0)`, KR);
  F.comp("stift", "Stiftelsesprovision realkredit", `${F.refs.rkLoan}*${R.stiftPct}/100`, KR);
  F.comp("loanFee", "Lånesagsgebyr", `${R.loanFee}`, KR);
  F.comp("lawyer", "Advokat / rådgiver", `${R.lawyer}`, KR);
  F.comp("otherAcq", "Øvrige købsomkostninger", `${R.otherAcq}`, KR);
  F.comp(
    "acqCosts",
    "Købsomkostninger i alt",
    `${F.refs.tinglSkode}+${F.refs.tinglRk}+${F.refs.tinglBank}+${F.refs.stift}+${F.refs.loanFee}+${F.refs.lawyer}+${F.refs.otherAcq}`,
    KR,
    { strong: true },
  );

  F.spacer();
  F.sec("KAPITALBEHOV");
  F.comp("acqTotal", "Anskaffelsessum (købspris + omkostninger)", `${R.price}+${F.refs.acqCosts}`, KR, { strong: true });
  F.comp("equityNeed", "Samlet egenbetaling (likviditetsbehov)", `${F.refs.downPay}+${F.refs.acqCosts}`, KR, { tone: "blue" });

  const FR = F.refs;

  /* ═══════════════ 3) DRIFT & LIKVIDITET ═══════════════ */
  const D = make(wb.addWorksheet("Drift & likviditet", { views: [{ showGridLines: false }] }), "Drift & likviditet");
  D.ws.columns = [{ width: 40 }, { width: 20 }, { width: 40 }];
  D.title("Drift & likviditet (år 1)", "Fra bruttoleje til likviditet efter skat og afdrag.");

  D.sec("DRIFTSBUDGET");
  D.comp("gross", "Bruttoleje (år)", `${R.rentMd}*12`, KR);
  D.comp("vacancy", "− Tomgang", `-${D.refs.gross}*${R.vacancy}/100`, KR);
  D.comp("maint", "− Vedligehold", `-${R.area}*${R.maintM2}`, KR);
  D.comp(
    "fixed",
    "− Faste driftsudgifter",
    `-(${R.tax}+${R.renovation}+${R.insurance}+${R.admin}+${R.caretaker}+${R.utilities}+${R.otherFixed})`,
    KR,
  );
  D.comp("opexTotal", "Driftsomkostninger i alt", `-(${D.refs.vacancy}+${D.refs.maint}+${D.refs.fixed})`, KR);
  D.comp("noi", "= Nettoleje / NOI", `${D.refs.gross}+${D.refs.vacancy}+${D.refs.maint}+${D.refs.fixed}`, KR, { strong: true });

  D.spacer();
  D.sec("FINANSIERINGSUDGIFTER (år 1)");
  D.comp("intRk", "− Rente + bidrag, realkredit", `-${FR.rkLoan}*(${R.rkRate}+${R.rkBidrag})/100`, KR);
  D.comp("intBank", "− Rente, bank", `-${FR.bankLoan}*${R.bankRate}/100`, KR);
  D.comp("intSeller", "− Rente, sælger", `-${FR.sellerLoan}*${R.sellerRate}/100`, KR);
  D.comp("pbt", "= Resultat før skat", `${D.refs.noi}+${D.refs.intRk}+${D.refs.intBank}+${D.refs.intSeller}`, KR, { strong: true });
  D.comp("tax", "− Skat af resultat", `-MAX(0,${D.refs.pbt})*${R.taxPct}/100`, KR);
  D.comp("pat", "= Resultat efter skat", `${D.refs.pbt}+${D.refs.tax}`, KR, { strong: true });

  D.spacer();
  D.sec("AFDRAG & LIKVIDITET");
  // annuity payment (positive) then split into principal (afdrag)
  D.comp("pmtRk", "Ydelse realkredit (år)", `PMT(${R.rkRate}/100/12,${R.rkTerm}*12,-${FR.rkLoan})*12`, KR);
  D.comp("pmtBank", "Ydelse bank (år)", `PMT(${R.bankRate}/100/12,${R.bankTerm}*12,-${FR.bankLoan})*12`, KR);
  D.comp("pmtSeller", "Ydelse sælger (år)", `PMT(${R.sellerRate}/100/12,${R.sellerTerm}*12,-${FR.sellerLoan})*12`, KR);
  D.comp("amortRk", "− Afdrag realkredit", `-(${D.refs.pmtRk}-${FR.rkLoan}*${R.rkRate}/100)`, KR);
  D.comp("amortBank", "− Afdrag bank", `-(${D.refs.pmtBank}-${FR.bankLoan}*${R.bankRate}/100)`, KR);
  D.comp("amortSeller", "− Afdrag sælger", `-(${D.refs.pmtSeller}-${FR.sellerLoan}*${R.sellerRate}/100)`, KR);
  D.comp("amortTotal", "Afdrag i alt", `-(${D.refs.amortRk}+${D.refs.amortBank}+${D.refs.amortSeller})`, KR);
  D.comp("cashflow", "= Cashflow efter skat og afdrag (år)", `${D.refs.pat}+${D.refs.amortRk}+${D.refs.amortBank}+${D.refs.amortSeller}`, KR, { strong: true });
  D.comp("cashflowMd", "Cashflow pr. måned", `${D.refs.cashflow}/12`, KR, { strong: true });

  D.spacer();
  D.sec("FORMUEOPBYGNING (år 1)");
  D.comp("appr", "Værdistigning (år)", `${R.price}*${R.appr}/100`, KR);
  D.comp("equityGain", "Egenkapitalsforøgelse (afdrag + værdistigning + likviditet)", `${D.refs.cashflow}-(${D.refs.amortRk}+${D.refs.amortBank}+${D.refs.amortSeller})+${D.refs.appr}`, KR, { tone: "blue" });
  D.comp("roi", "ROI (egenkapitalsforøgelse ÷ anskaffelsessum)", `${D.refs.equityGain}/${FR.acqTotal}`, PCT_R, { strong: true });
  D.comp("coc", "Cash-on-Cash (likviditet ÷ egenbetaling)", `${D.refs.cashflow}/${FR.equityNeed}`, PCT_R, { strong: true });
  D.comp("roic", "ROIC (egenkapitalsforøgelse ÷ egenbetaling)", `${D.refs.equityGain}/${FR.equityNeed}`, PCT_R, { strong: true });

  const DR = D.refs;

  /* ═══════════════ 4) NØGLETAL / RENTABILITET ═══════════════ */
  const N = make(wb.addWorksheet("Nøgletal", { views: [{ showGridLines: false }] }), "Nøgletal");
  N.ws.columns = [{ width: 40 }, { width: 20 }, { width: 40 }];
  N.title("Nøgletal & rentabilitet", "De tal en bank og en professionel investor kigger på først.");

  N.sec("AFKAST");
  N.comp("gross", "Bruttoafkast (bruttoleje ÷ pris)", `${DR.gross}/${R.price}`, PCT_R);
  N.comp("cap", "Nettoafkast / cap rate (NOI ÷ pris)", `${DR.noi}/${R.price}`, PCT_R, { strong: true });
  N.comp("capAcq", "Afkast på anskaffelsessum (NOI ÷ anskaffelse)", `${DR.noi}/${FR.acqTotal}`, PCT_R);
  N.comp("coc", "Kontantafkast / Cash-on-Cash", `${DR.coc}`, PCT_R, { strong: true });
  N.comp("roi", "ROI", `${DR.roi}`, PCT_R);
  N.comp("roic", "ROIC", `${DR.roic}`, PCT_R);

  N.spacer();
  N.sec("RISIKO & GEARING");
  N.comp("dscr", "DSCR (NOI ÷ samlet ydelse)", `${DR.noi}/(${DR.pmtRk}+${DR.pmtBank}+${DR.pmtSeller})`, NUM2, { strong: true });
  N.comp("ltv", "Belåningsgrad LTV (lån ÷ pris)", `${FR.totalDebt}/${R.price}`, PCT_R);
  N.comp("ltc", "Finansieringsgrad (lån ÷ anskaffelse)", `${FR.totalDebt}/${FR.acqTotal}`, PCT_R);
  N.comp(
    "breakEvenOcc",
    "Break-even belægning",
    `(${DR.pmtRk}+${DR.pmtBank}+${DR.pmtSeller}-${D.refs.maint}-${D.refs.fixed})/${DR.gross}`,
    PCT_R,
  );

  N.spacer();
  N.sec("VÆRDIANSÆTTELSE");
  N.comp("value", "Værdi v/ afkastkrav (NOI ÷ afkastkrav)", `${DR.noi}/(${R.yieldReq}/100)`, KR, { strong: true });
  N.comp("valueVsPrice", "Værdi vs. købspris", `${N.refs.value}/${R.price}-1`, PCT_R, { tone: "blue" });
  N.comp("rentM2", "Leje pr. m² (år)", `IF(${R.area}>0,${DR.gross}/${R.area},0)`, KR);
  N.comp("acqTotal", "Anskaffelsessum", `${FR.acqTotal}`, KR);
  N.comp("equityNeed", "Samlet egenbetaling", `${FR.equityNeed}`, KR);

  /* ═══════════════ 5) 10-ÅRS PROGNOSE ═══════════════ */
  const P = make(wb.addWorksheet("Prognose", { views: [{ showGridLines: false }] }), "Prognose");
  P.ws.columns = [
    { width: 6 }, { width: 15 }, { width: 15 }, { width: 15 }, { width: 15 },
    { width: 17 }, { width: 15 }, { width: 16 }, { width: 15 },
  ];
  P.title("Prognose over ejerperioden", "Leje og udgifter vokser; ydelsen er fast; friværdi bygges af afdrag og værdistigning.");
  const hr = P.row() + 1;
  const heads = ["År", "Leje", "NOI", "Ydelse i alt", "Cashflow", "Kumuleret", "Restgæld", "Ejendomsværdi", "Friværdi"];
  heads.forEach((h, i) => {
    const c = P.ws.getRow(hr).getCell(i + 1);
    c.value = h;
    c.font = { bold: true, color: { argb: "FFFFFFFF" } };
    c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: NAVY } };
    c.alignment = { horizontal: i === 0 ? "center" : "right" };
  });
  // total constant debt service, and a remaining-balance formula per tranche
  const YDELSE = `(${DR.pmtRk}+${DR.pmtBank}+${DR.pmtSeller})`;
  const bal = (loan: string, rate: string, term: string, yrCell: string) =>
    `IF(${loan}>0,${loan}*((1+${rate}/100/12)^(${term}*12)-(1+${rate}/100/12)^(${yrCell}*12))/((1+${rate}/100/12)^(${term}*12)-1),0)`;
  for (let y = 1; y <= hold; y++) {
    const r = hr + y;
    P.ws.getCell(`A${r}`).value = y;
    P.ws.getCell(`A${r}`).alignment = { horizontal: "center" };
    // leje grows with rentGrowth; NOI keeps opex ratio but fixed grows +2 %/år
    P.ws.getCell(`B${r}`).value = { formula: `${DR.gross}*(1+${R.rentGrowth}/100)^(A${r}-1)` };
    P.ws.getCell(`C${r}`).value = {
      formula: `B${r}-B${r}*${R.vacancy}/100-(${R.area}*${R.maintM2})*(1+${R.rentGrowth}/100)^(A${r}-1)-(${R.tax}+${R.renovation}+${R.insurance}+${R.admin}+${R.caretaker}+${R.utilities}+${R.otherFixed})*(1.02)^(A${r}-1)`,
    };
    P.ws.getCell(`D${r}`).value = { formula: YDELSE };
    P.ws.getCell(`E${r}`).value = { formula: `C${r}-D${r}` };
    P.ws.getCell(`F${r}`).value = { formula: y === 1 ? `E${r}` : `F${r - 1}+E${r}` };
    P.ws.getCell(`G${r}`).value = {
      formula: `${bal(FR.rkLoan, R.rkRate, R.rkTerm, `A${r}`)}+${bal(FR.bankLoan, R.bankRate, R.bankTerm, `A${r}`)}+${bal(FR.sellerLoan, R.sellerRate, R.sellerTerm, `A${r}`)}`,
    };
    P.ws.getCell(`H${r}`).value = { formula: `${R.price}*(1+${R.appr}/100)^A${r}` };
    P.ws.getCell(`I${r}`).value = { formula: `H${r}-G${r}` };
    for (const col of ["B", "C", "D", "E", "F", "G", "H", "I"]) P.ws.getCell(`${col}${r}`).numFmt = KR0;
    if (y % 2 === 0) for (const col of ["A", "B", "C", "D", "E", "F", "G", "H", "I"]) P.ws.getCell(`${col}${r}`).fill = { type: "pattern", pattern: "solid", fgColor: { argb: GREY } };
  }
  const last = hr + hold;
  const tr = last + 2;
  P.ws.getCell(`A${tr}`).value = "Ved salg efter ejerperioden";
  P.ws.getCell(`A${tr}`).font = { bold: true, color: { argb: BLUE } };
  const trRows: [string, string, string][] = [
    ["Nettoprovenu ved salg (÷ mægler 1,5 %, mindst 35.000 kr., + 35.000 kr. rapporter og øvrigt)", `H${last}-MAX(35000,H${last}*1.5%)-35000-G${last}`, KR],
    ["Kumuleret cashflow i perioden", `F${last}`, KR],
    ["Samlet gevinst (cashflow + salg − egenbetaling)", `F${last}+(H${last}-MAX(35000,H${last}*1.5%)-35000-G${last})-${FR.equityNeed}`, KR],
    ["Equity multiple", `(F${last}+(H${last}-MAX(35000,H${last}*1.5%)-35000-G${last}))/${FR.equityNeed}`, NUMX],
  ];
  trRows.forEach(([label, formula, fmt], i) => {
    const r = tr + 1 + i;
    P.ws.getCell(`A${r}`).value = label;
    P.ws.getCell(`A${r}`).font = { bold: true };
    const c = P.ws.getCell(`B${r}`);
    c.value = { formula };
    c.numFmt = fmt;
    c.font = { bold: true };
  });

  /* ═══════════════ 6) FØLSOMHED ═══════════════ */
  const S = make(wb.addWorksheet("Følsomhed", { views: [{ showGridLines: false }] }), "Følsomhed");
  S.ws.columns = [{ width: 26 }, { width: 18 }, { width: 18 }, { width: 18 }, { width: 18 }, { width: 18 }];
  S.title("Følsomhed", "Hvor robust er handlen, hvis renten stiger eller tomgangen vokser?");

  // Rate sensitivity: realkredit rate shifted; recompute year-1 cashflow (pre-tax, after debt service)
  let rr = S.row() + 1;
  S.ws.getCell(`A${rr}`).value = "Cashflow pr. md. ved ændret realkreditrente";
  S.ws.getCell(`A${rr}`).font = { bold: true, color: { argb: NAVY } };
  rr += 1;
  const rateHdr = rr;
  ["Realkreditrente", "−1 pp", "Aktuel", "+1 pp", "+2 pp", "+3 pp"].forEach((h, i) => {
    const c = S.ws.getRow(rateHdr).getCell(i + 1);
    c.value = h;
    c.font = { bold: true, color: { argb: "FFFFFFFF" } };
    c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: NAVY } };
    c.alignment = { horizontal: i === 0 ? "left" : "right" };
  });
  const deltas = [-1, 0, 1, 2, 3];
  const cfAtRate = (d: number) => {
    // NOI − new total debt service (RK ydelse recomputed at shifted rate), per month
    const rkPmt = `PMT((${R.rkRate}+${d})/100/12,${R.rkTerm}*12,-${FR.rkLoan})*12`;
    return `(${DR.noi}-(${rkPmt}+${DR.pmtBank}+${DR.pmtSeller}))/12`;
  };
  const rateRow = rateHdr + 1;
  S.ws.getCell(`A${rateRow}`).value = "Cashflow / md.";
  deltas.forEach((d, i) => {
    const c = S.ws.getRow(rateRow).getCell(i + 2);
    c.value = { formula: cfAtRate(d) };
    c.numFmt = KR;
    if (d === 0) c.font = { bold: true };
  });
  // break-even rate line
  const beRow = rateRow + 2;
  S.ws.getCell(`A${beRow}`).value = "Break-even realkreditrente (cashflow = 0)";
  S.ws.getCell(`A${beRow}`).font = { bold: true };
  S.ws.getCell(`B${beRow}`).value = {
    // NOI = PMT(rate) → solve approx via RATE on the RK loan given NOI available for RK service after other tranches
    formula: `RATE(${R.rkTerm}*12,-(${DR.noi}-${DR.pmtBank}-${DR.pmtSeller})/12,${FR.rkLoan})*12`,
  };
  S.ws.getCell(`B${beRow}`).numFmt = PCT_R;
  S.ws.getCell(`B${beRow}`).font = { bold: true, color: { argb: BLUE } };

  // Vacancy sensitivity
  let vr = beRow + 3;
  S.ws.getCell(`A${vr}`).value = "Cashflow pr. md. ved ændret tomgang";
  S.ws.getCell(`A${vr}`).font = { bold: true, color: { argb: NAVY } };
  vr += 1;
  const vHdr = vr;
  ["Tomgang", "0 %", "5 %", "10 %", "15 %", "20 %"].forEach((h, i) => {
    const c = S.ws.getRow(vHdr).getCell(i + 1);
    c.value = h;
    c.font = { bold: true, color: { argb: "FFFFFFFF" } };
    c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: NAVY } };
    c.alignment = { horizontal: i === 0 ? "left" : "right" };
  });
  const vac = [0, 5, 10, 15, 20];
  const cfAtVac = (v: number) =>
    `((${DR.gross}-${DR.gross}*${v}/100-(${R.area}*${R.maintM2})-(${R.tax}+${R.renovation}+${R.insurance}+${R.admin}+${R.caretaker}+${R.utilities}+${R.otherFixed}))-(${DR.pmtRk}+${DR.pmtBank}+${DR.pmtSeller}))/12`;
  const vRow = vHdr + 1;
  S.ws.getCell(`A${vRow}`).value = "Cashflow / md.";
  vac.forEach((v, i) => {
    const c = S.ws.getRow(vRow).getCell(i + 2);
    c.value = { formula: cfAtVac(v) };
    c.numFmt = KR;
  });

  // ── disclaimer footer on Antagelser ──
  const dr = A.row() + 2;
  A.ws.getCell(`A${dr}`).value = "Beslutningsstøtte — ikke finansiel, juridisk eller skattemæssig rådgivning. Verificér altid tallene mod egne kilder.";
  A.ws.getCell(`A${dr}`).font = { italic: true, size: 9, color: { argb: "FF94A3B8" } };

  // ── data sources footer (CC BY 4.0 kræver kildeangivelse på outputs) ──
  const sr = dr + 2;
  A.ws.getCell(`A${sr}`).value = "Kilder: Bygningsdata fra Bygnings- og Boligregistret (BBR) via Datafordeler — CC BY 4.0 (https://creativecommons.org/licenses/by/4.0/deed.da). Prisudvikling: Danmarks Statistik EJ55. Markedspris pr. m²: NordInvests egen indsamling af udbudte annoncer.";
  A.ws.getCell(`A${sr}`).font = { italic: true, size: 9, color: { argb: "FF64748B" } };
  A.ws.getCell(`A${sr}`).alignment = { wrapText: true };

  const buf = await wb.xlsx.writeBuffer();
  const fname = `NordInvest-analyse-${new Date().toISOString().slice(0, 10)}.xlsx`;
  return new Response(buf, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${fname}"`,
    },
  });
}

function border(): Partial<ExcelJS.Borders> {
  const st = { style: "thin" as const, color: { argb: "FFCBD5E1" } };
  return { top: st, left: st, bottom: st, right: st };
}
