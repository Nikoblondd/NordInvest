/**
 * Månedens deals — 3 residential + 3 erhverv, kurateret manuelt fra
 * Deal-motorens live top-liste. Refreshes hver kalender-måned; blog-post
 * for måneden citerer samme sæt.
 *
 * Kilde: Deal-motoren, sorteret på score, filtreret på positivt cashflow
 * (residential) og aktiv udbud (erhverv). Snapshot: 2026-10-01.
 */

export type FeaturedDeal = {
  address: string;
  city: string;
  zip: number;
  price: number;
  area: number;
  score: number;
  yieldPct: number;
  cashFlowMonth?: number;
  yearBuilt?: number;
  rooms?: number;
  energy?: string;
  type: string;
  typeLabel: string;
  image: string;
  sourceUrl: string;
  analyzeUrl: string;
  highlight: string;
};

/** URL to jump straight into the analyzer for a given deal. */
function analyzeFor(
  url: string,
  price: number,
  area?: number,
  opts?: { commercial?: boolean; yieldPct?: number; addr?: string; subcat?: string; extra?: Record<string, string | number> },
): string {
  const q = new URLSearchParams({ url, price: String(price) });
  if (area) q.set("area", String(area));
  if (opts?.addr) q.set("addr", opts.addr);
  // The Deal-motor's own inputs, so the analysis opens on the same numbers as the card.
  for (const [k, v] of Object.entries(opts?.extra ?? {})) q.set(k, String(v));
  if (opts?.commercial) {
    // Erhverv path — mirror the deal-motor's investment handoff so the
    // analyzer computes the right numbers. Without this, the analyzer treats
    // it as a bolig and defaults monthlyRent to 15.000 kr on a multi-million
    // warehouse → nonsense score and cashflow.
    q.set("market", "investering");
    q.set("downPaymentPct", "30");
    q.set("interestRate", "5");
    // Rent param IS the net NOI/12 (analyzer zeroes vacancy/opex when
    // market=investering, so no double-count).
    if (opts.yieldPct && opts.yieldPct > 0) {
      const monthlyNoi = Math.round((price * (opts.yieldPct / 100)) / 12);
      q.set("rent", String(monthlyNoi));
    }
    if (opts.subcat) q.set("subcat", opts.subcat);
  }
  return `/analyseren?${q.toString()}`;
}

export const FEATURED_MONTH_LABEL = "Oktober 2026";

const RES = (rent: number, opex: number, rooms: number, year: number) => ({ rent, opex, rooms, year, downPaymentPct: 20, interestRate: 5 });

export const FEATURED_RESIDENTIAL: FeaturedDeal[] = [
  {
    address: "Orenæs Skovvej 4",
    city: "Nørre Alslev",
    zip: 4840,
    price: 595_000,
    area: 182,
    rooms: 8,
    yearBuilt: 1867,
    energy: "F",
    score: 94,
    yieldPct: 15.6,
    cashFlowMonth: 5_175,
    type: "villa",
    typeLabel: "Villa",
    image:
      "https://images.boligsiden.dk/images/case/649ae1cf-2cf1-4540-b2cf-e2f6fd4ac72a/600x600/62597e9c-3dfa-4b4a-b009-471b58698656.webp",
    sourceUrl: "https://www.danbolig.dk?propertyid=2040001895&brokerid=204",
    analyzeUrl: analyzeFor("https://www.danbolig.dk?propertyid=2040001895&brokerid=204", 595_000, 182, {
      addr: "Orenæs Skovvej 4, 4840 Nørre Alslev",
      extra: RES(16_000, 6_350, 8, 1867),
    }),
    highlight: "182 m² for under 600.000 kr. Går i nul ved en leje på ca. 10.800 kr./md.",
  },
  {
    address: "Hovedgaden 13, 1.",
    city: "Bryrup",
    zip: 8654,
    price: 1_295_000,
    area: 249,
    rooms: 5,
    yearBuilt: 1896,
    energy: "B",
    score: 94,
    yieldPct: 9.8,
    cashFlowMonth: 5_011,
    type: "condo",
    typeLabel: "Ejerlejlighed",
    image:
      "https://images.boligsiden.dk/images/case/87ec2773-76ad-489b-8690-e09884709f18/600x600/93eaa2f2-a96b-4f17-9db1-94828df2a9d2.webp",
    sourceUrl: "https://www.realmaeglerne.dk/301-redirect/?mgl=R708&sagsnr=708-2717",
    analyzeUrl: analyzeFor("https://www.realmaeglerne.dk/301-redirect/?mgl=R708&sagsnr=708-2717", 1_295_000, 249, {
      addr: "Hovedgaden 13 1., 8654 Bryrup",
      extra: RES(21_900, 8_700, 5, 1896),
    }),
    highlight: "249 m² med energimærke B. Stor nok til at dele i to lejemål",
  },
  {
    address: "Tjærbyvej 183",
    city: "Randers NØ",
    zip: 8930,
    price: 575_000,
    area: 140,
    rooms: 5,
    yearBuilt: 1887,
    energy: "G",
    score: 94,
    yieldPct: 12.4,
    cashFlowMonth: 3_455,
    type: "villa",
    typeLabel: "Villa",
    image:
      "https://images.boligsiden.dk/images/case/9749fdac-f5f2-4e6e-a4a2-bbabc1010eb8/600x600/5ed107d7-9719-4d25-b2c8-435d5941ccb0.webp",
    sourceUrl: "https://www.edc.dk/sag/?sagsnr=85505968",
    analyzeUrl: analyzeFor("https://www.edc.dk/sag/?sagsnr=85505968", 575_000, 140, {
      addr: "Tjærbyvej 183, 8930 Randers NØ",
      extra: RES(12_300, 4_900, 5, 1887),
    }),
    highlight: "Randers, hvor 41 % af boligerne giver plus. Energi G kræver et renoveringsbudget",
  },
];

const ET = "https://www.ejendomstorvet.dk/investering";

export const FEATURED_COMMERCIAL: FeaturedDeal[] = [
  {
    address: "Ulvevej 25",
    city: "Havdrup",
    zip: 4622,
    price: 23_995_000,
    area: 5239,
    score: 92,
    yieldPct: 7.7,
    energy: "D",
    type: "lager",
    typeLabel: "Lager / produktion",
    image:
      "https://i.ejendomstorvet.dk/50/4c/504cec99319ab346ad828000f2c0a8333321c90518ba24feb821656d84d72564.jpg?class=listingimagebannermax",
    sourceUrl: `${ET}/oestsjaelland/solroed/lager-produktion/950bd6b5-dcb2-4aba-832f-d7c7fd1ea541`,
    analyzeUrl: analyzeFor(`${ET}/oestsjaelland/solroed/lager-produktion/950bd6b5-dcb2-4aba-832f-d7c7fd1ea541`, 23_995_000, 5239, {
      commercial: true,
      yieldPct: 7.67,
      addr: "Ulvevej 25, 4622 Havdrup",
      subcat: "Lager & produktion",
    }),
    highlight: "Månedens højeste score: 7,7 % afkast på 5.239 m² ved Køge Bugt",
  },
  {
    address: "Lundagervej 112",
    city: "Løsning",
    zip: 8723,
    price: 5_200_000,
    area: 1508,
    score: 88,
    yieldPct: 7.6,
    energy: "B",
    type: "lager",
    typeLabel: "Lager / produktion",
    image:
      "https://i.ejendomstorvet.dk/20/a9/20a9d93509341884d06ae2be988c129b61f7316192fa3f695cccf8f989d9cd86.jpg?class=listingimagebannermax",
    sourceUrl: `${ET}/oestjylland/hedensted/lager-produktion/74d910db-da32-499d-8970-ad2fcb2c624c`,
    analyzeUrl: analyzeFor(`${ET}/oestjylland/hedensted/lager-produktion/74d910db-da32-499d-8970-ad2fcb2c624c`, 5_200_000, 1508, {
      commercial: true,
      yieldPct: 7.59,
      addr: "Lundagervej 112, 8723 Løsning",
      subcat: "Lager & produktion",
    }),
    highlight: "5,2 mio. for 1.508 m² med energimærke B, tæt på E45",
  },
  {
    address: "Lyngvejen 1A",
    city: "Ugerløse",
    zip: 4350,
    price: 3_300_000,
    area: 937,
    score: 77,
    yieldPct: 11.0,
    energy: "C",
    type: "boligudlejning",
    typeLabel: "Boligudlejning",
    image:
      "https://i.ejendomstorvet.dk/f9/4c/f94cb8238b2849121e9fd615ace807e80c8f88d41f8900006c2330279c44af2c.jpg?class=listingimagebannermax",
    sourceUrl: `${ET}/vest--og-sydsjaelland/holbaek/boligudlejning/1f3aba95-4867-4b20-bfaf-c26e43140c80`,
    analyzeUrl: analyzeFor(`${ET}/vest--og-sydsjaelland/holbaek/boligudlejning/1f3aba95-4867-4b20-bfaf-c26e43140c80`, 3_300_000, 937, {
      commercial: true,
      yieldPct: 10.99,
      addr: "Lyngvejen 1A, 4350 Ugerløse",
      subcat: "Boligudlejning",
    }),
    highlight: "Boligudlejning med 11 % afkast for 3,3 mio. ved Holbæk",
  },
];
