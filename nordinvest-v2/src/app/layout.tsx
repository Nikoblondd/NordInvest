import type { Metadata } from "next";
import { IBM_Plex_Mono, IBM_Plex_Sans, Source_Serif_4 } from "next/font/google";
import "./globals.css";
import { Suspense } from "react";
import { AuthCodeHandler } from "@/components/auth/AuthCodeHandler";
import { Analytics } from "@vercel/analytics/react";
import { ConsentAnalytics } from "@/components/analytics/ConsentAnalytics";
import { site } from "@/lib/site";
import { LangScript } from "@/components/i18n/LangScript";
import { I18nRuntime } from "@/components/i18n/I18nRuntime";
import { NavProgress } from "@/components/NavProgress";

// Body face (design.md): IBM Plex Sans, a report-like sans with real tabular
// figures. Kept on the --font-inter variable so every existing use switches.
const inter = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-inter",
  display: "swap",
  // Not preloaded: the landing and the analyser set their text in Geist, and a
  // preloaded Inter (48 KB) competed with their LCP fonts. Pages in Inter paint
  // straight away in the size-matched fallback (adjustFontFallback) and swap.
  preload: false,
  adjustFontFallback: true,
  fallback: ["-apple-system", "system-ui", "sans-serif"],
});

// Display face for big numbers and chapter headings — gives the analyzer a
// voice of its own instead of Inter-everywhere. Not preloaded: it's used below
// the fold on most pages, so it shouldn't compete with the LCP font.
// Display face (design.md): Source Serif 4, the voice of a printed analysis
// or a financial paper rather than a startup template. Always roman.
const outfit = Source_Serif_4({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
  weight: ["500", "600", "700"],
  fallback: ["-apple-system", "system-ui", "sans-serif"],
});

// Footnotes, sources and the colophon.
const mono = IBM_Plex_Mono({ subsets: ["latin"], weight: ["400", "500"], variable: "--font-mono", display: "swap", preload: false });

export const metadata: Metadata = {
  metadataBase: new URL("https://nordinvest.io"),
  title: {
    default: "NordInvest · Analyse og system til danske ejendomsinvestorer",
    template: "%s · NordInvest",
  },
  description:
    "Analysér danske investeringsboliger på et minut: cashflow, afkast, rentestress og bankrapport. Søgeagenter, pipeline, kalender og bud i ét system. Adgang efter samtale.",
  openGraph: {
    type: "website",
    locale: "da_DK",
    siteName: "NordInvest",
  },
  twitter: { card: "summary_large_image" },
  // Every page is its own canonical unless it says otherwise ("./" resolves
  // to the page's own path against metadataBase).
  alternates: { canonical: "./" },
  // Large image previews and full snippets in Google, Bing and Copilot answers.
  robots: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1, "max-video-preview": -1 },
  // Bing Webmaster Tools ownership (set BING_SITE_VERIFICATION in Vercel to the
  // msvalidate.01 code, or import the site from Google Search Console instead).
  ...(process.env.BING_SITE_VERIFICATION
    ? { verification: { other: { "msvalidate.01": process.env.BING_SITE_VERIFICATION } } }
    : {}),
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const b = site.business;
  const orgJsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${site.url}/#organization`,
        name: "NordInvest",
        legalName: b.legalName,
        alternateName: ["Nordinvest", "Nord Invest", "nordinvest.io", "NordInvest ejendomsanalyse"],
        url: site.url,
        logo: `${site.url}/nordinvest-logo.png`,
        image: `${site.url}/nordinvest-logo.png`,
        email: site.email,
        telephone: site.phone,
        description:
          "NordInvest er et dansk analyseværktøj og system til private ejendomsinvestorer. Det regner boliger og erhvervsejendomme igennem (cashflow, afkast, DSCR, rentestress og bankrapport), holder øje med markedet med søgeagenter, læser salgsopstilling og referater med AI og samler fremvisninger, bank og bud i én pipeline. Adgang efter en personlig samtale.",
        slogan: "Se hvad boligen tjener, før du byder.",
        foundingDate: "2026",
        founders: [{ "@type": "Person", name: site.founder.name }],
        ...(b.cvr ? { vatID: `DK${b.cvr.replace(/\s/g, "")}`, taxID: b.cvr } : {}),
        address: {
          "@type": "PostalAddress",
          ...(b.address ? { streetAddress: b.address } : {}),
          addressCountry: "DK",
        },
        areaServed: "DK",
        knowsAbout: [
          "Ejendomsinvestering",
          "Udlejningsejendomme",
          "Afkast og cashflow",
          "Cap rate / nettoafkast",
          "BRRRR-strategi",
          "Boligmarkedet i Danmark",
          "Erhvervsejendomme",
          "Forældrekøb",
          "Renovering og videresalg af boliger",
          "Købsprocessen ved boligkøb i Danmark",
          "Salgsopstilling og tilstandsrapport",
        ],
        sameAs: [site.linkedin, "https://dk.trustpilot.com/review/nordinvest.io", `https://datacvr.virk.dk/enhed/virksomhed/${b.cvr}`],
        founder: { "@type": "Person", name: site.founder.name },
        contactPoint: {
          "@type": "ContactPoint",
          email: site.email,
          telephone: site.phone,
          contactType: "customer support",
          areaServed: "DK",
          availableLanguage: ["Danish", "English"],
        },
      },
      {
        "@type": "WebSite",
        "@id": `${site.url}/#website`,
        url: site.url,
        name: "NordInvest",
        alternateName: ["Nordinvest", "nordinvest.io"],
        inLanguage: "da-DK",
        publisher: { "@id": `${site.url}/#organization` },
        potentialAction: {
          "@type": "SearchAction",
          target: { "@type": "EntryPoint", urlTemplate: `${site.url}/blog?q={search_term_string}` },
          "query-input": "required name=search_term_string",
        },
      },
      {
        "@type": "SoftwareApplication",
        "@id": `${site.url}/#app`,
        name: "NordInvest",
        applicationCategory: "FinanceApplication",
        applicationSubCategory: "Real estate investment analysis",
        operatingSystem: "Web",
        url: `${site.url}/funktioner`,
        inLanguage: "da-DK",
        description:
          "Analyse- og arbejdsværktøj til danske ejendomsinvestorer. Regner enhver dansk bolig eller erhvervsejendom igennem på et minut (cashflow, kontantafkast, nettoafkast, DSCR, rentestress, 10-årsfremskrivning og investeringsscore), finder nye boliger med søgeagenter, læser salgsopstilling, tilstandsrapport og referater med AI og samler fremvisninger, bankmøder og bud i en pipeline med kalender. Til udlejning, forældrekøb, renovering og salg samt erhverv. Adgang efter en personlig samtale.",
        featureList: [
          "Boliganalyse med cashflow, afkast, DSCR og rentestress",
          "Bankrapport som PDF og regneark i Excel",
          "Deal-motor over hele det danske boligmarked og erhvervsmarked",
          "Søgeagenter med egne kriterier, tidspunkter og mails om nye boliger",
          "AI-vurdering af nye boliger og AI-gennemgang af salgsopstilling, tilstandsrapport og referater",
          "Pipeline (CRM) fra screening til køb med tjekliste for den danske købsproces",
          "Kalender med fremvisninger, bankmøder og svarfrister og påmindelse dagen før",
          "Budhistorik med modbud, svarfrist og dit maksimale bud",
          "Flip-analyse med renoveringsbudget og forældrekøbsberegning",
        ],
        publisher: { "@id": `${site.url}/#organization` },
      },
    ],
  };

  return (
    <html lang="da" className={`${inter.variable} ${outfit.variable} ${mono.variable}`} suppressHydrationWarning>
      <head>
        <LangScript />
      </head>
      <body>
        <I18nRuntime />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(orgJsonLd) }}
        />
        <Suspense fallback={null}>
          <AuthCodeHandler />
          <NavProgress />
        </Suspense>
        {children}
        {/* Vercel Web Analytics — cookieless, privacy-friendly, no consent banner. */}
        <Analytics />
        {/* Cookie consent + PostHog (full journeys) — only after the visitor accepts. */}
        <ConsentAnalytics />
      </body>
    </html>
  );
}
