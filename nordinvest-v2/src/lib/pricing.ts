export type Tier = {
  id: "free" | "starter" | "plus" | "pro" | "unlimited";
  name: string;
  price: number; // DKK/md, 0 = gratis
  blurb: string;
  featured?: boolean;
  cta: { label: string; href: string };
  features: string[];
  stripePriceEnv?: string;
  stripeLink?: string; // Stripe Payment Link (paid tiers only)
  priceId?: string; // Stripe recurring Price id (price_…) — enables in-app plan upgrades
  /** Kept for existing subscribers and the webhook, but not offered anywhere. */
  hidden?: boolean;
  /** Yearly price in DKK and its Stripe Payment Link. The yearly toggle on
   * /priser only appears once every visible paid tier has an annualLink. */
  annualPrice?: number;
  annualLink?: string;
};

// Fill these with the Stripe Product ids (Products → the product → "prod_…").
// The change-plan API resolves each product's active recurring price at runtime.
// Once set, upgrading an existing subscriber happens in-app via the API (no new
// checkout); until then the upgrade button falls back to the Stripe portal.
export const PRODUCT_IDS: Record<string, string> = {
  starter: "prod_V8i0VpKnYkKbo0",
  plus: "prod_V9JVeqvDAj98po",
  pro: "prod_V9JWFAcqAgc6FG",
  unlimited: "prod_V9JXqQa0DjadCn",
};

// Prices per Nikolaj's written brief (129 / 200 / 350 / 500), analyses 3/10/15/25/∞.
// Cheapest paid tier (Starter) is the featured "Mest populære" — the one to sell.
export const tiers: Tier[] = [
  {
    id: "free",
    name: "Gratis",
    price: 0,
    blurb: "Se om den bolig, du kigger på, er en god handel.",
    cta: { label: "Opret gratis", href: "/auth/signup" },
    features: ["3 analyser om måneden", "Hele analysen: score, cashflow og risici", "Deal-motoren uden grænse", "Gem boliger og prisvagt"],
  },
  {
    id: "starter",
    name: "Starter",
    price: 129,
    blurb: "Find den bolig, der giver plus, og tag tallene med i banken.",
    annualPrice: 1_290,
    annualLink: "https://buy.stripe.com/fZu5kFaZqedW6zgbpebwk06",
    featured: true,
    cta: { label: "Køb Starter", href: "/priser" },
    stripePriceEnv: "STRIPE_PRICE_STARTER",
    stripeLink: "https://buy.stripe.com/6oU7sN8Rigm47Dkdxmbwk00",
    features: ["10 analyser om måneden", "Bankrapport til dit bankmøde", "Redigerbar Excel-model", "Alt fra Gratis"],
  },
  {
    id: "plus",
    name: "Plus",
    price: 200,
    blurb: "Når du regner på flere boliger om ugen.",
    hidden: true,
    cta: { label: "Køb Plus", href: "/priser" },
    stripePriceEnv: "STRIPE_PRICE_PLUS",
    stripeLink: "https://buy.stripe.com/eVq9AV7Ne2ve2j0bpebwk02",
    features: ["15 analyser om måneden", "Bankrapport og Excel", "Alt fra Gratis"],
  },
  {
    id: "pro",
    name: "Pro",
    price: 350,
    blurb: "Regn alt igennem, du overvejer, uden at tælle analyser.",
    annualPrice: 3_490,
    annualLink: "https://buy.stripe.com/cNi3cx8Rid9SbTA78Ybwk07",
    cta: { label: "Køb Pro", href: "/priser" },
    stripePriceEnv: "STRIPE_PRICE_PRO",
    stripeLink: "https://buy.stripe.com/cNieVf5F6edW8Ho3WMbwk03",
    features: ["Ubegrænsede analyser", "Bankrapport og Excel", "Prioriteret support", "Alt fra Starter"],
  },
  {
    id: "unlimited",
    name: "Ubegrænset",
    price: 500,
    blurb: "Til rådgivere og professionelle investorer.",
    hidden: true,
    cta: { label: "Køb Ubegrænset", href: "/priser" },
    stripePriceEnv: "STRIPE_PRICE_UNLIMITED",
    stripeLink: "https://buy.stripe.com/6oU14p1oQ8TC8Ho8d2bwk01",
    features: ["Ubegrænsede analyser", "Bankrapport og Excel", "Prioriteret support"],
  },
];

export const limits: Record<Tier["id"], number> = {
  free: 3,
  starter: 10,
  plus: 15,
  pro: 999999, // Pro is the unlimited plan since 2026-10 (was 25)
  unlimited: 999999,
};

/** The plans offered on /priser and in the app (hidden legacy tiers left out). */
export const offeredTiers = tiers.filter((t) => !t.hidden);

/** Yearly billing is offered only when every offered paid plan has a yearly link. */
export const annualReady = offeredTiers.filter((t) => t.price > 0).every((t) => !!t.annualLink && !!t.annualPrice);

export type Period = "month" | "year";

/** Kroner, with øre only when there are some: 129 → "129", 107.5 → "107,50". */
export const krFmt = (n: number) =>
  Number.isInteger(Math.round(n * 100) / 100)
    ? Math.round(n).toLocaleString("da-DK")
    : n.toLocaleString("da-DK", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** What a plan costs per month on yearly billing, and what the year saves. */
export const yearly = (t: Tier) =>
  t.annualPrice ? { perMonth: t.annualPrice / 12, total: t.annualPrice, saves: t.price * 12 - t.annualPrice } : null;

/** The biggest yearly saving among offered plans (for "spar op til …"). */
export const maxYearlySaving = Math.max(0, ...offeredTiers.map((t) => yearly(t)?.saves ?? 0));
