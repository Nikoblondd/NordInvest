import type { Verdict } from "@/lib/buyer/market";

export const kr = (n: number) => `${Math.round(n).toLocaleString("da-DK")} kr`;
/** 4.250.000 → "4,25 mio. kr" */
export const mio = (n: number) => (Math.abs(n) >= 1_000_000 ? `${(n / 1_000_000).toLocaleString("da-DK", { maximumFractionDigits: 2 })} mio. kr` : kr(n));
export const pct = (n: number, digits = 1) => `${n.toLocaleString("da-DK", { maximumFractionDigits: digits, minimumFractionDigits: 0 })} %`;

export const VERDICT_LABEL: Record<Verdict, string> = { godt: "Godt køb", middel: "Middel", dyrt: "Dyr" };
const STYLE: Record<Verdict, string> = {
  godt: "bg-emerald-50 text-emerald-800 ring-emerald-200",
  middel: "bg-amber-50 text-amber-800 ring-amber-200",
  dyrt: "bg-rose-50 text-rose-800 ring-rose-200",
};
const DOT: Record<Verdict, string> = { godt: "bg-emerald-600", middel: "bg-amber-500", dyrt: "bg-rose-600" };

export function VerdictPill({ v, large = false }: { v: Verdict; large?: boolean }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full font-semibold ring-1 ${STYLE[v]} ${large ? "px-3 py-1 text-[14px]" : "px-2 py-0.5 text-[12px]"}`}>
      <span className={`h-2 w-2 rounded-full ${DOT[v]}`} />{VERDICT_LABEL[v]}
    </span>
  );
}
