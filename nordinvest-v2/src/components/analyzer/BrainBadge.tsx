import { BrainCircuit, Star, TrendingUp } from "lucide-react";
import { TIER_LABEL, type ConfidenceTier } from "@/lib/calibration";

// Surfaces the state of the learning model on each analysis, per region, so the
// tool feels alive and self-improving — not a static calculator.
export function BrainBadge({
  regionName,
  tier,
  regionCount,
  globalCount,
  avgRating,
  observedAppreciationPct,
}: {
  regionName: string;
  tier: ConfidenceTier;
  regionCount: number;
  globalCount: number;
  avgRating: number | null;
  observedAppreciationPct: number | null;
}) {
  const tierTone: Record<ConfidenceTier, string> = {
    high: "bg-emerald-100 text-emerald-700",
    growing: "bg-blue-100 text-blue-700",
    early: "bg-amber-100 text-amber-700",
    none: "bg-slate-100 text-slate-500",
  };

  const headline =
    tier === "none"
      ? globalCount > 0
        ? `Kalibreret på ${globalCount} handler på landsplan`
        : "Ny model — kalibreres med de første handler"
      : `Kalibreret på ${regionCount} faktiske handler i ${regionName}`;

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-2xl border border-blue-200/60 bg-blue-50/70 px-5 py-3">
      <div className="flex items-center gap-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-600 text-white">
          <BrainCircuit size={18} />
        </span>
        <div>
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="whitespace-nowrap text-[13px] font-mediumr text-blue-600">NordInvest-hjernen</span>
            <span className={`whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-semibold ${tierTone[tier]}`}>
              {TIER_LABEL[tier]}
            </span>
          </div>
          <div className="text-sm font-medium text-slate-700">{headline}</div>
        </div>
      </div>

      <div className="ml-auto flex items-center gap-4 text-sm">
        {avgRating != null && (
          <span className="flex items-center gap-1 text-slate-600">
            <Star size={14} className="fill-amber-400 text-amber-400" />
            {avgRating.toString().replace(".", ",")} <span className="text-slate-400">præcision</span>
          </span>
        )}
        {observedAppreciationPct != null && (
          <span className="flex items-center gap-1 text-slate-600">
            <TrendingUp size={14} className="text-emerald-500" />
            <span className="whitespace-nowrap tabular-nums">{observedAppreciationPct.toFixed(1).replace(".", ",")} %</span> <span className="text-slate-400">målt vækst i {regionName}</span>
          </span>
        )}
      </div>
    </div>
  );
}
