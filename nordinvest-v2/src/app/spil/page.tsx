import type { Metadata } from "next";
import GameClient from "./GameClient";

// SEO strategy: dominate the untouched Danish "prisspil" search space.
// Target queries: "gæt boligprisen", "gæt ejendomsprisen", "ejendomsspil",
// "boligpris quiz", "gæt prisen bolig", "boligspil danmark".

const TITLE = "Gæt Boligprisen — Gratis prisspil på danske boliger | NordInvest";
const DESCRIPTION =
  "Gæt boligprisen på rigtige danske boliger fra Boligsiden. Multiplayer prisspil (2-8 spillere), gratis, ingen login. Vælg København, Aarhus, Odense, Aalborg eller hele Danmark. Tættest på vinder.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  keywords: [
    "gæt boligprisen",
    "gæt ejendomsprisen",
    "gæt prisen bolig",
    "boligpris quiz",
    "ejendomsspil",
    "boligspil",
    "danske boliger spil",
    "prisspil bolig",
    "multiplayer boligspil",
    "gæt hvad boligen koster",
    "boligsiden spil",
    "gæt kontantprisen",
  ],
  alternates: { canonical: "https://nordinvest.io/spil" },
  openGraph: {
    type: "website",
    url: "https://nordinvest.io/spil",
    title: TITLE,
    description: DESCRIPTION,
    siteName: "NordInvest",
    locale: "da_DK",
    images: [
      {
        url: "https://nordinvest.io/og/spil.png",
        width: 1200,
        height: 630,
        alt: "Gæt Boligprisen — dansk multiplayer prisspil",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
  },
  robots: { index: true, follow: true },
};

// JSON-LD: Game schema tells search engines this page is an actual playable
// game, and BreadcrumbList makes the SERP result show a NordInvest > Spil
// crumb path. Also emit a FAQPage block so long-tail queries land here.
const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Game",
      name: "Gæt Boligprisen",
      alternateName: ["Gæt Ejendomsprisen", "Boligpris Quiz", "Ejendomsspil"],
      description:
        "Multiplayer prisspil på rigtige danske boliger fra Boligsiden. 2-8 spillere, gratis, ingen login.",
      inLanguage: "da-DK",
      applicationCategory: "GameApplication",
      operatingSystem: "Web",
      url: "https://nordinvest.io/spil",
      genre: ["Trivia", "Property", "Real Estate", "Guessing Game"],
      numberOfPlayers: { "@type": "QuantitativeValue", minValue: 2, maxValue: 8 },
      audience: { "@type": "Audience", audienceType: "Danish property enthusiasts, home buyers, investors" },
      publisher: { "@type": "Organization", name: "NordInvest", url: "https://nordinvest.io" },
      offers: { "@type": "Offer", price: "0", priceCurrency: "DKK" },
    },
    {
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "NordInvest", item: "https://nordinvest.io" },
        { "@type": "ListItem", position: 2, name: "Gæt Boligprisen", item: "https://nordinvest.io/spil" },
      ],
    },
    {
      "@type": "FAQPage",
      mainEntity: [
        {
          "@type": "Question",
          name: "Hvordan spiller man gæt boligprisen?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Vælg 2-8 spillere, vælg område (hele Danmark eller en specifik by), og gæt kontantprisen på de boliger vi trækker fra Boligsiden. Tættest på vinder rundens bonus. Alle spillere får point ud fra hvor tæt de er på — ikke kun vinderen.",
          },
        },
        {
          "@type": "Question",
          name: "Er spillet gratis?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Ja, Gæt Boligprisen er 100 % gratis at spille. Der er ingen login og ingen data gemmes.",
          },
        },
        {
          "@type": "Question",
          name: "Hvor kommer boligerne fra?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Alle boliger er aktive, rigtige salgsopstillinger fra Boligsiden. Vi opdaterer løbende, så udbuddet altid afspejler det danske boligmarked.",
          },
        },
        {
          "@type": "Question",
          name: "Kan jeg vælge en bestemt by?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Ja — du kan vælge mellem hele Danmark, en landsdel (Sjælland, Fyn, Jylland) eller specifikke byer som København, Aarhus, Odense, Aalborg, Esbjerg, Vejle, Randers, Kolding og mange flere.",
          },
        },
      ],
    },
  ],
};

export default function SpilPage() {
  return (
    <>
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <GameClient />
    </>
  );
}
