"use client";

import { BadgeCheck, Gauge, PencilLine, AlertTriangle, Info } from "lucide-react";
import { clsx } from "@/lib/clsx";
import type { ProvRow, ProvTier, RentRule } from "@/lib/provenance";

const TIER: Record<ProvTier, { label: string; dot: string; text: string; Icon: typeof BadgeCheck }> = {
  doc: { label: "Dokumenteret", dot: "bg-emerald-500", text: "text-emerald-700", Icon: BadgeCheck },
  est: { label: "Estimat", dot: "bg-amber-500", text: "text-amber-700", Icon: Gauge },
  input: { label: "Indtastet", dot: "bg-slate-400", text: "text-slate-500", Icon: PencilLine },
};

function todayDa(): string {
  return new Date().toLocaleDateString("da-DK", { day: "numeric", month: "long", year: "numeric" });
}

/**
 * Datagrundlag panel — labels each verdict-driving figure as Dokumenteret /
 * Estimat / Indtastet, and surfaces the Danish rent-regulation caveat when the
 * verdict leans on an advertised or estimated rent. Directly answers the
 * validation review: "vis kilde, dato og hvad kunden skal undersøge."
 */
export function DataProvenance({
  rows,
  rentRule,
  showRentCaveat,
}: {
  rows: ProvRow[];
  rentRule: RentRule;
  showRentCaveat: boolean;
}) {
  const caveatTone =
    rentRule.level === "high"
      ? "border-rose-200 bg-rose-50 text-rose-900"
      : rentRule.level === "unknown"
      ? "border-amber-200 bg-amber-50 text-amber-900"
      : "border-slate-200 bg-slate-50 text-slate-700";
  const CaveatIcon = rentRule.level === "info" ? Info : AlertTriangle;

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-slate-900">Datagrundlag</h3>
        <span className="text-xs text-slate-500">Tjekket d. {todayDa()}</span>
      </div>
      <p className="mt-1 text-xs leading-relaxed text-slate-500">
        Så du ved præcis, hvad der er dokumenteret, hvad vi har estimeret, og hvad du selv skal undersøge.
      </p>

      {/* legend */}
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-xs font-medium">
        {(Object.keys(TIER) as ProvTier[]).map((t) => (
          <span key={t} className={clsx("inline-flex items-center gap-1.5", TIER[t].text)}>
            <span className={clsx("h-2 w-2 rounded-full", TIER[t].dot)} />
            {TIER[t].label}
          </span>
        ))}
      </div>

      {/* rows */}
      <ul className="mt-4 divide-y divide-slate-100">
        {rows.map((row) => {
          const t = TIER[row.tier];
          return (
            <li key={row.key} className="flex items-center justify-between gap-3 py-2.5">
              <div className="min-w-0">
                <div className="text-sm font-semibold text-slate-900">{row.label}</div>
                <div className="text-[13px] leading-snug text-slate-500">{row.source}</div>
              </div>
              <span
                className={clsx(
                  "inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold",
                  row.tier === "doc" && "bg-emerald-50 text-emerald-700",
                  row.tier === "est" && "bg-amber-50 text-amber-700",
                  row.tier === "input" && "bg-slate-100 text-slate-600",
                )}
              >
                <t.Icon size={12} />
                {t.label}
              </span>
            </li>
          );
        })}
      </ul>

      {/* legal caveat — advertised/estimated rent ≠ legally chargeable rent */}
      {showRentCaveat && (
        <div className={clsx("mt-4 flex gap-2.5 rounded-xl border p-3.5", caveatTone)}>
          <CaveatIcon size={16} className="mt-0.5 shrink-0" />
          <div>
            <div className="text-xs font-bold">{rentRule.title}</div>
            <p className="mt-1 text-xs leading-relaxed opacity-90">{rentRule.body}</p>
          </div>
        </div>
      )}
    </section>
  );
}
