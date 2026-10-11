import Link from "next/link";
import { Logo } from "./Logo";
import { CookieSettingsButton } from "./analytics/CookieSettingsButton";
import { CITIES } from "@/lib/cities";
import { site } from "@/lib/site";
import { Fold } from "./ui/Fold";

const columns = [
  {
    title: "Produkt",
    links: [
      { href: "/analyseren", label: "Analyseren" },
      { href: "/deals", label: "Deal-motor" },
      { href: "/beregn-husleje", label: "Beregn husleje" },
      { href: "/beregn-afkast", label: "Beregn afkast" },
      { href: "/udlejning-af-lejlighed", label: "Regler og skat ved udlejning" },
      { href: "/priser", label: "Priser" },
      { href: "/#hvordan", label: "Sådan virker det" },
      { href: "/dashboard", label: "Mine ejendomme" },
    ],
  },
  {
    title: "Ressourcer",
    links: [
      { href: "/blog", label: "Blog & guides" },
      { href: "/methodology", label: "Metode & datakilder" },
      { href: "/data", label: "Åbent datagrundlag" },
      { href: "/investment-models", label: "Investeringsstrategier" },
      { href: "/ordbog", label: "Ordbog" },
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
      { href: "/presse", label: "Presse" },
      { href: "/udlejerindeks", label: "Udlejerindekset" },
      { href: "/widget", label: "Widget til medier" },
      { href: "/kontakt", label: "Kontakt" },
      { href: "/juridisk/vilkaar", label: "Vilkår" },
      { href: "/juridisk/privatlivspolitik", label: "Privatlivspolitik" },
      { href: "/juridisk/cookies", label: "Cookiepolitik" },
      { href: "/juridisk/fortrydelsesret", label: "Fortrydelsesret" },
    ],
  },
];

const QUICK = [
  { href: "/analyseren/start", label: "Analysér en bolig" },
  { href: "/deals", label: "Deal-motor" },
  { href: "/priser", label: "Priser" },
  { href: "/blog", label: "Blog & guides" },
  { href: "/om", label: "Om os" },
  { href: "/kontakt", label: "Kontakt" },
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
    <footer className="border-t border-slate-200 bg-white px-6 py-10 sm:py-14">
      <div className="mx-auto max-w-6xl">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-5">
          <div className="col-span-2 md:col-span-1">
            <Logo size={24} />
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-slate-500">
              Data-drevne beslutninger for danske ejendomsinvestorer. Analysér enhver bolig på under
              60 sekunder.
            </p>
          </div>
          {/* Phones: the six links people actually use, the rest one tap away. */}
          <ul className="col-span-2 grid grid-cols-2 gap-x-4 gap-y-1 sm:hidden">
            {QUICK.map((l) => (
              <li key={l.href}>
                <Link href={l.href} className="flex min-h-[44px] items-center text-[15px] font-medium text-slate-700 hover:text-blue-600">{l.label}</Link>
              </li>
            ))}
          </ul>
          <Fold label="Alle links" labelOpen="Skjul links" className="col-span-2 md:col-span-4">
          <div className="fold-body grid grid-cols-2 gap-8 md:grid-cols-4">
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
                {col.title === "NordInvest" && (
                  <li>
                    <CookieSettingsButton className="inline-block py-1.5 text-left text-sm text-slate-600 transition-colors hover:text-blue-600" />
                  </li>
                )}
              </ul>
            </div>
          ))}
          </div>
          </Fold>
        </div>
        <div className="mt-10 border-t sm:mt-12 border-slate-100 pt-6 text-sm text-slate-500">
          <div>{businessLine}</div>
          <div className="mt-1 text-slate-400">
            © {new Date().getFullYear()} {site.name}. Alle rettigheder forbeholdes.
          </div>
        </div>
      </div>
    </footer>
  );
}
