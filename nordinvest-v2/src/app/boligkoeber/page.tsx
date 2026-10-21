import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Building2, Heart, Landmark, MapPinned, Scale, TrendingUp } from "lucide-react";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import { geist } from "@/components/home/fonts";
import { FounderNote } from "@/components/shared/FounderNote";
import { getMarket, TYPE_LABEL, type BuyerHome } from "@/lib/buyer/market";
import { createClient } from "@/lib/supabase/server";
import { hasBuyerAccess } from "@/lib/access";
import { site } from "@/lib/site";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export const metadata: Metadata = {
  title: { absolute: "Er boligen for dyr? Se om du gør et godt boligkøb · NordInvest" },
  description:
    "Se alle boliger til salg på ét kort: grøn er et godt køb, rød er for dyr i forhold til lignende boliger i nærheden. Med friværdi, hvad du kan låne, billigste realkreditlån og byggeprojekter i området.",
  alternates: { canonical: "/boligkoeber" },
  openGraph: {
    title: "Er boligen for dyr? Se det på kortet",
    description: "Alle boliger til salg i Danmark, vurderet mod lignende boliger i nærheden. Friværdi, lån og byggeprojekter i området.",
  },
};

const FAQ = [
  {
    q: "Hvordan ved jeg, om en bolig er for dyr?",
    a: "Sammenlign kvadratmeterprisen med lignende boliger til salg tæt på: samme type og en lignende størrelse. Ligger boligen blandt den billigste fjerdedel, er den et godt køb. Ligger den blandt den dyreste fjerdedel, betaler du for meget, med mindre stand, grund eller beliggenhed i gaden forklarer prisen. NordInvest gør det for alle boliger til salg og viser det som grøn, gul eller rød på kortet.",
  },
  {
    q: "Hvor meget kan jeg låne til en bolig?",
    a: "Bankerne ser særligt på, om din samlede gæld bliver over fire gange husstandens indkomst før skat, og du skal selv betale mindst 5 % i udbetaling plus omkostninger til tinglysning og rådgiver. Tjener I 900.000 kr. om året tilsammen uden anden gæld, kan I typisk låne op til 3,6 mio. kr. og købe for omkring 3,8 mio. kr. Brug beregneren på nordinvest.io/hvad-kan-jeg-laane.",
  },
  {
    q: "Hvor er det billigst at låne til bolig?",
    a: "Renten på et realkreditlån er den samme hos alle institutter, fordi lånet finansieres med obligationer. Forskellen er bidraget, som efter prisbladene for 2026 er lavest hos Totalkredit (efter KundeKroner) og højest hos Jyske Realkredit og Nordea Kredit på lån over 60 % af boligens værdi. På et lån på 3 mio. kr. er forskellen et par tusinde kroner om året.",
  },
  {
    q: "Hvad er friværdi?",
    a: "Friværdi er boligens værdi minus din gæld i den. Når du køber med 5 % udbetaling, er friværdien på dagen omtrent udbetalingen. Den vokser, når du afdrager på lånene, og når boligpriserne stiger. Falder priserne, kan friværdien blive negativ.",
  },
  {
    q: "Hvordan ser jeg, om der skal bygges i området?",
    a: "Kommunerne skal indberette alle lokalplaner til Plandata.dk. En ny lokalplan er sådan, en kommune åbner for nye boliger, butikker, skoler eller erhverv. NordInvest viser lokalplaner fra de seneste tre år på kortet og samler nyheder fra lokale medier om byggeri og nye butikker i kommunen.",
  },
];

const CITIES: { name: string; kommune: string }[] = [
  { name: "København", kommune: "koebenhavn" },
  { name: "Aarhus", kommune: "aarhus" },
  { name: "Odense", kommune: "odense" },
];

const kr = (n: number) => `${Math.round(n).toLocaleString("da-DK")} kr.`;
const mio = (n: number) => `${(n / 1_000_000).toLocaleString("da-DK", { maximumFractionDigits: 2 })} mio. kr.`;

export default async function BoligkoeberPage() {
  const [market, user] = await Promise.all([
    getMarket().catch(() => null),
    (async () => { const s = createClient(); return s ? (await s.auth.getUser()).data.user : null; })(),
  ]);
  const member = !!user && hasBuyerAccess(user);
  const homes = market?.homes ?? [];
  const good = homes.filter((h) => h.verdict === "godt").length;
  const cut = homes.filter((h) => h.cutPct > 0).length;
  const pctOf = (n: number) => (homes.length ? Math.round((n / homes.length) * 100) : 0);
  // Real examples: the best non-suspect buys among condos and houses in three big cities.
  const examples = CITIES.map((c) => ({
    ...c,
    homes: homes
      .filter((h) => h.kommune === c.kommune && h.verdict === "godt" && !h.suspect && h.deltaPct > -30)
      .sort((a, b) => b.score - a.score)
      .slice(0, 3),
  })).filter((c) => c.homes.length);

  const cta = member ? { href: "/boligkoeb", label: "Åbn boligkortet" } : { href: "/adgang?type=privat&kilde=boligkoeber", label: "Få adgang" };

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebApplication",
        name: "NordInvest boligkort for boligkøbere",
        url: `${site.url}/boligkoeber`,
        applicationCategory: "FinanceApplication",
        operatingSystem: "Web",
        inLanguage: "da-DK",
        description: "Kort over alle boliger til salg i Danmark med en prisvurdering mod lignende boliger i nærheden, lån, friværdi og byggeprojekter i området.",
        publisher: { "@id": `${site.url}/#organization` },
      },
      { "@type": "FAQPage", mainEntity: FAQ.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })) },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Forside", item: site.url },
          { "@type": "ListItem", position: 2, name: "For boligkøbere", item: `${site.url}/boligkoeber` },
        ],
      },
    ],
  };

  return (
    <div className={`${geist.variable} min-h-[100dvh] overflow-x-clip bg-white font-[family-name:var(--font-geist)] text-slate-900 antialiased`}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <Nav />
      <main>
        <section className="px-4 pb-14 pt-28 sm:px-6 sm:pt-32">
          <div className="mx-auto grid max-w-[1180px] items-center gap-12 lg:grid-cols-[1.05fr_0.95fr]">
            <div className="min-w-0">
              <p className="text-[13px] font-semibold uppercase tracking-[0.08em] text-blue-700">For boligkøbere</p>
              <h1 className="mt-3 text-[38px] font-semibold leading-[1.04] tracking-[-0.035em] [text-wrap:balance] sm:text-[56px]">
                Er boligen et godt køb, eller betaler du for meget?
              </h1>
              <p className="mt-5 max-w-[34rem] text-[18px] leading-relaxed text-slate-600">
                Se {homes.length ? homes.length.toLocaleString("da-DK") : "alle"} boliger til salg på ét kort. Hver bolig er sammenlignet med lignende boliger i nærheden:
                grøn er et godt køb, gul er middel, rød er dyr. Tryk på en bolig, og se hvad du kan låne, din friværdi, og hvad der bygges i området.
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-3">
                <Link href={cta.href} className="inline-flex min-h-[52px] items-center gap-2 rounded-lg bg-blue-600 px-6 text-[16px] font-semibold text-white hover:bg-blue-500">{cta.label} <ArrowRight size={18} /></Link>
                <Link href="/hvad-kan-jeg-laane" className="inline-flex min-h-[52px] items-center rounded-lg border border-slate-300 px-5 text-[16px] font-semibold text-slate-800 hover:border-slate-400">Hvad kan jeg låne?</Link>
              </div>
              {homes.length > 0 && (
                <dl className="mt-10 grid max-w-lg grid-cols-3 gap-4 border-t border-slate-200 pt-6">
                  <div><dt className="text-[13px] text-slate-500">Boliger til salg</dt><dd className="mt-1 text-[24px] font-semibold tabular-nums">{homes.length.toLocaleString("da-DK")}</dd></div>
                  <div><dt className="text-[13px] text-slate-500">Gode køb lige nu</dt><dd className="mt-1 text-[24px] font-semibold tabular-nums text-emerald-700">{pctOf(good)} %</dd></div>
                  <div><dt className="text-[13px] text-slate-500">Sat ned i pris</dt><dd className="mt-1 text-[24px] font-semibold tabular-nums">{pctOf(cut)} %</dd></div>
                </dl>
              )}
            </div>
            <MapPreview homes={examples.flatMap((e) => e.homes).slice(0, 4)} />
          </div>
        </section>

        <section className="bg-[#f4f6f9] px-4 py-16 sm:px-6 sm:py-20">
          <div className="mx-auto max-w-[1180px]">
            <h2 className="max-w-2xl text-[28px] font-semibold leading-[1.1] tracking-[-0.03em] sm:text-[40px]">Det ser du på hver bolig</h2>
            <div className="mt-10 grid gap-px overflow-hidden rounded-2xl border border-slate-200 bg-slate-200 sm:grid-cols-2 lg:grid-cols-3">
              {[
                [<Scale key="a" size={20} />, "Prisen mod området", "Kvadratmeterprisen mod lignende boliger til salg inden for få kilometer, med den forventede pris og hvor meget du betaler over eller under."],
                [<Landmark key="b" size={20} />, "Hvad du kan låne", "Skriv indkomst og opsparing, så ser du, om banken normalt vil låne dig nok, og hvad boligen koster om måneden efter rentefradrag."],
                [<Landmark key="c" size={20} />, "Billigste realkreditlån", "Bidraget hos Totalkredit, Realkredit Danmark, Nordea Kredit og Jyske Realkredit på netop dit lån, efter prisbladene."],
                [<TrendingUp key="d" size={20} />, "Friværdi 10 år frem", "Hvordan din friværdi vokser med afdrag og prisudviklingen i landsdelen fra Danmarks Statistik, og hvis priserne står stille."],
                [<Building2 key="e" size={20} />, "Byggeprojekter i nærheden", "Nye lokalplaner fra Plandata.dk på kortet: boliger, butikker, skoler og erhverv, der er på vej i området."],
                [<MapPinned key="f" size={20} />, "Nyt fra kommunen", "Byggeri, nye butikker, infrastruktur og arbejdspladser fra lokale medier, hvert punkt med sin kilde."],
              ].map(([icon, t, d]) => (
                <div key={t as string} className="bg-white p-6">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-700">{icon}</span>
                  <h3 className="mt-4 text-[18px] font-semibold tracking-[-0.01em]">{t}</h3>
                  <p className="mt-1.5 text-[15px] leading-relaxed text-slate-600">{d}</p>
                </div>
              ))}
            </div>
            <p className="mt-6 flex items-center gap-2 text-[15px] text-slate-600"><Heart size={16} className="text-rose-500" /> Gem boliger, og få en mail når prisen falder, eller når der kommer nye boliger, der passer på din søgning.</p>
          </div>
        </section>

        {examples.length > 0 && (
          <section className="px-4 py-16 sm:px-6 sm:py-20">
            <div className="mx-auto max-w-[1180px]">
              <h2 className="text-[28px] font-semibold leading-[1.1] tracking-[-0.03em] sm:text-[40px]">Gode køb lige nu</h2>
              <p className="mt-3 max-w-2xl text-[17px] leading-relaxed text-slate-600">Boliger til salg i dag, der er billigere pr. m² end de fleste lignende boliger i nærheden. Opdateret hver 6. time.</p>
              <div className="mt-8 grid gap-6 lg:grid-cols-3">
                {examples.map((c) => (
                  <div key={c.kommune} className="rounded-2xl border border-slate-200 p-5">
                    <h3 className="text-[18px] font-semibold">{c.name}</h3>
                    <ul className="mt-3 divide-y divide-slate-100">
                      {c.homes.map((h) => (
                        <li key={h.id} className="py-3">
                          <p className="flex items-baseline justify-between gap-3"><span className="truncate text-[15px] font-medium">{h.address.split(",")[0]}</span><span className="shrink-0 text-[15px] font-semibold tabular-nums">{mio(h.price)}</span></p>
                          <p className="mt-0.5 text-[13px] text-slate-500">{TYPE_LABEL[h.type] ?? "Bolig"} · {h.area} m² · <span className="font-medium text-emerald-700">{Math.abs(h.deltaPct).toLocaleString("da-DK", { maximumFractionDigits: 0 })} % under området</span></p>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        <section className="bg-[#f4f6f9] px-4 py-16 sm:px-6 sm:py-20">
          <div className="mx-auto max-w-3xl">
            <h2 className="text-[28px] font-semibold tracking-[-0.03em] sm:text-[36px]">Hvor kommer tallene fra?</h2>
            <p className="mt-4 text-[17px] leading-relaxed text-slate-700">
              Boligerne og deres prishistorik kommer fra boligportalerne og opdateres hver 6. time. Prisudviklingen er Danmarks Statistiks prisindeks for
              ejendomssalg. Renten er Nationalbankens tal for nye realkreditlån til husholdninger. Lokalplanerne kommer fra Plandata.dk, og bygningsdata og
              den offentlige vurdering fra BBR og Vurderingsstyrelsen. Vurderingen sammenligner udbudspriser. Den kender ikke boligens stand, så læs altid
              tilstandsrapporten, før du byder. <Link href="/methodology" className="font-medium text-blue-700 underline underline-offset-2">Læs om metoden</Link>.
            </p>
            <div className="mt-8"><FounderNote compact /></div>
          </div>
        </section>

        <section className="px-4 py-16 sm:px-6 sm:py-20">
          <div className="mx-auto max-w-3xl">
            <h2 className="text-[28px] font-semibold tracking-[-0.03em] sm:text-[36px]">Ofte stillede spørgsmål</h2>
            <div className="mt-6 divide-y divide-slate-200 border-y border-slate-200">
              {FAQ.map((f) => (
                <details key={f.q} className="group py-4">
                  <summary className="cursor-pointer list-none text-[17px] font-semibold text-slate-900">{f.q}</summary>
                  <p className="mt-2 text-[16px] leading-relaxed text-slate-600">{f.a}</p>
                </details>
              ))}
            </div>
            <div className="mt-10 flex flex-wrap gap-3">
              <Link href={cta.href} className="inline-flex min-h-[52px] items-center gap-2 rounded-lg bg-blue-600 px-6 text-[16px] font-semibold text-white hover:bg-blue-500">{cta.label} <ArrowRight size={18} /></Link>
              <Link href="/saadan-byder-du-paa-en-bolig" className="inline-flex min-h-[52px] items-center rounded-lg border border-slate-300 px-5 text-[16px] font-semibold text-slate-800 hover:border-slate-400">Sådan byder du på en bolig</Link>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}

/* A small, real slice of the map: example homes with their verdicts, drawn as cards on a street-map tint. */
function MapPreview({ homes }: { homes: BuyerHome[] }) {
  const dot = { godt: "#16a34a", middel: "#f59e0b", dyrt: "#dc2626" } as const;
  const dots = [[14, 22, "godt"], [30, 40, "middel"], [52, 18, "dyrt"], [68, 46, "godt"], [80, 26, "middel"], [22, 64, "dyrt"], [44, 70, "godt"], [62, 82, "middel"], [86, 66, "godt"], [10, 84, "middel"], [38, 52, "godt"], [74, 10, "dyrt"]] as const;
  return (
    <div className="relative min-w-0 overflow-hidden rounded-3xl border border-slate-200 bg-[#eef0ec] shadow-[0_30px_80px_-40px_rgba(15,23,42,0.45)]" aria-hidden>
      <div className="relative aspect-[4/3.4] w-full" style={{ backgroundImage: "linear-gradient(#e2e5df 2px, transparent 2px), linear-gradient(90deg, #e2e5df 2px, transparent 2px)", backgroundSize: "56px 56px" }}>
        <div className="absolute inset-y-0 left-[58%] w-6 -rotate-12 bg-[#cfe3f3]" />
        <div className="absolute inset-x-0 top-[38%] h-3 bg-[#f6d48a]" />
        {dots.map(([x, y, v], i) => <span key={i} className="absolute h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full ring-2 ring-white shadow" style={{ left: `${x}%`, top: `${y}%`, background: dot[v] }} />)}
        {homes[0] && (
          <div className="absolute bottom-4 left-4 right-4 rounded-2xl bg-white p-4 shadow-[0_10px_30px_rgba(15,23,42,0.2)] sm:left-auto sm:w-[300px]">
            <p className="text-[18px] font-semibold tabular-nums">{kr(homes[0].price)}</p>
            <p className="truncate text-[14px] text-slate-600">{homes[0].address}</p>
            <p className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[13px] font-semibold text-emerald-800 ring-1 ring-emerald-200"><span className="h-2 w-2 rounded-full bg-emerald-600" />Godt køb · {Math.abs(homes[0].deltaPct).toLocaleString("da-DK", { maximumFractionDigits: 0 })} % under området</p>
          </div>
        )}
      </div>
    </div>
  );
}
