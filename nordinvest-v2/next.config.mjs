/** @type {import('next').NextConfig} */
const nextConfig = {
  // Every kilobyte of response header is another kilobyte competing with TTFB.
  poweredByHeader: false,
  compress: true,

  // Automatic image optimization: AVIF-first, WebP fallback, plus remote hosts
  // for property photos scraped from portals. `deviceSizes` trimmed to what we
  // actually render so we don't ship huge unused presets in <link imagesrcset>.
  images: {
    formats: ["image/avif", "image/webp"],
    deviceSizes: [360, 640, 828, 1080, 1200, 1920],
    imageSizes: [64, 96, 160, 256, 384],
    minimumCacheTTL: 60 * 60 * 24 * 30, // 30 days
    remotePatterns: [
      { protocol: "https", hostname: "**.boligsiden.dk" },
      { protocol: "https", hostname: "**.edc.dk" },
      { protocol: "https", hostname: "**.home.dk" },
      { protocol: "https", hostname: "**.danbolig.dk" },
      { protocol: "https", hostname: "**.nybolig.dk" },
      { protocol: "https", hostname: "**.estate.dk" },
      { protocol: "https", hostname: "**.ejendomstorvet.dk" },
      { protocol: "https", hostname: "media.boligsiden.dk" },
      { protocol: "https", hostname: "media.danbolig.dk" },
      { protocol: "https", hostname: "storage.googleapis.com" },
      { protocol: "https", hostname: "images.unsplash.com" },
    ],
  },

  // Remove unused Tailwind/CSS-in-JS classes at build time — first load JS
  // shrinks, LCP paint is smaller. Safe with our static Tailwind config.
  experimental: {
    optimizeCss: true,
    // Only tree-shake the icon set we actually use; lucide-react ships every
    // icon as its own module and this cuts the analyzer chunk noticeably.
    optimizePackageImports: ["lucide-react", "framer-motion", "recharts"],
  },

  // The Deal-motor pages are rendered on the server (fresh market data), which
  // costs a function run per request. Let Vercel's edge keep each page for an
  // hour and serve a stale copy while it refreshes, so bots and visitors hit
  // the cache instead of the function. The data itself only changes every 6 h.
  async headers() {
    const edge = [{ key: "Vercel-CDN-Cache-Control", value: "max-age=3600, stale-while-revalidate=86400" }];
    return ["/deals", "/deals/:by", "/om", "/presse", "/beregn-afkast", "/embed/deals/:by", "/udlejerindeks"].map((source) => ({ source, headers: edge }));
  },

  async redirects() {
    return [
      // --- URL-structure changes (301, preserve link equity) ---
      { source: "/privatlivspolitik", destination: "/juridisk/privatlivspolitik", permanent: true },
      { source: "/vilkaar", destination: "/juridisk/vilkaar", permanent: true },
      { source: "/juridisk.html", destination: "/juridisk", permanent: true },

      // --- Guessable tool URLs → the public pages (the tools themselves are closed) ---
      { source: "/deal-motor", destination: "/deals", permanent: true },
      { source: "/deal-motoren", destination: "/deals", permanent: true },
      { source: "/dealmotor", destination: "/deals", permanent: true },
      { source: "/dealmotoren", destination: "/deals", permanent: true },
      { source: "/analyser", destination: "/analyseren", permanent: true },
      { source: "/analyse", destination: "/analyseren", permanent: true },
      { source: "/analyzer", destination: "/analyseren", permanent: true },
      { source: "/mine-ejendomme", destination: "/adgang", permanent: false },
      { source: "/signup", destination: "/adgang", permanent: false },
      { source: "/auth/signup", destination: "/adgang", permanent: false },
      // Mine ejendomme moved into the app.
      { source: "/dashboard", destination: "/app", permanent: false },
      { source: "/app/opgaver", destination: "/app/kalender?visning=liste", permanent: false },
      { source: "/mappe/:id", destination: "/app/ejendomme/:id", permanent: false },
      { source: "/velkommen", destination: "/app/velkommen", permanent: false },
      { source: "/opret", destination: "/adgang", permanent: false },

      // --- Deliberately removed sections → closest equivalent ---
      { source: "/vaerktoejer", destination: "/analyseren", permanent: true },
      { source: "/vaerktoejer/:tool*", destination: "/analyseren", permanent: true },
      { source: "/portfolio", destination: "/app", permanent: true },
      { source: "/portfolio.html", destination: "/app", permanent: true },
      { source: "/brand", destination: "/om", permanent: true },
      { source: "/brand.html", destination: "/om", permanent: true },
      { source: "/boligsiden-investering-guide", destination: "/analyseren", permanent: true },
      { source: "/boligsiden-investering-guide.html", destination: "/analyseren", permanent: true },
      { source: "/investere-i-ejendom-danmark-2026", destination: "/blog/ejendomsinvestering", permanent: true },
      { source: "/investere-i-ejendom-danmark-2026.html", destination: "/blog/ejendomsinvestering", permanent: true },

      // --- Old .html of pages we rebuild at clean URLs ---
      { source: "/methodology.html", destination: "/methodology", permanent: true },
      { source: "/glossary.html", destination: "/glossary", permanent: true },
      { source: "/investment-models.html", destination: "/investment-models", permanent: true },
      { source: "/investering-i-ejendom-koebenhavn.html", destination: "/investering-i-ejendom-koebenhavn", permanent: true },
      { source: "/investering-i-ejendom-aarhus.html", destination: "/investering-i-ejendom-aarhus", permanent: true },
      { source: "/investering-i-ejendom-fyn.html", destination: "/investering-i-ejendom-fyn", permanent: true },
      { source: "/investering-i-ejendom-stockholm.html", destination: "/investering-i-ejendom-stockholm", permanent: true },
      { source: "/investering-i-ejendom-oslo.html", destination: "/investering-i-ejendom-oslo", permanent: true },

      // --- Legacy English city URLs (kept from the old site) ---
      { source: "/property-investment-copenhagen", destination: "/investering-i-ejendom-koebenhavn", permanent: true },
      { source: "/property-investment-copenhagen.html", destination: "/investering-i-ejendom-koebenhavn", permanent: true },
      { source: "/property-investment-stockholm", destination: "/investering-i-ejendom-stockholm", permanent: true },
      { source: "/property-investment-stockholm.html", destination: "/investering-i-ejendom-stockholm", permanent: true },
      { source: "/property-investment-oslo", destination: "/investering-i-ejendom-oslo", permanent: true },
      { source: "/property-investment-oslo.html", destination: "/investering-i-ejendom-oslo", permanent: true },
      { source: "/property-investment-aarhus", destination: "/investering-i-ejendom-aarhus", permanent: true },
      { source: "/property-investment-aarhus.html", destination: "/investering-i-ejendom-aarhus", permanent: true },
      { source: "/property-investment-fyn", destination: "/investering-i-ejendom-fyn", permanent: true },
      { source: "/property-investment-fyn.html", destination: "/investering-i-ejendom-fyn", permanent: true },
    ];
  },
};

export default nextConfig;
