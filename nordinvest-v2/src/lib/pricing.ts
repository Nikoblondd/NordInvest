export type Tier = {
  id: "free" | "starter" | "plus" | "pro" | "unlimited";
  name: string;
  price: number; // DKK/md, 0 = gratis
  blurb: string;
  featured?: boolean;
  cta: { label: string; href: string };
  features: string[];
  stripePriceEnv?: string;
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
    features: ["10 ejendomsanalyser", "Avanceret rentestress-test", "Gemte cases"],
  },
  {
    id: "plus",
    name: "Plus",
    price: 200,
    blurb: "Til den aktive investor.",
    cta: { label: "Køb Plus", href: "/priser" },
    stripePriceEnv: "STRIPE_PRICE_PLUS",
    features: ["15 ejendomsanalyser", "Fuld adgang til alle features"],
  },
  {
    id: "pro",
    name: "Pro",
    price: 350,
    blurb: "For dig der screener markedet dagligt.",
    cta: { label: "Køb Pro", href: "/priser" },
    stripePriceEnv: "STRIPE_PRICE_PRO",
    features: ["25 ejendomsanalyser", "Prioriteret support"],
  },
  {
    id: "unlimited",
    name: "Ubegrænset",
    price: 500,
    blurb: "Den ultimative løsning til professionelle.",
    cta: { label: "Køb Ubegrænset", href: "/priser" },
    stripePriceEnv: "STRIPE_PRICE_UNLIMITED",
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
