import Link from "next/link";
import { Logo } from "./Logo";
import { CITIES } from "@/lib/cities";
import { site } from "@/lib/site";

const columns = [
  {
    title: "Produkt",
    links: [
      { href: "/analyseren", label: "Analyseren" },
      { href: "/priser", label: "Priser" },
      { href: "/#hvordan", label: "Sådan virker det" },
      { href: "/dashboard", label: "Dashboard" },
    ],
  },
  {
    title: "Ressourcer",
    links: [
      { href: "/blog", label: "Blog & guides" },
      { href: "/methodology", label: "Metode & datakilder" },
      { href: "/data", label: "Åbent datagrundlag" },
      { href: "/investment-models", label: "Investeringsstrategier" },
      { href: "/glossary", label: "Ordbog" },
    ],
  },
  {
    title: "Markeder",
    links: CITIES.map((c) => ({
      href: `/investering-i-ejendom-${c.slug}`,
      label: `Ejendom ${c.inName}`,
    })),
  },
  {
    title: "NordInvest",
    links: [
      { href: "/om", label: "Om os" },
      { href: "/kontakt", label: "Kontakt" },
      { href: "/juridisk/vilkaar", label: "Vilkår" },
      { href: "/juridisk/privatlivspolitik", label: "Privatlivspolitik" },
      { href: "/juridisk/cookies", label: "Cookiepolitik" },
      { href: "/juridisk/fortrydelsesret", label: "Fortrydelsesret" },
    ],
  },
];

const b = site.business;
const businessLine = [
  b.legalName,
  b.cvr && `CVR ${b.cvr}`,
  b.address,
  b.country,
].filter(Boolean).join(" · ");

export function Footer() {
  return (
    <footer className="border-t border-slate-200 bg-white px-6 py-14">
      <div className="mx-auto max-w-6xl">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-5">
          <div className="col-span-2 md:col-span-1">
            <Logo size={24} />
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-slate-500">
              Data-drevne beslutninger for danske ejendomsinvestorer. Analysér enhver bolig på under
              60 sekunder.
            </p>
          </div>
          {columns.map((col) => (
            <div key={col.title}>
              <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                {col.title}
              </div>
              <ul className="mt-3 space-y-0.5">
                {col.links.map((l) => (
                  <li key={l.href}>
                    <Link href={l.href} className="inline-block py-1.5 text-sm text-slate-600 transition-colors hover:text-blue-600">
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-12 border-t border-slate-100 pt-6 text-sm text-slate-500">
          <div>{businessLine}</div>
          <div className="mt-1 text-slate-400">
            © {new Date().getFullYear()} {site.name}. Alle rettigheder forbeholdes.
          </div>
        </div>
      </div>
    </footer>
  );
}
