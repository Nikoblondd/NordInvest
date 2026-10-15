import type { MetadataRoute } from "next";

// We explicitly WELCOME the major AI/LLM crawlers (GEO): being cited by
// ChatGPT, Claude, Gemini and Perplexity is a goal, so these bots get the same
// access as search engines. Only private/app routes are disallowed.
const AI_BOTS = [
  "GPTBot", "OAI-SearchBot", "ChatGPT-User", // OpenAI / ChatGPT
  "ClaudeBot", "Claude-Web", "anthropic-ai", "Claude-SearchBot", // Anthropic / Claude
  "Google-Extended", // Gemini / Google AI
  "PerplexityBot", "Perplexity-User", // Perplexity
  "Applebot-Extended", "Amazonbot", "Bytespider", "CCBot", "cohere-ai", // others
];

const DISALLOW = ["/app", "/maegler", "/dashboard", "/konto", "/mappe", "/rapport", "/abonnement", "/udkast", "/velkommen", "/auth/", "/api/"];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: "*", allow: "/", disallow: DISALLOW },
      ...AI_BOTS.map((userAgent) => ({ userAgent, allow: "/", disallow: DISALLOW })),
    ],
    sitemap: "https://nordinvest.io/sitemap.xml",
    host: "https://nordinvest.io",
  };
}
