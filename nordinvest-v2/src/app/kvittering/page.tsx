import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2, ArrowRight } from "lucide-react";
import { Nav } from "@/components/Nav";
import { KvitteringRedirect } from "@/components/KvitteringRedirect";

export const metadata: Metadata = {
  title: "Tak for dit køb",
  description: "Dit NordInvest-abonnement er aktiveret.",
  robots: { index: false },
};

export default function KvitteringPage() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <Nav />
      <main className="mx-auto flex max-w-lg flex-col items-center px-6 py-24 text-center">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-emerald-500 text-white shadow-xl shadow-emerald-500/30">
          <CheckCircle2 size={44} />
        </div>
        <h1 className="mt-8 text-3xl font-bold tracking-tight sm:text-4xl">Tak for dit køb! 🎉</h1>
        <p className="mt-4 text-lg leading-relaxed text-slate-600">
          Din betaling er gennemført, og dit abonnement bliver aktiveret på din konto med det samme.
          Du kan nu analysere og gemme flere ejendomme.
        </p>
        <Link
          href="/dashboard"
          className="mt-8 inline-flex items-center gap-2 rounded-full bg-blue-600 px-7 py-3.5 text-sm font-semibold text-white shadow-btn ring-1 ring-inset ring-white/10 transition-colors hover:bg-blue-700"
        >
          Gå til dit dashboard <ArrowRight size={18} />
        </Link>
        <KvitteringRedirect />
        <p className="mt-1 text-xs text-slate-400">
          Ser du ikke din nye plan? Den aktiveres automatisk — opdatér dashboardet om et øjeblik.
        </p>
      </main>
    </div>
  );
}
