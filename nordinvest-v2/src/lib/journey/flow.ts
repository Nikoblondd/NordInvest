import { DEFAULT_ANSWERS, type FlipAnswers } from "@/lib/flip/model";
import { rentPerM2 } from "@/lib/rent-estimate";

/*
 * The question flow behind every analysis. Each answer decides the next
 * question, and every question changes a number in the result; nothing is
 * asked for show. questionsFor() rebuilds the path from the answers so far,
 * so going back, changing an answer and the progress bar always agree.
 */

export type Goal = "cashflow" | "parents" | "flip" | "live_flip";
export type Answers = Record<string, string>;
export type Ctx = { area: number | null; rent: number | null; address: string | null; zip: string | null };

export type Option = { value: string; label: string; sub?: string };
export type Question =
  | { key: string; kind: "choice"; title: string; hint?: string; options: Option[] }
  | { key: string; kind: "number"; title: string; hint?: string; unit: string; suggest?: number | null; min: number; max: number };

// The listing's own rent if it states one; otherwise the same per-postnummer
// rent rate the Deal-motor uses, times the area.
const marketRent = (ctx: Ctx) =>
  ctx.rent ? ctx.rent : ctx.area ? Math.round((ctx.area * (ctx.zip ? rentPerM2(Number(ctx.zip)) : 110)) / 100) * 100 : null;

/** The goal after any switch: a rental that needs too much work can become a flip. */
export function goalOf(a: Answers): Goal | null {
  if (a.goal === "cashflow" && a.condition === "needs" && a.reno === "sell") return "flip";
  return (a.goal as Goal) ?? null;
}

export function questionsFor(a: Answers, ctx: Ctx): Question[] {
  const q: Question[] = [];
  if (!a.goal) return q;
  const rental = a.goal === "cashflow" || a.goal === "parents";

  if (rental) {
    if (a.goal === "parents") {
      q.push({ key: "rent", kind: "number", title: "Hvad skal dit barn betale i husleje om måneden?", hint: "Lejen skal svare til markedslejen, ellers kan Skattestyrelsen beskatte forskellen. Vi har sat markedslejen ind som udgangspunkt.", unit: "kr./md.", suggest: marketRent(ctx), min: 500, max: 60000 });
    } else {
      q.push({ key: "rentKnown", kind: "choice", title: "Ved du, hvad boligen kan lejes ud for?", options: [
        { value: "no", label: "Nej, brug markedslejen", sub: marketRent(ctx) ? `Vores skøn: ${marketRent(ctx)!.toLocaleString("da-DK")} kr./md.` : "Vi regner den ud fra området" },
        { value: "yes", label: "Ja, jeg kender lejen", sub: "Fx fra en lejer eller en udlejningsmægler" } ] });
      if (a.rentKnown === "yes") q.push({ key: "rent", kind: "number", title: "Hvad er den forventede leje?", unit: "kr./md.", suggest: marketRent(ctx), min: 500, max: 60000 });
    }
  }

  // Shared: how the purchase is paid.
  q.push({ key: "finance", kind: "choice", title: "Hvordan betaler du købet?", hint: "Udbetalingen afgør lånet, renterne og dit afkast.", options: [
    { value: "loan20", label: "Lån med 20 % udbetaling", sub: "Realkredit og banklån" },
    { value: "loan40", label: "Lån med 40 % udbetaling" },
    { value: "cash", label: "Kontant", sub: "Ingen renter, men mere kapital bundet" } ] });

  if (rental) {
    if (a.finance && a.finance !== "cash") q.push({ key: "rate", kind: "choice", title: "Hvilken rente skal vi regne med?", hint: "Hele lånet, realkredit og bank samlet.", options: [
      { value: "4", label: "4 %" }, { value: "5", label: "5 %", sub: "Vores standard" }, { value: "6", label: "6 %", sub: "Forsigtigt, med buffer til rentestigning" } ] });
    if (a.goal === "cashflow") q.push({ key: "mgmt", kind: "choice", title: "Hvem står for udlejningen?", options: [
      { value: "self", label: "Mig selv", sub: "Annoncering, kontrakt, depositum og vedligehold" },
      { value: "admin", label: "En administrator", sub: "Koster typisk 5 til 8 % af lejen" } ] });
    q.push({ key: "condition", kind: "choice", title: "Hvilken stand er boligen i?", options: [
      { value: "ready", label: "Indflytningsklar", sub: "Kan lejes ud med det samme" },
      { value: "normal", label: "Almindelig stand", sub: "Lidt maling og småting" },
      { value: "needs", label: "Trænger til renovering", sub: "Køkken, bad eller mere" } ] });
    if (a.condition === "needs" && a.goal === "cashflow") q.push({ key: "reno", kind: "choice", title: "Hvad vil du gøre med den?", hint: "Skal den sælges efter renoveringen, skifter vi til flip-analysen.", options: [
      { value: "rent", label: "Renovere og leje ud", sub: "Vi regner med højere vedligehold de første år" },
      { value: "sell", label: "Renovere og sælge", sub: "Skift til flip" } ] });
    if (goalOf(a) !== "flip") {
      q.push({ key: "hold", kind: "choice", title: "Hvor længe vil du eje den?", hint: "Bruges til fremskrivningen af værdi, gæld og samlet afkast.", options: [
        { value: "5", label: "5 år" }, { value: "10", label: "10 år" }, { value: "20", label: "20 år eller mere" } ] });
      if (a.goal === "cashflow") q.push({ key: "priority", kind: "choice", title: "Hvad er vigtigst for dig?", hint: "Det ændrer, hvordan vi vægter scoren.", options: [
        { value: "cashflow", label: "Overskud hver måned", sub: "Lejen skal betale det hele" },
        { value: "appreciation", label: "Værdistigning over tid", sub: "Et lille underskud er OK" } ] });
      return q;
    }
  }

  // Flip and bo og flip.
  const g = goalOf(a);
  q.push({ key: "type", kind: "choice", title: "Hvilken type bolig er det?", options: [
    { value: "villa", label: "Villa" }, { value: "terraced", label: "Rækkehus" }, { value: "condo", label: "Ejerlejlighed" } ] });
  q.push({ key: "role", kind: "choice", title: "Hvem er du?", hint: "Det ændrer, hvad håndværk og materialer koster dig.", options: [
    { value: "private", label: "Privat investor", sub: "Håndværkere udfører arbejdet" },
    { value: "tradesman", label: "Håndværker", sub: "Fagrabat på materialer" },
    { value: "contractor", label: "Entreprenør eller byggefirma", sub: "Eget sjak, køber el og VVS" },
    { value: "pro_investor", label: "Professionel investor", sub: "Flere projekter om året" } ] });
  if (a.role && a.role !== "contractor") q.push({ key: "diy", kind: "choice", title: "Hvor meget laver du selv?", options: [
    { value: "none", label: "Intet", sub: "Alt går til håndværkere" },
    { value: "paint_floors", label: "Maling og gulve" },
    { value: "most", label: "Det meste", sub: "Ikke el og VVS, det kræver autorisation" },
    { value: "all", label: "Alt", sub: "Også el og VVS med autorisation" } ] });
  q.push({ key: "level", kind: "choice", title: "Hvor meget regner du med, den skal have?", hint: "AI'en ser billederne igennem bagefter og retter planen element for element.", options: [
    { value: "cosmetic", label: "En opfriskning", sub: "Maling, gulve og lister" },
    { value: "medium", label: "Køkken og bad", sub: "Plus døre, el-udtag og lamper" },
    { value: "total", label: "Totalrenovering", sub: "Plus el, varme, vand og vinduer" } ] });
  q.push({ key: "months", kind: "choice", title: g === "live_flip" ? "Hvor længe bor du der, før du sælger?" : "Hvor længe ejer du den, fra køb til salg?", hint: "Hver måned koster renter, ejerudgift og forbrug.", options: [
    { value: "3", label: "3 måneder" }, { value: "6", label: "6 måneder" }, { value: "12", label: "1 år" }, { value: "24", label: "2 år" } ] });
  if (g === "live_flip") q.push({ key: "lot", kind: "choice", title: "Er grunden under 1.400 m²?", hint: "Parcelhusreglen gør gevinsten skattefri, men som udgangspunkt kun når grunden er under 1.400 m².", options: [
    { value: "small", label: "Ja, under 1.400 m²" }, { value: "big", label: "Nej, større" }, { value: "small_unknown", label: "Ved ikke", sub: "Vi regner skattefrit, men tjek det" } ] });
  if (g === "flip") q.push({ key: "sales", kind: "choice", title: "Hvor mange boliger har du solgt de sidste 5 år?", hint: "Sælger du mange, kan Skattestyrelsen se dig som næringsdrivende, og så beskattes gevinsten hårdere.", options: [
    { value: "0", label: "Ingen" }, { value: "1-2", label: "1 til 2" }, { value: "3+", label: "3 eller flere" } ] });
  q.push({ key: "target", kind: "choice", title: "Hvor stor fortjeneste kræver du?", hint: "Vi regner dit maksimale bud ud fra den.", options: [
    { value: "10", label: "10 %", sub: "af salgsprisen" }, { value: "15", label: "15 %", sub: "Typisk for flip" }, { value: "20", label: "20 %", sub: "Forsigtigt" } ] });
  return q;
}

/** The cash-flow analysis: query parameters plus the journey's input overrides. */
export function rentalParams(a: Answers) {
  const down = a.finance === "cash" ? 100 : a.finance === "loan40" ? 40 : 20;
  const j: Record<string, number | string> = {
    downPaymentPct: down,
    interestRate: a.finance === "cash" ? 5 : Number(a.rate) || 5,
    holdYears: Number(a.hold) || 10,
    strategy: a.priority === "appreciation" ? "appreciation" : "cashflow",
    maintenancePct: a.condition === "ready" ? 6 : a.condition === "needs" ? 14 : 8,
    vacancyPct: a.goal === "parents" ? 0 : 4,
  };
  if (a.rent) j.monthlyRent = Number(a.rent);
  if (a.mgmt === "admin") j.adminPct = 6;
  return { down, j };
}

export function flipAnswers(a: Answers): FlipAnswers & { type: string } {
  const g = goalOf(a);
  return {
    ...DEFAULT_ANSWERS,
    strategy: g === "live_flip" ? "live_flip" : "flip",
    role: (a.role as FlipAnswers["role"]) ?? "private",
    diy: a.role === "contractor" ? "most" : ((a.diy as FlipAnswers["diy"]) ?? "none"),
    level: (a.level as FlipAnswers["level"]) ?? "medium",
    months: Number(a.months) || 6,
    finance: a.finance === "cash" ? "cash" : "loan",
    downPct: a.finance === "loan40" ? 40 : 20,
    rate: Number(a.rate) || DEFAULT_ANSWERS.rate,
    sales: (a.sales as FlipAnswers["sales"]) ?? "0",
    target: Number(a.target) || 15,
    bigLot: a.lot === "big",
    type: a.type ?? "villa",
  };
}
