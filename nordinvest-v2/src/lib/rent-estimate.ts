/*
 * Shared by the Deal-motor and the public rent calculator (/beregn-husleje),
 * so both show the same estimate for the same postnummer.
 */

// Private-market rent benchmark, kr/m²/month (2026, conservative). This is the
// single biggest driver of the cash-flow estimate, so it's tiered by area
// rather than a flat national number. Refined per-region by the brain's factor.
export function rentPerM2(zip: number): number {
  if (zip >= 1000 && zip <= 1499) return 175; // København K (indre by)
  if (zip >= 1500 && zip <= 1799) return 170; // København V
  if (zip >= 1800 && zip <= 2000) return 165; // Frederiksberg
  if (zip === 2100 || zip === 2150) return 175; // Østerbro
  if (zip === 2200) return 170; // Nørrebro
  if (zip === 2300) return 165; // Amager / København S
  if (zip === 2400 || zip === 2450 || zip === 2500) return 160; // NV / SV / Valby
  if (zip >= 2600 && zip <= 2990) return 135; // København omegn
  if (zip === 8000) return 130; // Aarhus C
  if (zip >= 8200 && zip <= 8270) return 108; // Aarhus omegn
  if (zip >= 5000 && zip <= 5270) return 100; // Odense
  if (zip >= 9000 && zip <= 9220) return 95; // Aalborg
  if (zip === 6700 || zip === 6705 || zip === 6710) return 90; // Esbjerg
  if (zip === 6000 || zip === 7000 || zip === 7100) return 95; // Trekantsområdet
  if (zip >= 3000 && zip <= 3670) return 110; // Nordsjælland
  if (zip >= 4000 && zip <= 4400) return 95; // Roskilde/Sjælland
  return 88; // resten af landet — bevidst konservativt
}

// Rent does not grow in step with size: a 228 m² villa in Struer does not let
// for three times a 76 m² one. The first 80 m² count in full, the next 60 at
// 60 % and the rest at 30 %, which keeps large houses near what they let for.
export function effectiveRentArea(area: number): number {
  if (!Number.isFinite(area) || area <= 0) return 0;
  return Math.min(area, 80) + 0.6 * Math.max(0, Math.min(area, 140) - 80) + 0.3 * Math.max(0, area - 140);
}

/** Estimated market rent in kr./md. for a home with no stated rent, rounded to 100. */
export function estimateMonthlyRent(zip: number | null, area: number, factor = 1): number {
  return Math.round((effectiveRentArea(area) * (zip ? rentPerM2(zip) : 88) * factor) / 100) * 100;
}
