import Link from "next/link";
import { CheckCircle2, Lock } from "lucide-react";
import { tiers } from "@/lib/pricing";
import { clsx } from "@/lib/clsx";

export function PricingCards() {
  return (
    <div className="grid w-full grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-5">
      {tiers.map((t) => {
        const featured = t.featured;
        return (
          <div
            key={t.id}
            className={clsx(
              "relative flex flex-col rounded-3xl border p-6",
              featured
                ? "border-slate-800 bg-slate-900 shadow-xl shadow-slate-900/10 lg:-translate-y-4"
                : "border-slate-200 bg-white",
            )}
          >
            {featured && (
              <div className="pointer-events-none absolute right-0 top-0 p-6 opacity-10">
                <Lock size={80} className="text-white" />
              </div>
            )}

            <div className="relative z-10 mb-6">
              {featured && (
                <div className="mb-3 inline-block rounded-full bg-blue-500 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">
                  Mest populære
                </div>
              )}
              <h3 className={clsx("mb-2 text-xl font-semibold", featured && "text-white")}>
                {t.name}
              </h3>
              <div className="mb-2 flex items-baseline gap-1">
                <span className={clsx("text-3xl font-bold", featured && "text-white")}>
                  {t.price} kr.
                </span>
                <span className={clsx("text-sm", featured ? "text-slate-400" : "text-slate-500")}>
                  / mdr
                </span>
              </div>
              <p className={clsx("text-xs", featured ? "text-slate-400" : "text-slate-500")}>
                {t.blurb}
              </p>
            </div>

            <ul className="relative z-10 mb-6 flex-1 space-y-3 text-sm">
              {t.features.map((f, i) => (
                <li
                  key={f}
                  className={clsx(
                    "flex items-start gap-2",
                    featured ? "text-slate-300" : "text-slate-700",
                  )}
                >
                  <CheckCircle2
                    size={16}
                    className={clsx(
                      "mt-0.5 shrink-0",
                      featured ? "text-blue-400" : "text-emerald-500",
                    )}
                  />
                  <span className={clsx(i === 0 && "font-medium", featured && i === 0 && "text-white")}>
                    {f}
                  </span>
                </li>
              ))}
            </ul>

            <Link
              href={t.cta.href}
              className={clsx(
                "relative z-10 w-full rounded-xl px-4 py-2.5 text-center text-sm font-medium transition-colors",
                featured
                  ? "bg-blue-600 text-white shadow-lg shadow-blue-900/50 hover:bg-blue-500"
                  : "bg-slate-100 text-slate-900 hover:bg-slate-200",
              )}
            >
              {t.cta.label}
            </Link>
          </div>
        );
      })}
    </div>
  );
}
