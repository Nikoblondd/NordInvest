import Link from "next/link";
import { CookieSettingsButton } from "./analytics/CookieSettingsButton";
import { CITIES } from "@/lib/cities";
import { site } from "@/lib/site";

const columns = [
  {
    title: "Produkt",
    links: [
      { href: "/funktioner", label: "Alle funktioner" },
      { href: "/funktioner/boliganalyse", label: "Boliganalyse og bankrapport" },
      { href: "/funktioner/soegeagent", label: "Søgeagenter med AI" },
      { href: "/funktioner/pipeline", label: "Pipeline, kalender og bud" },
      { href: "/funktioner/dokumentgennemgang", label: "AI læser salgsopstillingen" },
      { href: "/udlejningsejendomme-til-salg", label: "Udlejningsejendomme til salg" },
      { href: "/deals", label: "Bedste boliger lige nu" },
      { href: "/beregn-husleje", label: "Beregn husleje" },
      { href: "/beregn-afkast", label: "Beregn afkast" },
      { href: "/udlejning-af-lejlighed", label: "Regler og skat ved udlejning" },
      { href: "/priser", label: "Priser" },
      { href: "/adgang", label: "Anmod om adgang" },
      { href: "/spil", label: "Ejendomsspillet" },
    ],
  },
  {
    title: "Ressourcer",
    links: [
      { href: "/blog", label: "Blog & guides" },
      { href: "/foraeldrekoeb", label: "Forældrekøb: regler og skat" },
      { href: "/saadan-byder-du-paa-en-bolig", label: "Sådan byder du på en bolig" },
      { href: "/salgsopstilling", label: "Sådan læser du en salgsopstilling" },
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

const b = site.business;
const businessLine = [
  b.legalName,
  b.cvr && `CVR ${b.cvr}`,
  b.address,
  b.country,
].filter(Boolean).join(" · ");

/*
 * Hallmark Ft4 · colophon (design.md): one dense block like the last page of a
 * printed analysis. Who publishes it, where the data comes from, then an index
 * of every page as inline lists (kept for navigation and internal links).
 * No logo column, no social row, no copyright tail.
 */
export function Footer() {
  return (
    <footer className="border-t-2 border-[var(--color-ink)] bg-[var(--color-paper)] px-4 py-10 sm:px-8 sm:py-14">
      <div className="mx-auto max-w-[1120px]">
        <div className="grid grid-cols-[minmax(0,1fr)] gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)] lg:gap-16">
          <div className="min-w-0 font-[family-name:var(--font-mono)] text-[12.5px] leading-[1.7] text-[var(--color-ink-2)] [overflow-wrap:anywhere]">
            <p><span className="font-[family-name:var(--font-display)] text-[17px] font-semibold text-[var(--color-ink)]">NordInvest</span></p>
            <p className="mt-2">Udgivet af {businessLine}. Kontakt {site.email}, {site.phone}.</p>
            <p className="mt-3">Data: Boligsiden, Ejendomstorvet, BBR og Ejendomsvurderingen via Datafordeler, Danmarks Statistik, Danmarks Nationalbank og Plandata.dk. Beregninger, ikke rådgivning.</p>
            <p className="mt-3"><CookieSettingsButton className="underline underline-offset-4 hover:text-[var(--color-ink)]" /></p>
          </div>
          <nav aria-label="Indeks" className="space-y-3 text-[14px] leading-[1.75] text-[var(--color-ink-2)]">
            {columns.map((col) => (
              <p key={col.title}>
                <span className="mr-2 font-semibold text-[var(--color-ink)]">{col.title}.</span>
                {col.links.map((l, i) => (
                  <span key={l.href}>
                    <Link href={l.href} className="hover:text-[var(--color-ink)] hover:underline hover:decoration-[var(--color-accent)] hover:underline-offset-4">{l.label}</Link>
                    {i < col.links.length - 1 && <span aria-hidden className="mx-1.5 text-[var(--color-rule)]">/</span>}{" "}
                  </span>
                ))}
              </p>
            ))}
          </nav>
        </div>
      </div>
    </footer>
  );
}
