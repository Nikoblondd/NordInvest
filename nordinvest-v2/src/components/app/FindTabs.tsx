import Link from "next/link";
import { Radar, Search } from "lucide-react";
import { clsx } from "@/lib/clsx";

/* The two halves of Find boliger: search the market now, or let agents do it. */
export function FindTabs({ active, fresh }: { active: "soeg" | "agenter"; fresh: number }) {
  const tab = (on: boolean) => clsx("-mb-px flex min-h-[46px] items-center gap-2 border-b-2 px-3 text-[15px] font-semibold transition-colors", on ? "border-slate-900 text-slate-900" : "border-transparent text-slate-500 hover:text-slate-800");
  return (
    <nav aria-label="Find boliger" className="mt-5 flex gap-1 border-b border-slate-200">
      <Link href="/app/find" aria-current={active === "soeg" ? "page" : undefined} className={tab(active === "soeg")}><Search size={16} /> Søg i markedet</Link>
      <Link href="/app/find/agenter" data-tour="agents" aria-current={active === "agenter" ? "page" : undefined} className={tab(active === "agenter")}>
        <Radar size={16} /> Søgeagenter
        {fresh > 0 && <span className="rounded-full bg-blue-600 px-1.5 text-[12px] font-bold tabular-nums text-white">{fresh}</span>}
      </Link>
    </nav>
  );
}
