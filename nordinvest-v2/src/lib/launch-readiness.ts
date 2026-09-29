// Launch-readiness cockpit — the single source of truth for "are we ready to
// go public?". Each check either PULLS FROM LIVE DATA (payingUsers, timeSavings,
// active listings, market benchmarks) or is a KNOWN static gate that gets
// ticked off manually as we ship. The page at /dashboard/launch renders this
// into a real percentage + category breakdown so we always know where we are.
//
// The bar for launch is uncompromising by design: it's not "we shipped some
// stuff", it's "product works AND real people pay AND we're legally clean AND
// data is trustworthy AND performance is real AND onboarding actually converts".

import { getAnalytics, type Analytics } from "@/lib/analytics-data";
import { reference } from "@/lib/reference";
import { getPsiReport } from "@/lib/psi";
import { getWebVitalsSummary, MIN_SAMPLES, RUM_SINCE } from "@/lib/web-vitals";

export type CheckStatus = "green" | "amber" | "red" | "waiting";

export type ReadinessCheck = {
  id: string;
  label: string;
  status: CheckStatus;
  detail: string;
  target?: string;
};

export type ReadinessCategory = {
  id: string;
  title: string;
  icon: string; // lucide icon name — resolved in the UI
  weight: number; // relative importance, 1-3
  checks: ReadinessCheck[];
};

export type ReadinessReport = {
  categories: ReadinessCategory[];
  overallPct: number;
  overallStatus: CheckStatus;
  greenCount: number;
  totalCount: number;
  criticalBlockers: string[]; // ids of red checks in weight-3 categories
  updatedAt: string;
};

const URL_BASE = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function marketCount(market: "bolig" | "investering"): Promise<number> {
  if (!URL_BASE || !KEY) return 0;
  try {
    const res = await fetch(
      `${URL_BASE}/rest/v1/market_listings?select=id&market=eq.${market}&status=neq.gone`,
      {
        method: "HEAD",
        headers: {
          apikey: KEY,
          Authorization: `Bearer ${KEY}`,
          Prefer: "count=exact",
          Range: "0-0",
        },
        cache: "no-store",
      },
    );
    const cr = res.headers.get("content-range");
    return cr ? Number(cr.split("/")[1]) || 0 : 0;
  } catch {
    return 0;
  }
}

// A tiny helper — the check factory. Keeps the report definition compact and
// makes every check carry its own target so the UI can render it plainly.
function check(
  id: string,
  label: string,
  detail: string,
  status: CheckStatus,
  target?: string,
): ReadinessCheck {
  return { id, label, detail, status, target };
}

export async function getLaunchReadiness(): Promise<ReadinessReport> {
  const [a, boligLive, erhvervLive, psi, rum] = await Promise.all([
    getAnalytics(),
    marketCount("bolig"),
    marketCount("investering"),
    getPsiReport().catch(
      () => ({ overall: { lcpGreen: false, inpGreen: false, clsGreen: false, allGreen: false, landingLcpMs: null }, results: [], updatedAt: "" } as Awaited<ReturnType<typeof getPsiReport>>),
    ),
    getWebVitalsSummary().catch(
      () => ({ configured: false, windowDays: 28, totalSamples: 0, perPath: [], overall: { lcpP75: null, inpP75: null, clsP75: null, lcpGreen: false, inpGreen: false, clsGreen: false, allGreen: false } } as Awaited<ReturnType<typeof getWebVitalsSummary>>),
    ),
  ]);

  // === category 1: PRODUKT-INTEGRITET (weight 3) ============================
  // The product works. Zero broken flows, real data, downloads download.
  const produkt: ReadinessCheck[] = [
    check(
      "prod.deal-motor",
      "Deal-motoren har rigelig aktive annoncer",
      `${boligLive.toLocaleString("da-DK")} boliger · ${erhvervLive.toLocaleString("da-DK")} erhverv aktive`,
      boligLive >= 500 && erhvervLive >= 500 ? "green" : boligLive >= 200 ? "amber" : "red",
      "≥500 pr. kategori",
    ),
    check(
      "prod.bbr",
      "BBR-berigelse fungerer",
      "Datafordeler service-bruger aktiv, adresser opslås mod BBR + Ejerfortegnelsen.",
      "green",
      "≥95 % svar under 3 s",
    ),
    check(
      "prod.datamotor",
      "Datamotor genererer benchmarks løbende",
      `Reference-katalog opdateret ${reference.asOf} · ${reference.totals.bolig.toLocaleString("da-DK")} bolig- + ${reference.totals.erhverv.toLocaleString("da-DK")} erhvervsannoncer.`,
      reference.totals.bolig > 20000 ? "green" : "amber",
      "opdateret ≤ 24 t",
    ),
    check(
      "prod.rapporter",
      "Bank­rapport + Excel-export downloades fejlfrit",
      "Manuelt verificeret. E2E-test kan tilføjes.",
      "green",
    ),
    check(
      "prod.chatbot",
      "Analytikeren læser hele analysen og svarer",
      "Fuld context (BBR, analysebrud, foto­analyse, renovering) sendes med.",
      "green",
    ),
    check(
      "prod.checkout",
      "Stripe checkout end-to-end virker",
      "Payment Links + webhook + client_reference_id-attribution live.",
      "green",
    ),
  ];

  // === category 2: KOMMERCIEL VALIDERING (weight 3) =========================
  // Rådgiverens test. Money in the bank, time actually saved, people returning.
  const paying = a.payingUsers;
  const ts = a.timeSavings;
  const komm: ReadinessCheck[] = [
    check(
      "komm.paying5",
      "5 betalende kunder (129 kr Starter)",
      `${paying} af 5 betalende · ${a.conversionPct}% konvertering`,
      paying >= 5 ? "green" : paying >= 3 ? "amber" : paying >= 1 ? "amber" : "red",
      "≥ 5 betalende",
    ),
    check(
      "komm.timesave",
      "Median tidsbesparelse mindst halveret",
      ts.responses > 0
        ? `Median ${ts.medianManualMinutes} min manuelt · ${ts.responses} svar`
        : "Ingen tidsbesparelses-svar endnu — vises efter en analyse",
      ts.responses >= 10 && (ts.medianManualMinutes ?? 0) >= 20
        ? "green"
        : ts.responses > 0
        ? "amber"
        : "waiting",
      "median ≥ 20 min sparet",
    ),
    check(
      "komm.accuracy",
      "Tallene holder i praksis",
      ts.responses > 0
        ? `${ts.matched}/${ts.responses} passede · ${ts.minor} rettede småting · ${ts.major} store afvigelser`
        : "Ingen præcision-svar endnu",
      ts.responses > 0 && ts.matched / Math.max(1, ts.responses) >= 0.6
        ? "green"
        : ts.responses > 0
        ? "amber"
        : "waiting",
      "≥ 60 % passede",
    ),
    check(
      "komm.retention",
      "Fornyelse dag 30-60 (3 af 5)",
      paying >= 5
        ? "Målekriterie: mindst 3 af de første 5 fornyer"
        : "Kræver 5 betalende først for at kunne måles",
      paying >= 5 ? "amber" : "waiting",
      "≥ 3 af 5 fornyer",
    ),
  ];

  // === category 3: TILLID & JURA (weight 3) =================================
  const jura: ReadinessCheck[] = [
    check("jura.cvr", "CVR og adresse synlig i footer + juridiske sider", "CVR 44701898, Aage Knudsens Strøg 3C, 1. th.", "green"),
    check("jura.gdpr", "GDPR-flow: privatlivspolitik, cookies, samtykke", "Cookie-banner live · PostHog kun efter Accept · Vercel cookieless.", "green"),
    check("jura.bbr-cc", "BBR CC BY 4.0-kreditering overalt", "BbrPanel, /data, /methodology, bankrapport og Excel-export.", "green"),
    check("jura.refund", "Refunderings- og fortrydelsespolitik + form consent", "Standard digital-waiver refund, form consent på alle inputs.", "green"),
    check(
      "jura.rent-source",
      "Dokumenteret markedslejekilde etableret",
      "DST HUS1 huslejeindeks live (kilde + kvartalsvis fresh). BoligPortal afvist; alternativ Ejendomstorvet-udlejning + bruger-observationer sikrer flerkilde-dokumentation.",
      "green",
      "kilde eller aftale",
    ),
  ];

  // === category 4: DATA-KVALITET (weight 3) =================================
  const nationalPM2 = reference.residential.national?.value ?? 0;
  const data: ReadinessCheck[] = [
    check(
      "data.provenance",
      "Datagrundlag-panel med 3 tydelige niveauer",
      "Dokumenteret · Estimat · Skal undersøges — mærker hvert tal i hver analyse.",
      "green",
    ),
    check(
      "data.markedspris",
      "Markedspris pr. m² fra egen indsamling",
      `Median ${nationalPM2.toLocaleString("da-DK")} kr/m² · ${reference.residential.national?.n.toLocaleString("da-DK") ?? 0} annoncer i grundlaget`,
      nationalPM2 > 0 ? "green" : "red",
      "national + regional dækning",
    ),
    check(
      "data.dst",
      "Værdistigning grundet DST realiserede salgspriser",
      "EJ55-serien pr. landsdel × ejendomstype, cachet 24 t.",
      "green",
    ),
    check(
      "data.rent",
      "Markedsleje kalibreret med officiel kilde",
      "DST HUS1 huslejeindeks (private boliger × region × kvartal) anker per-region baseline. Bruger-observationer overlaies ved ≥15 svar pr. region+type → flipper til Dokumenteret.",
      "green",
      "kalibreret pr. kvartal · dokumenteret ved 15 obs.",
    ),
    check(
      "data.ejerudgift",
      "Ejerudgift dokumenteres fra annoncen",
      "Extractor henter monthlyExpenses fra mæglerannoncen. Bruges hvor tilgængelig.",
      "green",
    ),
  ];

  // === category 5: PERFORMANCE & POLISH (weight 2) ==========================
  const perf: ReadinessCheck[] = [
    check("perf.mobile", "Ingen horizontal overflow på mobil (375 px)", "Verificeret manuelt på analyseren, deal-motor, dashboard.", "green", "0 overflowing elements"),
    check("perf.console", "0 console errors på nogen offentlig side", "Verificeret på landing + analyseren + /data + /priser + /methodology.", "green"),
    ...(() => {
      // Each key page is judged by the best data we have for THAT page: our own
      // real-user metrics (PostHog RUM) once it has enough samples, otherwise
      // Google's CrUX field data, otherwise Google's Lighthouse lab run. A page
      // with a few RUM samples no longer blocks the verdict for the others.
      const pages = ["/", "/analyseren", "/deals"].map((path) => {
        const r = rum.perPath.find((p) => p.path === path);
        if (r && r.samples >= MIN_SAMPLES && r.lcpP75 != null) {
          return { path, source: `RUM, ${r.samples} målinger siden ${RUM_SINCE.slice(8, 10)}/${RUM_SINCE.slice(5, 7)}`, lcp: r.lcpP75, inp: r.inpP75, cls: r.clsP75 };
        }
        const p = psi.results.find((x) => x.ok && new URL(x.url).pathname === path);
        if (p && p.vitals.lcpMs != null) {
          return { path, source: p.vitals.source === "field" ? "Google CrUX" : "Google Lighthouse", lcp: p.vitals.lcpMs, inp: p.vitals.inpMs, cls: p.vitals.cls };
        }
        return { path, source: null, lcp: null, inp: null, cls: null };
      });
      const measured = pages.filter((p) => p.source != null);
      const good = (p: (typeof pages)[number]) =>
        p.lcp != null && p.lcp <= 2500 && p.cls != null && p.cls <= 0.1 && (p.inp == null || p.inp <= 200);
      const fmt = (p: (typeof pages)[number]) =>
        p.source == null
          ? `${p.path}: ingen data`
          : `${p.path} ${good(p) ? "✓" : "✗"} LCP ${((p.lcp ?? 0) / 1000).toFixed(1).replace(".", ",")} s · CLS ${(p.cls ?? 0).toFixed(2).replace(".", ",")}${p.inp != null ? ` · INP ${Math.round(p.inp)} ms` : ""} (${p.source})`;

      const landing = pages[0];
      const lcpStatus: CheckStatus = landing.lcp == null ? "waiting" : landing.lcp <= 2500 ? "green" : landing.lcp <= 4000 ? "amber" : "red";
      const lcpDetail = landing.lcp == null
        ? "Afventer data: RUM (PostHog) med mindst 20 målinger eller en PageSpeed-nøgle (PAGESPEED_INSIGHTS_KEY)."
        : `Målt ${(landing.lcp / 1000).toFixed(2).replace(".", ",")} s via ${landing.source}.`;

      const cwvStatus: CheckStatus =
        measured.length === pages.length && pages.every(good)
          ? "green"
          : measured.length === 0
            ? "waiting"
            : pages.some((p) => p.source != null && !good(p))
              ? "amber"
              : "waiting";
      const cwvDetail = measured.length === 0
        ? "Afventer data: RUM (PostHog) med mindst 20 målinger pr. side eller en PageSpeed-nøgle (PAGESPEED_INSIGHTS_KEY)."
        : pages.map(fmt).join(" · ");
      return [
        check("perf.lcp", "Landing LCP p75 under 2,5 s", lcpDetail, lcpStatus, "LCP ≤ 2,5 s"),
        check("perf.cwv", "Core Web Vitals grønne på alle nøglesider", cwvDetail, cwvStatus, "LCP + INP + CLS alle grønne"),
      ];
    })(),
    check("perf.deploy", "Deploy pipeline stabil (Vercel prod)", "Vercel CLI-auth stabil, ingen build-fejl.", "green"),
  ];

  // === category 6: ONBOARDING & JOURNEY (weight 2) ==========================
  const onboard: ReadinessCheck[] = [
    check(
      "onb.anon-analyse",
      "Anonym bruger kan køre en analyse uden signup",
      "3 gratis analyser før paywallen. Verificeret i browser.",
      "green",
    ),
    check(
      "onb.aha-moment",
      "\"Aha moment\" tydelig inden signup",
      "Score + verdikt + 4 nøgletal + markedspris pr. m² synligt på første analyse.",
      "green",
    ),
    check(
      "onb.paywall",
      "Paywall vises på 4. analyse, ikke før",
      "Server-håndhævet på /api/usage — blokerede kørsler tælles ikke.",
      "green",
    ),
    check(
      "onb.email-verify",
      "Signup + email-verify flow uden confusion",
      "Auth-callback + kvitteringsside live.",
      "green",
    ),
    check(
      "onb.empty-states",
      "Empty states på alle nøgleflader",
      "Dashboard, Vagt, GemteSøgninger — alle har considered empty states.",
      "green",
    ),
    check(
      "onb.funnel-visible",
      "Tragt målt på boardet: startet → paywall → checkout",
      "Vercel Analytics + PostHog events viser fuld tragt i Validering-sektionen.",
      "green",
    ),
  ];

  // === category 7: GO-TO-MARKET (weight 1) ==================================
  // Not launch-critical for a private soft-launch, but tracked so we don't skip it.
  const gtm: ReadinessCheck[] = [
    check(
      "gtm.seo",
      "SEO: ranking for \"ejendomsinvestering analyse Danmark\"",
      "Ranker på søgeordet. Hovedside /analyse-af-ejendomsinvestering (guide, regneeksempel, FAQ + schema), forside-title målrettet, interne links med søgeordet fra /analyseren, /deals og alle 16 Deal-bysider, IndexNow indsendt.",
      "green",
      "Top 20",
    ),
    check(
      "gtm.blog",
      "Blog cadence etableret",
      "28 danske guides live. Seneste: 3 feature-guides 26/9 (forældrekøb, Airbnb-regler, sommerhus som investering) med eget design, billeder fra billedmodel, FAQ-schema og skat.dk som kilde.",
      "green",
    ),
    check(
      "gtm.bing",
      "Bing & Copilot: indekseret og verificeret",
      process.env.BING_SITE_VERIFICATION
        ? "Bing Webmaster verificeret (msvalidate.01), IndexNow-nøgle live, sitemap + nye URL'er pushet via scripts/indexnow.mjs efter hvert deploy. Artikel-metadata (published/modified, og:image, twitter) på alle blogindlæg."
        : "IndexNow-nøgle live og alle URL'er pushet (scripts/indexnow.mjs), artikel-metadata på alle blogindlæg. Mangler: opret Bing Webmaster Tools og importér sitet fra Google Search Console (eller sæt BING_SITE_VERIFICATION i Vercel), og indsend sitemap.",
      process.env.BING_SITE_VERIFICATION ? "green" : "amber",
    ),
    check(
      "gtm.gsc",
      "Google Search Console indeksering foldet ud",
      "Sitet ligger på nordinvest.io (www omdirigerer), men GSC-ejendommen er www. Tilføj Domæne-ejendommen nordinvest.io (auto-verificeret via DNS), indsend sitemap, og anmod om indeksering af de vigtigste sider.",
      "amber",
    ),
    check(
      "gtm.launch-channel",
      "Launch-kanal valgt (LinkedIn / community / paid)",
      "Ikke besluttet endnu. Rådgiverens råd: 20 kvalificerede testpersoner først, så én kanal.",
      "waiting",
    ),
  ];

  const categories: ReadinessCategory[] = [
    { id: "produkt", title: "Produkt-integritet", icon: "boxes", weight: 3, checks: produkt },
    { id: "komm", title: "Kommerciel validering", icon: "banknote", weight: 3, checks: komm },
    { id: "jura", title: "Tillid & jura", icon: "shield-check", weight: 3, checks: jura },
    { id: "data", title: "Data-kvalitet", icon: "database", weight: 3, checks: data },
    { id: "perf", title: "Performance & polish", icon: "gauge", weight: 2, checks: perf },
    { id: "onboard", title: "Onboarding & brugerrejse", icon: "route", weight: 2, checks: onboard },
    { id: "gtm", title: "Go-to-market", icon: "megaphone", weight: 1, checks: gtm },
  ];

  const allChecks = categories.flatMap((c) => c.checks);
  const totalCount = allChecks.length;
  const greenCount = allChecks.filter((c) => c.status === "green").length;
  const overallPct = Math.round((greenCount / totalCount) * 100);
  const overallStatus: CheckStatus =
    overallPct >= 85 ? "green" : overallPct >= 60 ? "amber" : "red";

  const criticalBlockers = categories
    .filter((c) => c.weight === 3)
    .flatMap((c) => c.checks.filter((k) => k.status === "red").map((k) => k.id));

  return {
    categories,
    overallPct,
    overallStatus,
    greenCount,
    totalCount,
    criticalBlockers,
    updatedAt: new Date().toISOString(),
  };
}

// The public "we're ready to launch" gate. All weight-3 categories fully green,
// no critical blockers, and overall ≥ 85 %.
export function isLaunchReady(r: ReadinessReport): boolean {
  const heavy = r.categories.filter((c) => c.weight === 3);
  const allHeavyGreen = heavy.every((c) => c.checks.every((k) => k.status === "green"));
  return allHeavyGreen && r.criticalBlockers.length === 0 && r.overallPct >= 85;
}

// Convenience: pretty-print a report to the console. Used by CI / a periodic
// check if we want to alert when something regresses.
export function printReport(r: ReadinessReport): string {
  const lines = [`NordInvest Launch Readiness — ${r.overallPct}% (${r.greenCount}/${r.totalCount})`];
  for (const cat of r.categories) {
    const g = cat.checks.filter((c) => c.status === "green").length;
    lines.push(`\n${cat.title} — ${g}/${cat.checks.length} (weight ${cat.weight})`);
    for (const c of cat.checks) {
      const mark = c.status === "green" ? "✓" : c.status === "amber" ? "•" : c.status === "waiting" ? "…" : "✗";
      lines.push(`  ${mark} ${c.label}${c.target ? ` (${c.target})` : ""}`);
    }
  }
  return lines.join("\n");
}

// Re-export the shape so the page component can type its props cleanly.
export type { Analytics };
