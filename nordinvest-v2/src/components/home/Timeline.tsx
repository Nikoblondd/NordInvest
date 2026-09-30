"use client";

import { motion } from "framer-motion";
import { LinkIcon, Database, Calculator, ShieldAlert, Sparkle } from "lucide-react";
import { clsx } from "@/lib/clsx";

// Five-step product stepper. Each step is a real card with weight — colored
// numbered tile on the left, icon badge, title, description, and a small
// "output" chip that hints at what happens at that step. Cards connect via a
// vertical rail with animated fill, so the section reads as a genuine journey
// through the product, not a checklist.

// Restrained palette — steps 1 through 4 all share the same considered navy
// tile with a soft slate/blue icon badge, so the section reads as ONE brand
// voice, not a rainbow. Only the final step ("Dommen" — the result) gets a
// meaningful color shift to emerald, so color actually says something:
// process → result. That's how a real designer uses color, not as decoration.
type Accent = "navy" | "result";

const steps: {
  n: string;
  title: string;
  desc: string;
  icon: typeof LinkIcon;
  accent: Accent;
  hint: string;
}[] = [
  {
    n: "01",
    title: "Indsæt linket",
    desc: "Du finder en interessant ejendom på en dansk boligside. Kopier linket over, og lad motoren gå i gang.",
    icon: LinkIcon,
    accent: "navy",
    hint: "Boligsiden · EDC · Ejendomstorvet",
  },
  {
    n: "02",
    title: "Data hentes",
    desc: "Vi trækker offentlige registre (BBR) og annoncens tal for kontantpris, ejerudgifter, kvadratmeter og energimærke ind i én arbejdsgang.",
    icon: Database,
    accent: "navy",
    hint: "BBR · DAWA · Boligannoncen",
  },
  {
    n: "03",
    title: "Beregningsmotor",
    desc: "Cashflow, afkast, DSCR og IRR beregnes over ejerperioden med annuitetslån, tomgang, vedligehold og driftsomkostninger indregnet.",
    icon: Calculator,
    accent: "navy",
    hint: "Cash flow · Cap rate · DSCR · IRR",
  },
  {
    n: "04",
    title: "Rentestresstest",
    desc: "Hvad sker der, hvis renten stiger 1 til 2 procentpoint? Vi kører casen igennem stresset, så du kender marginen.",
    icon: ShieldAlert,
    accent: "navy",
    hint: "+1 % · +2 % · break-even rente",
  },
  {
    n: "05",
    title: "Dommen",
    desc: "Et samlet billede med score, verdikt og de vigtigste nøgletal. Fortsæt eller kassér — du ved det på sekunder.",
    icon: Sparkle,
    accent: "result",
    hint: "Score 0–100 · fuld rapport",
  },
];

const ACCENT: Record<Accent, {
  tile: string;
  badge: string;
  icon: string;
  glow: string;
  ring: string;
  hint: string;
}> = {
  navy:   { tile: "from-slate-700 to-slate-900",     badge: "bg-slate-50",    icon: "text-slate-700",   glow: "shadow-slate-900/25",  ring: "ring-slate-200/70",  hint: "text-slate-600 bg-slate-50" },
  result: { tile: "from-emerald-600 to-emerald-800", badge: "bg-emerald-50",  icon: "text-emerald-700", glow: "shadow-emerald-900/25", ring: "ring-emerald-100",   hint: "text-emerald-700 bg-emerald-50" },
};

export function Timeline() {
  return (
    <div className="relative">
      {/* Connecting rail — sits behind the numbered tiles, fades top and bottom
          so it feels drawn not stamped. */}
      <div
        aria-hidden
        className="pointer-events-none absolute left-6 top-8 bottom-8 hidden w-px sm:block"
        style={{
          background:
            "linear-gradient(180deg, transparent, rgba(148,163,184,0.35) 12%, rgba(148,163,184,0.35) 88%, transparent)",
        }}
      />

      <ol className="space-y-5 sm:space-y-6">
        {steps.map((s, i) => {
          const a = ACCENT[s.accent];
          const Icon = s.icon;
          return (
            <motion.li
              key={s.n}
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.5, delay: i * 0.06, ease: [0.2, 0.7, 0.2, 1] }}
              className="relative"
            >
              <div className="flex items-start gap-4 sm:gap-6">
                {/* Numbered tile — a gradient chip, size scales with breakpoint.
                    Real gradient + subtle colored glow gives it weight without
                    the vibe-coded shadow-blue-600/20 look on every button. */}
                <div
                  className={clsx(
                    "relative z-10 flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br font-mono text-xs font-bold tracking-wide text-white shadow-lg ring-1 ring-white/20 tabular-nums",
                    a.tile,
                    a.glow,
                  )}
                  style={{
                    boxShadow:
                      "inset 0 1px 0 rgba(255,255,255,0.25), 0 6px 16px -6px rgba(15,23,42,0.25)",
                  }}
                >
                  {s.n}
                </div>

                {/* Content card — layered depth: hairline border, layered shadow,
                    subtle inset top-highlight so it reads physical, not flat. */}
                <div
                  className={clsx(
                    "group relative flex-1 overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-5 transition-all duration-300 hover:-translate-y-[1px] hover:shadow-card-lift sm:p-6",
                  )}
                  style={{
                    boxShadow:
                      "0 1px 2px rgba(15,23,42,0.04), 0 1px 3px rgba(15,23,42,0.05), inset 0 1px 0 rgba(255,255,255,0.9)",
                  }}
                >
                  {/* Very subtle top-corner tint — a colored kiss, not a
                      dominant fill. Adds character without being toy. */}
                  <div
                    aria-hidden
                    className={clsx(
                      "pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full opacity-70 blur-2xl transition-opacity duration-500 group-hover:opacity-100",
                      a.badge,
                    )}
                  />

                  <div className="relative flex items-start gap-4">
                    <div
                      className={clsx(
                        "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ring-1",
                        a.badge,
                        a.ring,
                        a.icon,
                      )}
                    >
                      <Icon size={18} strokeWidth={1.8} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="text-base font-semibold tracking-[-0.01em] text-slate-900 sm:text-lg">
                        {s.title}
                      </h3>
                      <p className="mt-1.5 text-sm leading-relaxed text-slate-600 sm:text-[15px]">
                        {s.desc}
                      </p>
                      <div
                        className={clsx(
                          "mt-3 inline-flex items-center gap-1.5 rounded-md px-2 py-1 font-mono text-[11px] font-medium",
                          a.hint,
                        )}
                      >
                        <span aria-hidden className="text-current opacity-40">›</span>
                        {s.hint}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.li>
          );
        })}
      </ol>
    </div>
  );
}
