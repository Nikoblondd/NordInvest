import Link from "next/link";

const cols = [
  {
    title: "Produkt",
    links: [
      { href: "/analyseren", label: "Analyseren" },
      { href: "/priser", label: "Priser" },
      { href: "/vaerktoejer", label: "Værktøjer" },
      { href: "/blog", label: "Blog" },
    ],
  },
  {
    title: "Firma",
    links: [
      { href: "/om", label: "Om os" },
      { href: "/kontakt", label: "Kontakt" },
      { href: "/for-investors", label: "For investors" },
    ],
  },
  {
    title: "Juridisk",
    links: [
      { href: "/juridisk/privatlivspolitik", label: "Privatlivspolitik" },
      { href: "/juridisk/vilkaar", label: "Vilkår" },
      { href: "/juridisk/cookies", label: "Cookies" },
    ],
  },
];

export function Footer() {
  return (
    <footer className="grain bg-navy-900 text-cream-100">
      <div className="container-x grid gap-12 py-16 md:grid-cols-4">
        <div className="max-w-xs">
          <div className="font-serif text-xl">NordInvest</div>
          <p className="mt-3 text-sm text-cream-100/70">
            Data-drevne beslutninger for danske ejendomsinvestorer.
          </p>
          <p className="mt-6 text-xs text-cream-100/50">
            © {new Date().getFullYear()} NordInvest
          </p>
        </div>
        {cols.map((c) => (
          <div key={c.title}>
            <div className="micro text-gold-400">{c.title}</div>
            <ul className="mt-4 space-y-3">
              {c.links.map((l) => (
                <li key={l.href}>
                  <Link
                    href={l.href}
                    className="text-sm text-cream-100/80 transition-colors hover:text-cream-100"
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-white/10">
        <div className="container-x py-5 text-xs text-cream-100/50">
          🇩🇰 Bygget i Danmark.
        </div>
      </div>
    </footer>
  );
}
