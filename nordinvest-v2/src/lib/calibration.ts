// The NordInvest "brain": turns real, user-reported deal outcomes into
// correction factors that make future estimates sharper. This is the moat —
// it only works because we collect actual Danish outcomes no LLM has access to.

export type OutcomeRow = {
  predicted: {
    price?: number;
    monthlyRent?: number;
    appreciationPct?: number;
  } | null;
  actual_monthly_rent: number | null;
  actual_sale_price: number | null;
  months_held: number | null;
};

export type Calibration = {
  count: number; // number of outcomes informing the model
  rentFactor: number; // multiply an estimated rent by this
  observedAppreciationPct: number | null; // median annualised, from real sales
  confidence: number; // 0..1
};

export const NEUTRAL_CALIBRATION: Calibration = {
  count: 0,
  rentFactor: 1,
  observedAppreciationPct: null,
  confidence: 0,
};

function median(nums: number[]): number | null {
  const xs = nums.filter((n) => Number.isFinite(n)).sort((a, b) => a - b);
  if (xs.length === 0) return null;
  const mid = Math.floor(xs.length / 2);
  return xs.length % 2 ? xs[mid] : (xs[mid - 1] + xs[mid]) / 2;
}

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

export function computeCalibration(rows: OutcomeRow[]): Calibration {
  // Rent correction: how our estimated rent compares to what really got charged.
  const rentRatios = rows
    .filter((r) => r.actual_monthly_rent && r.predicted?.monthlyRent)
    .map((r) => (r.actual_monthly_rent as number) / (r.predicted!.monthlyRent as number))
    .filter((x) => x > 0.3 && x < 3); // drop obvious typos
  const rentMedian = median(rentRatios);
  const rentFactor = rentMedian ? clamp(rentMedian, 0.6, 1.6) : 1;

  // Appreciation: annualised price growth observed in real sales.
  const cagrs = rows
    .filter((r) => r.actual_sale_price && r.predicted?.price && r.months_held && r.months_held >= 3)
    .map((r) => {
      const ratio = (r.actual_sale_price as number) / (r.predicted!.price as number);
      const years = (r.months_held as number) / 12;
      return (Math.pow(ratio, 1 / years) - 1) * 100;
    })
    .filter((x) => x > -30 && x < 40);
  const observedAppreciationPct = median(cagrs);

  const count = rows.length;
  // Confidence ramps up with data volume — full trust around ~60 outcomes.
  const confidence = clamp(count / 60, 0, 1);

  return { count, rentFactor, observedAppreciationPct, confidence };
}

export function confidenceLabel(count: number): string {
  if (count <= 0) return "Ny model — kalibreres med de første handler";
  if (count < 10) return `Tidlig kalibrering · ${count} handler`;
  if (count < 40) return `Kalibreret på ${count} faktiske handler`;
  return `Højt datagrundlag · ${count} faktiske handler`;
}

// Data-density tier used for the per-analysis confidence label. Based on how
// many REAL outcomes back the specific region the property sits in.
export type ConfidenceTier = "none" | "early" | "growing" | "high";

export function confidenceTier(regionCount: number): ConfidenceTier {
  if (regionCount >= 25) return "high";
  if (regionCount >= 8) return "growing";
  if (regionCount >= 1) return "early";
  return "none";
}

export const TIER_LABEL: Record<ConfidenceTier, string> = {
  high: "Højt datagrundlag",
  growing: "Voksende datagrundlag",
  early: "Tidligt datagrundlag",
  none: "Estimat — endnu ingen lokale handler",
};

// Blend a region's calibration toward the global one, with global acting as a
// prior so a region with only a few outcomes doesn't overfit.
export function blendRentFactor(regional: Calibration, global: Calibration): number {
  const rw = regional.count;
  const gw = Math.max(8, global.count * 0.3); // global prior weight
  const total = rw + gw;
  if (total === 0) return 1;
  return (regional.rentFactor * rw + global.rentFactor * gw) / total;
}
