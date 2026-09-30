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
    blurb: "Til dine første boliger.",
    cta: { label: "Opret gratis", href: "/auth/signup" },
    features: ["3 analyser om måneden", "Hele analysen: score, cashflow og risici", "Deal-motoren uden grænse", "Gem boliger og prisvagt"],
  },
  {
    id: "starter",
    name: "Starter",
    price: 129,
    blurb: "Når du leder aktivt efter din næste bolig.",
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
    cta: { label: "Køb Plus", href: "/priser" },
    stripePriceEnv: "STRIPE_PRICE_PLUS",
    stripeLink: "https://buy.stripe.com/eVq9AV7Ne2ve2j0bpebwk02",
    features: ["15 analyser om måneden", "Bankrapport og Excel", "Alt fra Gratis"],
  },
  {
    id: "pro",
    name: "Pro",
    price: 350,
    blurb: "Når du screener markedet dagligt.",
    cta: { label: "Køb Pro", href: "/priser" },
    stripePriceEnv: "STRIPE_PRICE_PRO",
    stripeLink: "https://buy.stripe.com/cNieVf5F6edW8Ho3WMbwk03",
    features: ["25 analyser om måneden", "Bankrapport og Excel", "Prioriteret support"],
  },
  {
    id: "unlimited",
    name: "Ubegrænset",
    price: 500,
    blurb: "Til rådgivere og professionelle investorer.",
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
  pro: 25,
  unlimited: 999999,
};
