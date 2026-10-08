/*
 * Danish statutory and typical transaction costs, 2026. Shared by the rental
 * analysis, the flip analysis and their spreadsheets so every page charges the
 * same fees for the same purchase.
 */

/** Tinglysning, pant and buyer's advisor when buying. */
export function purchaseCosts(price: number, loan: number) {
  const skoede = 1850 + price * 0.006; // skøde: 1.850 kr. + 0,6 %
  const pant = loan > 0 ? 1825 + loan * 0.0125 : 0; // pantebrev: 1.825 kr. + 1,25 % (fra 1.1.2026)
  const lawyer = 12000; // køberrådgiver/advokat, skøn
  return { skoede, pant, lawyer, total: skoede + pant + lawyer };
}

/** Purchase costs as % of the price, for models that take a percentage. */
export const purchaseCostPct = (price: number, loan: number) => (price > 0 ? (purchaseCosts(price, loan).total / price) * 100 : 0);

/** Broker (1,5 %, at least 35.000 kr.), reports and other costs when selling. */
export function saleCosts(value: number) {
  const broker = Math.max(35000, value * 0.015);
  const reports = 15000; // tilstands- og elinstallationsrapport
  const other = 20000; // markedsføring, halv ejerskifteforsikring, sælgers advokat
  return { broker, reports, other, total: broker + reports + other };
}

/**
 * Tax on the gain when a home you have not lived in is sold
 * (ejendomsavancebeskatningsloven): the gain less 10.000 kr. per year owned,
 * as capital income at up to 42 %. Indicative.
 */
export function gainTax(sale: number, sellCosts: number, buy: number, buyCosts: number, improvements: number, years: number) {
  const avance = sale - sellCosts - (buy + buyCosts) - improvements - 10000 * Math.max(1, Math.ceil(years));
  return { avance, tax: Math.max(0, avance) * 0.42 };
}
