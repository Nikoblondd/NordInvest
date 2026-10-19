"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

// PostHog is loaded ONLY after the visitor accepts. Key is optional — the banner
// still shows so consent is captured; tracking activates once the key is set.
const PH_KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY;
const PH_HOST = process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://eu.i.posthog.com";

let started = false;
async function startPostHog() {
  if (typeof window === "undefined" || !PH_KEY) return;
  if (started) {
    // Accepted again after withdrawing in the same visit.
    const ph = (window as unknown as { __ph?: { opt_in_capturing?: () => void } }).__ph;
    try { ph?.opt_in_capturing?.(); } catch { /* best-effort */ }
    return;
  }
  started = true;
  try {
    const posthog = (await import("posthog-js")).default;
    posthog.init(PH_KEY, {
      api_host: PH_HOST,
      person_profiles: "always", // track anonymous visitors too (their full journey)
      autocapture: true, // every click/tap automatically
      capture_pageview: true,
      capture_pageleave: true,
      // Real User Monitoring — LCP, INP, CLS on every navigation. Fires as
      // $web_vitals events; queried server-side in getWebVitalsSummary() to
      // feed perf.lcp / perf.cwv in the launch-readiness cockpit.
      capture_performance: { web_vitals: true },
      // Session replay — mask everything the user types so no personal data is recorded.
      session_recording: { maskAllInputs: true },
    });
    // Attach the logged-in user so their journey is identified, not just anonymous.
    // Expose the initialised instance so custom funnel events (captureEvent) can
    // reach PostHog without other components statically importing posthog-js —
    // which would load it before consent and undo this lazy-load.
    (window as unknown as { __ph?: unknown }).__ph = posthog;
    const { createClient } = await import("@/lib/supabase/client");
    const supabase = createClient();
    if (supabase) {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) posthog.identify(user.id, { email: user.email });
    }
  } catch {
    /* analytics is best-effort — never break the page */
  }
}

// Withdrawing consent stops tracking at once, not only from the next visit.
function stopPostHog() {
  const ph = (window as unknown as { __ph?: { opt_out_capturing?: () => void; stopSessionRecording?: () => void } }).__ph;
  try { ph?.stopSessionRecording?.(); ph?.opt_out_capturing?.(); } catch { /* best-effort */ }
}

// The banner waits until the visitor has engaged: their first click or tap,
// or 60 seconds on the site (counted across pages in this visit). Nothing that
// needs consent runs before they answer, so waiting is safe; it just stops the
// banner from greeting people before they have seen the page.
const ENGAGE_AFTER_MS = 60_000;
const START_KEY = "ni_visit_start";
const READY_KEY = "ni_consent_ready";

function useEngaged(active: boolean) {
  const [engaged, setEngaged] = useState(false);
  useEffect(() => {
    if (!active) return;
    let start = Date.now();
    try {
      if (sessionStorage.getItem(READY_KEY) === "1") { setEngaged(true); return; }
      const stored = Number(sessionStorage.getItem(START_KEY));
      if (stored > 0) start = stored;
      else sessionStorage.setItem(START_KEY, String(start));
    } catch { /* blocked */ }
    let done = false;
    const fire = () => {
      if (done) return;
      done = true;
      try { sessionStorage.setItem(READY_KEY, "1"); } catch { /* blocked */ }
      setEngaged(true);
    };
    // After the first click, wait a beat so the click itself (a link, a button)
    // completes before anything slides in.
    const onInteract = () => window.setTimeout(fire, 1200);
    const timer = window.setTimeout(fire, Math.max(0, ENGAGE_AFTER_MS - (Date.now() - start)));
    window.addEventListener("pointerdown", onInteract, { once: true, passive: true });
    window.addEventListener("keydown", onInteract, { once: true });
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("pointerdown", onInteract);
      window.removeEventListener("keydown", onInteract);
    };
  }, [active]);
  return engaged;
}

export function ConsentAnalytics() {
  // The news-site widget (/embed/…) runs inside other sites' pages: no banner,
  // no tracking there.
  const path = usePathname() ?? "";
  const embedded = path.startsWith("/embed");
  // Inside the app, sit above the phone tab bar.
  const inApp = path === "/app" || path.startsWith("/app/");
  const [consent, setConsent] = useState<"accepted" | "declined" | "unset" | "loading">("loading");
  const engaged = useEngaged(consent === "unset");
  // "Cookie-indstillinger" in the footer reopens the banner straight away.
  const [reopened, setReopened] = useState(false);
  useEffect(() => {
    const reopen = () => { setReopened(true); setConsent("unset"); };
    window.addEventListener("ni-consent-reopen", reopen);
    return () => window.removeEventListener("ni-consent-reopen", reopen);
  }, []);

  useEffect(() => {
    let stored: string | null = null;
    try { stored = localStorage.getItem("ni_consent"); } catch { /* blocked */ }
    if (stored === "accepted") { setConsent("accepted"); if (!window.location.pathname.startsWith("/embed")) startPostHog(); }
    else if (stored === "declined") setConsent("declined");
    else setConsent("unset");
  }, []);

  const open = consent === "unset" && (engaged || reopened);

  // Let other bottom-pinned UI (the blog's analyse bar) step aside while open.
  useEffect(() => {
    const root = document.documentElement;
    if (open) root.setAttribute("data-consent-open", "");
    else root.removeAttribute("data-consent-open");
    window.dispatchEvent(new Event("ni-consent"));
  }, [open]);

  const choose = (v: "accepted" | "declined") => {
    try { localStorage.setItem("ni_consent", v); } catch { /* blocked */ }
    setConsent(v);
    setReopened(false);
    if (v === "accepted") startPostHog();
    else stopPostHog();
  };

  if (!open || embedded) return null;

  return (
    <div
      role="region"
      aria-label="Cookies"
      data-consent
      className={`fixed inset-x-0 bottom-0 z-[60] border-t border-[var(--color-ink)] bg-[var(--color-paper)] pb-[max(0rem,env(safe-area-inset-bottom))] ${inApp ? "max-lg:bottom-[62px]" : ""}`}
    >
      <div className="mx-auto flex max-w-[1120px] items-center gap-3 px-4 py-2.5 sm:px-8">
        <p className="min-w-0 flex-1 text-[13px] leading-snug text-slate-600 sm:text-sm">
          <span className="sm:hidden">Cookies til statistik? </span>
          <span className="hidden sm:inline">Må vi bruge cookies til at forstå, hvordan siden bruges? Det hjælper os med at gøre den bedre. </span>
          <Link href="/juridisk/cookies" prefetch={false} className="whitespace-nowrap font-semibold text-slate-900 underline">Læs mere</Link>
        </p>
        <div className="flex shrink-0 gap-1.5 sm:gap-2">
          <button
            onClick={() => choose("declined")}
            className="min-h-10 whitespace-nowrap rounded-lg border border-slate-300 px-3.5 text-[13px] font-semibold text-slate-800 transition-colors hover:bg-slate-100 sm:text-sm"
          >
            Afvis
          </button>
          <button
            onClick={() => choose("accepted")}
            className="min-h-10 whitespace-nowrap rounded-lg bg-slate-900 px-3.5 text-[13px] font-semibold text-white transition-colors hover:bg-slate-800 sm:text-sm"
          >
            Accepter
          </button>
        </div>
      </div>
    </div>
  );
}
