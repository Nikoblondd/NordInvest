/**
 * Månedens deals — 3 residential + 3 erhverv, kurateret manuelt fra
 * Deal-motorens live top-liste. Refreshes hver kalender-måned; blog-post
 * for måneden citerer samme sæt.
 *
 * Kilde: Deal-motoren, sorteret på score, filtreret på positivt cashflow
 * (residential) og aktiv udbud (erhverv). Snapshot: 2026-09-22.
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
function analyzeFor(url: string, price: number, area?: number): string {
  const q = new URLSearchParams({ url, price: String(price) });
  if (area) q.set("area", String(area));
  return `/analyseren?${q.toString()}`;
}

export const FEATURED_MONTH_LABEL = "September 2026";

export const FEATURED_RESIDENTIAL: FeaturedDeal[] = [
  {
    address: "Solbjergvej 26",
    city: "Høng",
    zip: 4270,
    price: 2_595_000,
    area: 422,
    rooms: 10,
    yearBuilt: 1917,
    energy: "E",
    score: 94,
    yieldPct: 9.5,
    cashFlowMonth: 9_394,
    type: "villa",
    typeLabel: "Villa",
    image:
      "https://images.boligsiden.dk/images/case/8a34af0c-e5df-47e1-8697-f1c30bf7c5a6/600x600/3a5a9df8-6392-42da-ad68-3a4fac83c9e1.webp",
    sourceUrl: "https://www.edc.dk/sag/?sagsnr=44702738",
    analyzeUrl: analyzeFor("https://www.edc.dk/sag/?sagsnr=44702738", 2_595_000, 422),
    highlight: "9.400 kr/md i cashflow — 10 værelser giver plads til værelsesudlejning",
  },
  {
    address: "Ribe Landevej 373",
    city: "Vejle",
    zip: 7100,
    price: 1_695_000,
    area: 245,
    rooms: 6,
    yearBuilt: 1844,
    energy: "G",
    score: 94,
    yieldPct: 8.4,
    cashFlowMonth: 4_625,
    type: "villa",
    typeLabel: "Villa",
    image:
      "https://images.boligsiden.dk/images/case/0f4224fe-f53d-4dae-b62d-cc6d3bcc7c6b/600x600/b63f5b41-d14b-44bc-8cc2-96922268e718.webp",
    sourceUrl: "https://www.realmaeglerne.dk/301-redirect/?mgl=R701&sagsnr=701-6386",
    analyzeUrl: analyzeFor(
      "https://www.realmaeglerne.dk/301-redirect/?mgl=R701&sagsnr=701-6386",
      1_695_000,
      245,
    ),
    highlight: "245 m² for 1,7 mio. — energi G er renoveringsopside, ikke rødt flag",
  },
  {
    address: "Vesterbyvej 17",
    city: "Gredstedbro",
    zip: 6771,
    price: 748_000,
    area: 126,
    rooms: 5,
    yearBuilt: 1904,
    energy: "D",
    score: 90,
    yieldPct: 8.6,
    cashFlowMonth: 2_156,
    type: "villa",
    typeLabel: "Villa",
    image:
      "https://images.boligsiden.dk/images/case/e0497988-9fc9-48de-aa96-76dabbfbca04/600x600/bfae2ec5-354c-4419-9342-035f44e7ad87.webp",
    sourceUrl: "https://home.dk/sag/7120001046",
    analyzeUrl: analyzeFor("https://home.dk/sag/7120001046", 748_000, 126),
    highlight: "Sub-1 mio. entry — lav udbetaling gør cashflow lettere at ramme",
  },
];

export const FEATURED_COMMERCIAL: FeaturedDeal[] = [
  {
    address: "Theilgaards Alle 4",
    city: "Køge",
    zip: 4600,
    price: 44_100_000,
    area: 4805,
    score: 88,
    yieldPct: 7.3,
    type: "lager",
    typeLabel: "Lager / produktion",
    image:
      "https://i.ejendomstorvet.dk/b9/49/b94901402582ce38fa881fcee02139a47a47a8d5a016e41a99802808b08e84e7.jpg?class=listingimagebannermax",
    sourceUrl:
      "https://www.ejendomstorvet.dk/investering/oestsjaelland/koege/lager-produktion/baf97298-7e90-4018-8c98-6752428d8f5c",
    analyzeUrl: analyzeFor(
      "https://www.ejendomstorvet.dk/investering/oestsjaelland/koege/lager-produktion/baf97298-7e90-4018-8c98-6752428d8f5c",
      44_100_000,
      4805,
    ),
    highlight: "7,3 % afkast på Sjælland — Køge ligger midt i logistikkorridoren",
  },
  {
    address: "Glasvænget 9",
    city: "Vissenbjerg",
    zip: 5492,
    price: 24_850_000,
    area: 10032,
    score: 83,
    yieldPct: 8.6,
    type: "lager",
    typeLabel: "Lager / produktion",
    image:
      "https://i.ejendomstorvet.dk/6d/7a/6d7a1763f6d19fae9edb712ad5f4a0307b7613c69cae6cc947e8fff963b4f928.jpg?class=listingimagebannermax",
    sourceUrl:
      "https://www.ejendomstorvet.dk/investering/fyn/assens/lager-produktion/0cd3e159-20c9-4849-a3b0-40aae3b9abd0",
    analyzeUrl: analyzeFor(
      "https://www.ejendomstorvet.dk/investering/fyn/assens/lager-produktion/0cd3e159-20c9-4849-a3b0-40aae3b9abd0",
      24_850_000,
      10032,
    ),
    highlight: "8,6 % afkast på 10.000 m² — kvadratmeterprisen er halv af Sjælland",
  },
  {
    address: "Tørholmsvej 39",
    city: "Hjørring",
    zip: 9800,
    price: 1_875_000,
    area: 256,
    score: 77,
    yieldPct: 8.5,
    type: "boligudlejning",
    typeLabel: "Boligudlejning",
    image:
      "https://i.ejendomstorvet.dk/31/ec/31ec79ba48dfdb6d940e32fa1455b2aeba624b020cfadd82812e904de41bb1b7.jpg?class=listingimagebannermax",
    sourceUrl:
      "https://www.ejendomstorvet.dk/investering/nordjylland/hjoerring/boligudlejning/3a6856bf-24bd-4d6e-8d8c-c179097f0db5",
    analyzeUrl: analyzeFor(
      "https://www.ejendomstorvet.dk/investering/nordjylland/hjoerring/boligudlejning/3a6856bf-24bd-4d6e-8d8c-c179097f0db5",
      1_875_000,
      256,
    ),
    highlight: "1,88 mio. entry på boligudlejning — 8,5 % afkast i Nordjylland",
  },
];
