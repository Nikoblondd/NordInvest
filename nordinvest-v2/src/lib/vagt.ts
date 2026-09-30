// Fase 4 — "Vagt". Shared types + helpers for the property-watch feature.

export type PricePoint = { d: string; price: number; score?: number };

export type WatchStatus = "active" | "price_drop" | "price_rise" | "sold" | "error";

export type Watch = {
  id: string;
  listing_url: string;
  address: string | null;
  strategy: string | null;
  baseline_price: number | null;
  baseline_score: number | null;
  current_price: number | null;
  current_score: number | null;
  status: WatchStatus;
  price_history: PricePoint[];
  has_alert: boolean;
  last_alert: string | null;
  created_at: string;
  last_checked_at: string | null;
};

export const STATUS_LABEL: Record<WatchStatus, string> = {
  active: "Overvåges",
  price_drop: "Pris faldet",
  price_rise: "Pris steget",
  sold: "Solgt / væk",
  error: "Kunne ikke tjekke",
};

// Danish price formatting shared with the rest of the app.
export function krFull(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return "–";
  return `${Math.round(n).toLocaleString("da-DK")} kr`;
}

// A compact, signed delta like "−300.000 kr (−1,9 %)".
export function priceDelta(from: number | null, to: number | null): { text: string; dir: "down" | "up" | "flat" } | null {
  if (from == null || to == null || !Number.isFinite(from) || !Number.isFinite(to) || from === 0) return null;
  const diff = to - from;
  if (diff === 0) return { text: "Uændret", dir: "flat" };
  const pctVal = (diff / from) * 100;
  const sign = diff < 0 ? "−" : "+";
  const abs = Math.abs(diff).toLocaleString("da-DK");
  const pctTxt = `${sign}${Math.abs(pctVal).toLocaleString("da-DK", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} %`;
  return { text: `${sign}${abs} kr (${pctTxt})`, dir: diff < 0 ? "down" : "up" };
}

// Build an SVG polyline path for a mini price sparkline in a WxH box.
export function sparklinePath(points: PricePoint[], w: number, h: number, pad = 2): string {
  const prices = points.map((p) => p.price).filter((n) => Number.isFinite(n));
  if (prices.length < 2) return "";
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const span = max - min || 1;
  const stepX = (w - pad * 2) / (prices.length - 1);
  return prices
    .map((p, i) => {
      const x = pad + i * stepX;
      const y = pad + (1 - (p - min) / span) * (h - pad * 2);
      return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
}
