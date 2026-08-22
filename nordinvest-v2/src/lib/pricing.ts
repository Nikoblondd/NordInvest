export type Tier = {
  id: "free" | "starter" | "pro" | "unlimited";
  name: string;
  price: number; // DKK/md, 0 = gratis
  analyses: string;
  perAnalysis?: string;
  featured?: boolean;
  cta: { label: string; href: string };
  features: string[];
  // Stripe price env key (test mode). Filled by you in .env.local
  stripePriceEnv?: string;
};

export const tiers: Tier[] = [
  {
    id: "free",
    name: "Gratis",
    price: 0,
    analyses: "3 analyser om måneden",
    cta: { label: "Start gratis", href: "/auth/signup" },
    features: [
      "3 analyser/md.",
      "Fuld analyse-rapport",
      "Investment Score + dom",
      "Community support",
    ],
  },
  {
    id: "starter",
    name: "Starter",
    price: 129,
    analyses: "20 analyser om måneden",
    perAnalysis: "Kun 6,45 kr per analyse",
    featured: true,
    cta: { label: "Vælg Starter", href: "/priser" },
    stripePriceEnv: "STRIPE_PRICE_STARTER",
    features: [
      "20 analyser/md.",
      "Portefølje (uendelig gem)",
      "PDF-eksport",
      "Månedlig markedsrapport",
      "Email support",
    ],
  },
  {
    id: "pro",
    name: "Pro",
    price: 349,
    analyses: "40 analyser om måneden",
    perAnalysis: "8,73 kr per analyse",
    cta: { label: "Vælg Pro", href: "/priser" },
    stripePriceEnv: "STRIPE_PRICE_PRO",
    features: [
      "40 analyser/md.",
      "Alt fra Starter",
      "Custom, branded rapporter",
      "Team-adgang (op til 3)",
      "Prioritet support",
    ],
  },
  {
    id: "unlimited",
    name: "Ubegrænset",
    price: 799,
    analyses: "Uendelige analyser",
    perAnalysis: "For seriøse investorer og teams",
    cta: { label: "Kontakt salg", href: "/kontakt" },
    stripePriceEnv: "STRIPE_PRICE_UNLIMITED",
    features: [
      "Uendelige analyser",
      "Alt fra Pro",
      "Early access til nye features",
      "Personlig onboarding",
      "Direkte Slack-kanal",
    ],
  },
];

export const limits: Record<Tier["id"], number> = {
  free: 3,
  starter: 20,
  pro: 40,
  unlimited: 999999,
};
