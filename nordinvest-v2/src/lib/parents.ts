import type { AnalysisInput, AnalysisResult } from "@/lib/analysis";
import { gainTax } from "@/lib/dk-fees";

/*
 * Forældrekøb, seen from the family. The child pays the same rent either way;
 * the question is whether the family is better off owning the home than
 * paying that rent to a landlord. Owning: the overskud (often negative) over
 * the years plus what is left after the sale and the tax on the gain, minus
 * the cash put in. Renting: the rent leaves the family.
 */
export function parentsView(inputs: Pick<AnalysisInput, "price" | "monthlyRent">, r: AnalysisResult) {
  const years = r.holdYears;
  const acq = r.cashInvested - r.downPayment;
  const sellCosts = r.saleValue * (r.saleCostsPct / 100);
  const { tax } = gainTax(r.saleValue, sellCosts, inputs.price, acq, 0, years);
  const afterTax = r.totalProfit - tax; // the family's result from owning
  const familyRent = inputs.monthlyRent * 12 * years; // what renting would cost the family
  const vsRenting = afterTax + familyRent; // owning minus renting
  return { years, tax, afterTax, familyRent, vsRenting };
}
