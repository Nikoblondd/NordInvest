import { track } from "@vercel/analytics";

// One call that sends a funnel event to BOTH pipelines: Vercel Web Analytics
// (cookieless, always on) and PostHog (only after the visitor accepted — the
// instance is exposed on window.__ph by ConsentAnalytics, so this stays a no-op
// until consent, and no component has to import posthog-js directly).
export function captureEvent(name: string, props?: Record<string, unknown>) {
  try {
    track(name, props as Record<string, string | number | boolean | null> | undefined);
  } catch {
    /* best-effort */
  }
  try {
    const ph = (window as unknown as { __ph?: { capture?: (n: string, p?: Record<string, unknown>) => void } }).__ph;
    ph?.capture?.(name, props);
  } catch {
    /* best-effort */
  }
}
