import type { MetadataRoute } from "next";
import { getAllPosts } from "@/lib/blog";
import { CITIES } from "@/lib/cities";

const BASE = "https://nordinvest.io";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  const staticPages: { path: string; priority: number; freq: MetadataRoute.Sitemap[number]["changeFrequency"] }[] = [
    { path: "/", priority: 1.0, freq: "weekly" },
    { path: "/analyseren", priority: 0.9, freq: "weekly" },
    { path: "/deals", priority: 0.9, freq: "daily" },
    { path: "/priser", priority: 0.8, freq: "monthly" },
    { path: "/methodology", priority: 0.7, freq: "monthly" },
    { path: "/investment-models", priority: 0.7, freq: "monthly" },
    { path: "/glossary", priority: 0.7, freq: "monthly" },
    { path: "/om", priority: 0.5, freq: "monthly" },
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
    lastModified: now,
    changeFrequency: p.freq,
    priority: p.priority,
  }));

  const cityEntries: MetadataRoute.Sitemap = CITIES.map((c) => ({
    url: `${BASE}/investering-i-ejendom-${c.slug}`,
    lastModified: now,
    changeFrequency: "monthly",
    priority: 0.8,
  }));

  const postEntries: MetadataRoute.Sitemap = getAllPosts().map((p) => ({
    url: `${BASE}/blog/${p.slug}`,
    lastModified: p.date ? new Date(p.date) : now,
    changeFrequency: "monthly",
    priority: 0.6,
  }));

  return [...staticEntries, ...cityEntries, ...postEntries];
}
