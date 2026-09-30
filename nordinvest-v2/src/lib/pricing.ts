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
    blurb: "Til at snuse til platformen.",
    cta: { label: "Opret gratis", href: "/auth/signup" },
    features: ["3 gratis analyser om måneden", "Basal cashflow-beregning"],
  },
  {
    id: "starter",
    name: "Starter",
    price: 129,
    blurb: "For dig der vil i gang med at investere.",
    featured: true,
    cta: { label: "Køb Starter", href: "/priser" },
    stripePriceEnv: "STRIPE_PRICE_STARTER",
    stripeLink: "https://buy.stripe.com/6oU7sN8Rigm47Dkdxmbwk00",
    features: ["10 ejendomsanalyser", "Avanceret rentestress-test", "Gemte cases"],
  },
  {
    id: "plus",
    name: "Plus",
    price: 200,
    blurb: "Til den aktive investor.",
    cta: { label: "Køb Plus", href: "/priser" },
    stripePriceEnv: "STRIPE_PRICE_PLUS",
    stripeLink: "https://buy.stripe.com/eVq9AV7Ne2ve2j0bpebwk02",
    features: ["15 ejendomsanalyser", "Fuld adgang til alle features"],
  },
  {
    id: "pro",
    name: "Pro",
    price: 350,
    blurb: "For dig der screener markedet dagligt.",
    cta: { label: "Køb Pro", href: "/priser" },
    stripePriceEnv: "STRIPE_PRICE_PRO",
    stripeLink: "https://buy.stripe.com/cNieVf5F6edW8Ho3WMbwk03",
    features: ["25 ejendomsanalyser", "Prioriteret support"],
  },
  {
    id: "unlimited",
    name: "Ubegrænset",
    price: 500,
    blurb: "Den ultimative løsning til professionelle.",
    cta: { label: "Køb Ubegrænset", href: "/priser" },
    stripePriceEnv: "STRIPE_PRICE_UNLIMITED",
    stripeLink: "https://buy.stripe.com/6oU14p1oQ8TC8Ho8d2bwk01",
    features: ["Ubegrænset analyser", "Ingen begrænsninger"],
  },
];

export const limits: Record<Tier["id"], number> = {
  free: 3,
  starter: 10,
  plus: 15,
  pro: 25,
  unlimited: 999999,
};
