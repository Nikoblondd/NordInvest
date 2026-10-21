/* eslint-disable @typescript-eslint/no-explicit-any */
/*
 * Google Maps JavaScript API, loaded once and only when someone opens street
 * view. The key is a public, referrer-restricted browser key
 * (NEXT_PUBLIC_GOOGLE_MAPS_KEY). Resolves to null when there is no key or it
 * is refused, so the page can say so instead of hanging.
 */
let loading: Promise<any | null> | null = null;
let refused = false;

export function googleKeyRefused() { return refused; }

export function loadGoogle(): Promise<any | null> {
  const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY;
  // Without a key, only a local dev server tries (Google answers in development mode).
  if (!key && !/^(localhost|127\.0\.0\.1)$/.test(location.hostname)) return Promise.resolve(null);
  if (loading) return loading;
  loading = new Promise((resolve) => {
    const w = window as any;
    if (w.google?.maps?.importLibrary) return resolve(w.google);
    w.gm_authFailure = () => { refused = true; };
    w.__bkGoogleReady = () => resolve(w.google);
    const s = document.createElement("script");
    s.src = `https://maps.googleapis.com/maps/api/js?${key ? `key=${encodeURIComponent(key)}&` : ""}v=weekly&language=da&region=DK&loading=async&callback=__bkGoogleReady`;
    s.async = true;
    s.onerror = () => { loading = null; resolve(null); };
    document.head.appendChild(s);
  });
  return loading;
}
