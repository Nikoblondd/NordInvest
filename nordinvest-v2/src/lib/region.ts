import { zipFromAddress } from "@/lib/zip";
// Derives a region key from a scraped address so calibration can be segmented
// per market (København, Aarhus, Fyn, Stockholm, Oslo) instead of only global.

export const REGION_LABELS: Record<string, string> = {
  koebenhavn: "København",
  aarhus: "Aarhus",
  fyn: "Fyn",
  stockholm: "Stockholm",
  oslo: "Oslo",
};

export function regionFromAddress(address: string | null | undefined): string | null {
  if (!address) return null;
  const a = address.toLowerCase();
  if (/stockholm/.test(a)) return "stockholm";
  if (/oslo/.test(a)) return "oslo";
  if (/københavn|kbh|copenhagen|frederiksberg|valby|amager|nørrebro|østerbro|vesterbro|vanløse|brønshøj|hellerup|nordvest|sydhavn/.test(a)) return "koebenhavn";
  if (/aarhus|århus|risskov|viby|højbjerg|brabrand|åbyhøj/.test(a)) return "aarhus";
  if (/odense|svendborg|nyborg|middelfart|\bfyn\b|faaborg|assens|bogense|kerteminde/.test(a)) return "fyn";

  const z = zipFromAddress(a);
  if (z) {
    const p = parseInt(z, 10);
    if (p >= 1000 && p <= 2499) return "koebenhavn";
    if (p >= 5000 && p <= 5999) return "fyn";
    if (p >= 8000 && p <= 8399) return "aarhus";
  }
  return null;
}

export function regionLabel(region: string | null): string {
  return region ? REGION_LABELS[region] ?? region : "hele landet";
}
