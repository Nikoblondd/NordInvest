"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

// PostHog is loaded ONLY after the visitor accepts. Key is optional — the banner
// still shows so consent is captured; tracking activates once the key is set.
const PH_KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY;
const PH_HOST = process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://eu.i.posthog.com";

let started = false;
async function startPostHog() {
  if (started || !PH_KEY || typeof window === "undefined") return;
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

export function ConsentAnalytics() {
  const [consent, setConsent] = useState<"accepted" | "declined" | "unset" | "loading">("loading");

  useEffect(() => {
    let stored: string | null = null;
    try { stored = localStorage.getItem("ni_consent"); } catch { /* blocked */ }
    if (stored === "accepted") { setConsent("accepted"); startPostHog(); }
    else if (stored === "declined") setConsent("declined");
    else setConsent("unset");
  }, []);

  const choose = (v: "accepted" | "declined") => {
    try { localStorage.setItem("ni_consent", v); } catch { /* blocked */ }
    setConsent(v);
    if (v === "accepted") startPostHog();
  };

  if (consent !== "unset") return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-[60] p-3 sm:p-4">
      <div className="mx-auto flex max-w-3xl flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-2xl sm:flex-row sm:items-center sm:gap-4">
        <p className="flex-1 text-sm leading-relaxed text-slate-600">
          Vi bruger cookies til at forstå, hvordan siden bruges, så vi kan gøre den bedre. Du bestemmer selv.{" "}
          <Link href="/juridisk/cookies" className="font-semibold text-slate-900 underline">Læs mere</Link>.
        </p>
        <div className="flex shrink-0 gap-2">
          <button
            onClick={() => choose("declined")}
            className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-50"
          >
            Afvis
          </button>
          <button
            onClick={() => choose("accepted")}
            className="rounded-full bg-slate-900 px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-slate-800"
          >
            Accepter
          </button>
        </div>
      </div>
    </div>
  );
}
