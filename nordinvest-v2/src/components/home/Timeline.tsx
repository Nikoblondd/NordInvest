"use client";

import { motion } from "framer-motion";
import { Link as LinkIcon, BarChart3, Calculator, Clock, CheckCircle2 } from "lucide-react";
import { clsx } from "@/lib/clsx";

const steps = [
  {
    step: "01",
    title: "Indsæt linket",
    desc: "Du finder en spændende ejendom på en dansk boligside. Kopier linket, sæt det ind i NordInvest, og lad motoren starte.",
    icon: LinkIcon,
    align: "left" as const,
  },
  {
    step: "02",
    title: "Datahentning",
    desc: "Vi skraber lynhurtigt offentlige registre (BBR) og boligsidens data for kontantpris, ejerudgifter, kvm og energimærke.",
    icon: BarChart3,
    align: "right" as const,
  },
  {
    step: "03",
    title: "Avanceret beregningsmotor",
    desc: "Vores algoritme udregner det reelle cashflow. Vi tager højde for 30-års afskrivning, bankrenter, vedligeholdelse og tomgang.",
    icon: Calculator,
    align: "left" as const,
  },
  {
    step: "04",
    title: "Rentestress-test",
    desc: "Hvad sker der, hvis renten stiger med 1 % eller 2 %? Vi stresstester automatisk din case for at sikre din margin i fremtiden.",
    icon: Clock,
    align: "right" as const,
  },
  {
    step: "05",
    title: "Din klare dom",
    desc: "Du får præsenteret et professionelt dashboard med en objektiv score. Er det en god case, eller skal du lede videre? Du ved det på under 60 sekunder.",
    icon: CheckCircle2,
    align: "left" as const,
  },
];

export function Timeline() {
  return (
    <div className="relative">
      <div className="absolute bottom-0 left-4 top-0 w-0.5 -translate-x-1/2 bg-slate-100 md:left-1/2" />

      {steps.map((item) => {
        const Icon = item.icon;
        const right = item.align === "right";
        return (
          <motion.div
            key={item.step}
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className={clsx(
              "relative mb-16 flex items-center justify-between gap-8 md:justify-normal",
              right && "md:flex-row-reverse",
            )}
          >
            <div className="absolute left-4 z-10 flex h-10 w-10 -translate-x-1/2 items-center justify-center rounded-full bg-blue-600 text-sm font-bold text-white shadow-[0_0_0_8px_white] md:left-1/2">
              {item.step}
            </div>

            <div
              className={clsx(
                "w-full pl-16 md:w-[45%] md:pl-0",
                right ? "md:text-right" : "md:text-left",
              )}
            >
              <div
                className={clsx(
                  "group rounded-3xl border border-slate-100 bg-slate-50 p-6 transition-all hover:border-blue-200 hover:shadow-lg hover:shadow-blue-900/5 md:p-8",
                  right && "md:ml-auto",
                )}
              >
                <div
                  className={clsx(
                    "mb-4 flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-blue-600 shadow-sm transition-transform group-hover:scale-110",
                    right && "md:ml-auto",
                  )}
                >
                  <Icon size={20} />
                </div>
                <h3 className="mb-2 text-xl font-semibold text-slate-900">{item.title}</h3>
                <p className="text-sm leading-relaxed text-slate-600 md:text-base">{item.desc}</p>
              </div>
            </div>

            <div className="hidden w-[45%] md:block" />
          </motion.div>
        );
      })}
    </div>
  );
}
