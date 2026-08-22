import { tiers } from "@/lib/pricing";
import { Button } from "./ui/Button";
import { clsx } from "@/lib/clsx";

export function PricingCards({ theme = "dark" }: { theme?: "light" | "dark" }) {
  const onDark = theme === "dark";
  return (
    <div className="grid gap-6 lg:grid-cols-4">
      {tiers.map((t) => {
        const featured = t.featured;
        return (
          <div
            key={t.id}
            className={clsx(
              "relative flex flex-col rounded-2xl border p-8 transition-shadow",
              featured
                ? "border-gold-500 bg-cream-50 text-stone-900 shadow-xl lg:scale-[1.03]"
                : onDark
                  ? "border-white/10 bg-navy-800/60 text-cream-100"
                  : "border-stone-200 bg-white text-stone-900 shadow-sm",
            )}
          >
            {featured && (
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-gold-500 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-navy-900">
                Mest populær
              </span>
            )}
            <div className="font-serif text-xl">{t.name}</div>
            <div className="mt-4 font-mono text-4xl font-light tnum">
              {t.price === 0 ? "0 kr" : `${t.price} kr`}
              <span className="text-base text-stone-400">/md.</span>
            </div>
            <div
              className={clsx(
                "mt-1 text-sm",
                featured || !onDark ? "text-stone-600" : "text-cream-100/60",
              )}
            >
              {t.analyses}
            </div>
            {t.perAnalysis && (
              <div className="mt-1 text-xs text-gold-600">{t.perAnalysis}</div>
            )}

            <ul className="mt-6 flex-1 space-y-3 text-sm">
              {t.features.map((f) => (
                <li key={f} className="flex gap-2">
                  <span className="text-gold-500">✓</span>
                  <span
                    className={clsx(
                      featured || !onDark ? "text-stone-600" : "text-cream-100/80",
                    )}
                  >
                    {f}
                  </span>
                </li>
              ))}
            </ul>

            <Button
              href={t.cta.href}
              variant={featured ? "primary" : "secondary"}
              className={clsx(
                "mt-8 w-full",
                !featured && onDark && "text-cream-100",
              )}
            >
              {t.cta.label}
            </Button>
          </div>
        );
      })}
    </div>
  );
}
