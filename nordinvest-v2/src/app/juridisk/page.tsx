import type { Metadata } from "next";
import Link from "next/link";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Juridisk: vilkår, privatliv og cookies",
  description: "NordInvests juridiske dokumenter: vilkår, privatlivspolitik, cookiepolitik og fortrydelsesret.",
};

const b = site.business;
const identity = [
  b.legalName,
  b.entityType,
  b.cvr && `CVR ${b.cvr}`,
  b.address,
  b.country,
].filter(Boolean).join(" · ");

const docs = [
  { href: "/juridisk/vilkaar", title: "Vilkår for brug", desc: "Betingelserne for at bruge NordInvest, abonnement og ansvar." },
  { href: "/juridisk/privatlivspolitik", title: "Privatlivspolitik", desc: "Hvilke personoplysninger vi behandler, hvorfor og dine rettigheder." },
  { href: "/juridisk/cookies", title: "Cookiepolitik", desc: "Hvilke cookies vi bruger — kun de teknisk nødvendige." },
  { href: "/juridisk/fortrydelsesret", title: "Fortrydelsesret & refundering", desc: "Fortrydelse, opsigelse og refundering af abonnement." },
];

export default function JuridiskPage() {
  return (
    <main>
      <Nav />
      <article className="bg-cream-50 pt-32">
        <div className="container-x max-w-3xl pb-24">
          <h1 className="text-4xl md:text-5xl">Juridisk</h1>
          <p className="mt-3 text-stone-600">Vores juridiske dokumenter. Har du spørgsmål, er du velkommen til at skrive til {site.email}.</p>
          <div className="mt-10 grid gap-4 sm:grid-cols-2">
            {docs.map((d) => (
              <Link
                key={d.href}
                href={d.href}
                className="rounded-2xl border border-stone-200 bg-white p-6 transition-colors hover:border-navy-900"
              >
                <div className="text-lg font-semibold text-stone-900">{d.title}</div>
                <p className="mt-2 text-sm text-stone-600">{d.desc}</p>
              </Link>
            ))}
          </div>
          {identity && (
            <p className="mt-10 text-sm text-stone-500">{identity}</p>
          )}
        </div>
      </article>
      <Footer />
    </main>
  );
}
