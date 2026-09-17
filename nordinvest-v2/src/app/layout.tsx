import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Suspense } from "react";
import { AuthCodeHandler } from "@/components/auth/AuthCodeHandler";
import { Analytics } from "@vercel/analytics/react";
import { ConsentAnalytics } from "@/components/analytics/ConsentAnalytics";
import { site } from "@/lib/site";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
  // Preloading the font on the critical path removes the FOIT/FOUT flash on
  // the LCP element. adjustFontFallback prevents CLS during the swap.
  preload: true,
  adjustFontFallback: true,
  fallback: ["-apple-system", "system-ui", "sans-serif"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://nordinvest.io"),
  title: {
    default: "NordInvest — Analyser ejendomsinvesteringer på under 60 sekunder",
    template: "%s · NordInvest",
  },
  description:
    "Analyser danske ejendomsinvesteringer på under 60 sekunder. Få cashflow, afkast og rentestress-test — indsæt et link fra en dansk boligside og få en klar dom.",
  openGraph: {
    type: "website",
    locale: "da_DK",
    siteName: "NordInvest",
  },
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
        alternateName: ["NordInvest.io", "NordInvest ejendomsanalyse"],
        url: site.url,
        logo: `${site.url}/nordinvest-logo.png`,
        image: `${site.url}/nordinvest-logo.png`,
        email: site.email,
        telephone: site.phone,
        description:
          "NordInvest er et dansk, gratis analyseværktøj til ejendomsinvestering i Norden — cashflow, afkast, ROI, DSCR og rentestress-test på under 60 sekunder.",
        slogan: "Analyser ejendomsinvesteringer på under 60 sekunder.",
        foundingDate: "2026",
        founders: [{ "@type": "Person", name: site.founder.name }],
        ...(b.cvr ? { vatID: `DK${b.cvr.replace(/\s/g, "")}`, taxID: b.cvr } : {}),
        address: {
          "@type": "PostalAddress",
          ...(b.address ? { streetAddress: b.address } : {}),
          addressCountry: "DK",
        },
        areaServed: ["DK", "SE", "NO"],
        knowsAbout: [
          "Ejendomsinvestering",
          "Udlejningsejendomme",
          "Afkast og cashflow",
          "Cap rate / nettoafkast",
          "BRRRR-strategi",
          "Boligmarkedet i Danmark",
          "Erhvervsejendomme",
        ],
        sameAs: [site.linkedin, "https://dk.trustpilot.com/review/nordinvest.io"],
        founder: { "@type": "Person", name: site.founder.name },
        contactPoint: {
          "@type": "ContactPoint",
          email: site.email,
          telephone: site.phone,
          contactType: "customer support",
          areaServed: ["DK", "SE", "NO"],
          availableLanguage: ["Danish", "English"],
        },
      },
      {
        "@type": "WebSite",
        "@id": `${site.url}/#website`,
        url: site.url,
        name: "NordInvest",
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
        url: `${site.url}/analyseren`,
        inLanguage: "da-DK",
        description:
          "Analysér enhver dansk ejendom på under 60 sekunder: cashflow, kontantafkast, nettoafkast (cap rate), DSCR, rentestress-test og en objektiv investerings-score. Dækker boliger og erhvervs-/investeringsejendomme med en deal-motor over hele markedet.",
        featureList: [
          "Cashflow- og afkastberegning",
          "DSCR og rentestress-test",
          "Investerings-score",
          "Deal-motor over hele det danske marked",
          "AI-analytiker og bankrapport",
        ],
        offers: {
          "@type": "Offer",
          price: "0",
          priceCurrency: "DKK",
          description: "Gratis at bruge; betalte planer giver flere analyser og funktioner.",
        },
        publisher: { "@id": `${site.url}/#organization` },
      },
    ],
  };

  return (
    <html lang="da" className={inter.variable}>
      <body>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(orgJsonLd) }}
        />
        <Suspense fallback={null}>
          <AuthCodeHandler />
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
