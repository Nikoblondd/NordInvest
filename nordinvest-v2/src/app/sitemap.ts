import type { MetadataRoute } from "next";
import { getAllPosts } from "@/lib/blog";
import { CITIES } from "@/lib/cities";
import { ALL_DEAL_CITIES as DEAL_CITIES } from "@/lib/deal-cities";
import { getFeatureExtras } from "@/lib/blog-feature";
import { TERMS } from "@/lib/terms";
import { FEATURES } from "@/lib/features";
import { GUIDES } from "@/lib/guides";

const BASE = "https://nordinvest.io";
// When the static pages last changed. Bump it when their content changes; a
// lastmod that is always "now" teaches search engines to ignore it.
const STATIC_UPDATED = new Date("2026-10-14");

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  const staticPages: { path: string; priority: number; freq: MetadataRoute.Sitemap[number]["changeFrequency"] }[] = [
    { path: "/", priority: 1.0, freq: "weekly" },
    { path: "/analyseren", priority: 0.9, freq: "weekly" },
    { path: "/analyseren/start", priority: 0.9, freq: "weekly" },
    { path: "/analyse-af-ejendomsinvestering", priority: 0.95, freq: "monthly" },
    { path: "/deals", priority: 0.9, freq: "daily" },
    { path: "/udlejerindeks", priority: 0.8, freq: "daily" },
    { path: "/adgang", priority: 0.9, freq: "monthly" },
    { path: "/priser", priority: 0.8, freq: "monthly" },
    { path: "/methodology", priority: 0.7, freq: "monthly" },
    { path: "/investment-models", priority: 0.7, freq: "monthly" },
    { path: "/glossary", priority: 0.7, freq: "monthly" },
    { path: "/data", priority: 0.6, freq: "monthly" },
    { path: "/beregn-husleje", priority: 0.8, freq: "monthly" },
    { path: "/beregn-afkast", priority: 0.8, freq: "monthly" },
    { path: "/ordbog", priority: 0.6, freq: "monthly" },
    { path: "/udlejning-af-lejlighed", priority: 0.8, freq: "monthly" },
    ...TERMS.map((t) => ({ path: `/ordbog/${t.slug}`, priority: 0.6, freq: "monthly" as const })),
    { path: "/om", priority: 0.5, freq: "monthly" },
    { path: "/presse", priority: 0.6, freq: "daily" },
    { path: "/widget", priority: 0.5, freq: "weekly" },
    { path: "/kontakt", priority: 0.5, freq: "monthly" },
    { path: "/blog", priority: 0.8, freq: "weekly" },
    { path: "/spil", priority: 0.9, freq: "weekly" },
    { path: "/juridisk", priority: 0.3, freq: "yearly" },
    { path: "/juridisk/fortrydelsesret", priority: 0.3, freq: "yearly" },
    { path: "/juridisk/privatlivspolitik", priority: 0.3, freq: "yearly" },
    { path: "/juridisk/vilkaar", priority: 0.3, freq: "yearly" },
    { path: "/juridisk/cookies", priority: 0.3, freq: "yearly" },
  ];

  const staticEntries: MetadataRoute.Sitemap = staticPages.map((p) => ({
    url: `${BASE}${p.path}`,
    // The Deal-motor rankings are rebuilt every 6 hours; everything else is static.
    lastModified: p.path === "/deals" || p.path === "/udlejerindeks" ? now : STATIC_UPDATED,
    changeFrequency: p.freq,
    priority: p.priority,
  }));

  // The platform pages added with the closed platform (October 2026).
  const PLATFORM_UPDATED = new Date("2026-10-14");
  const platformEntries: MetadataRoute.Sitemap = [
    { url: `${BASE}/funktioner`, lastModified: PLATFORM_UPDATED, changeFrequency: "monthly", priority: 0.9 },
    ...FEATURES.map((f) => ({ url: `${BASE}/funktioner/${f.slug}`, lastModified: PLATFORM_UPDATED, changeFrequency: "monthly" as const, priority: 0.85 })),
    ...GUIDES.map((g) => ({ url: `${BASE}${g.path}`, lastModified: new Date(g.updated), changeFrequency: "monthly" as const, priority: 0.85 })),
    { url: `${BASE}/udlejningsejendomme-til-salg`, lastModified: now, changeFrequency: "daily", priority: 0.85 },
  ];

  const cityEntries: MetadataRoute.Sitemap = CITIES.map((c) => ({
    url: `${BASE}/investering-i-ejendom-${c.slug}`,
    lastModified: STATIC_UPDATED,
    changeFrequency: "monthly",
    priority: 0.8,
  }));

  const postEntries: MetadataRoute.Sitemap = getAllPosts().map((p) => ({
    url: `${BASE}/blog/${p.slug}`,
    lastModified: new Date(getFeatureExtras(p.slug)?.updated ?? p.date ?? STATIC_UPDATED),
    changeFrequency: "monthly",
    priority: 0.6,
  }));

  const dealCityEntries: MetadataRoute.Sitemap = DEAL_CITIES.map((c) => ({
    url: `${BASE}/deals/${c.slug}`,
    lastModified: now,
    changeFrequency: "daily",
    priority: 0.8,
  }));

  return [...staticEntries, ...platformEntries, ...dealCityEntries, ...cityEntries, ...postEntries];
}
