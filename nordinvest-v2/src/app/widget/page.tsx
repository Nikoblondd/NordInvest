import type { Metadata } from "next";
import Link from "next/link";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import { WidgetBuilder } from "@/components/widget/WidgetBuilder";
import { ALL_DEAL_CITIES } from "@/lib/deal-cities";

export const metadata: Metadata = {
  title: { absolute: "Gratis boligwidget til lokale medier: månedens bedste køb · NordInvest" },
  description:
    "Vis jeres læsere de boliger i jeres kommune, der regner bedst som udlejning. Gratis widget med live data fra NordInvests Deal-motor, opdateret hver 6. time.",
  alternates: { canonical: "/widget" },
};

export default function WidgetPage() {
  const cities = [...ALL_DEAL_CITIES].sort((a, b) => a.name.localeCompare(b.name, "da")).map(({ slug, name, in: cityIn }) => ({ slug, name, in: cityIn }));
  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <Nav />
      <div className="mx-auto max-w-6xl px-4 pb-20 pt-28 sm:px-6">
        <p className="text-[13px] font-semibold uppercase tracking-[0.08em] text-blue-700">Til lokale medier</p>
        <h1 className="mt-3 max-w-3xl text-[34px] font-semibold leading-[1.08] tracking-[-0.03em] [text-wrap:balance] sm:text-[48px]">
          Månedens bedste køb i jeres kommune, gratis på jeres side
        </h1>
        <p className="mt-4 max-w-2xl text-[17px] leading-relaxed text-slate-600">
          Widgeten viser de tre boliger til salg i kommunen, der regner bedst som udlejning, og hvor mange af kommunens boliger der giver plus.
          Tallene kommer fra NordInvests Deal-motor, som regner hele boligmarkedet igennem og opdaterer hver 6. time. Den er gratis, uden
          reklamer og uden cookies. Vælg kommune, kopiér koden, og indsæt den i en artikel eller på forsiden.
        </p>
        <div className="mt-10 rounded-3xl border border-slate-200 bg-white p-5 shadow-[0_20px_50px_-30px_rgba(15,23,42,0.3)] sm:p-8">
          <WidgetBuilder cities={cities} />
        </div>
        <section className="mt-14 max-w-3xl space-y-3 text-[16px] leading-relaxed text-slate-700">
          <h2 className="text-[24px] font-semibold tracking-[-0.02em] text-slate-900">Til journalister</h2>
          <p>
            Vil I skrive om boligmarkedet i jeres område, kan I bruge tallene frit med kilden &quot;NordInvest&quot;. På{" "}
            <Link href="/presse" className="font-medium text-blue-700 underline underline-offset-2">pressesiden</Link> ligger de seneste tal for de
            største byer, og hver kommune har sin egen side under <Link href="/deals" className="font-medium text-blue-700 underline underline-offset-2">Deal-motoren</Link>.
            Skriv til <a href="mailto:contact@nordinvest.io" className="font-medium text-blue-700 underline underline-offset-2">contact@nordinvest.io</a> for
            et interview eller tal for en bestemt kommune.
          </p>
        </section>
      </div>
      <Footer />
    </main>
  );
}
