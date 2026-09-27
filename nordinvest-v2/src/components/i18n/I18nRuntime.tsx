"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { Translator, currentLang, loadCache } from "@/lib/i18n/engine";
import { I18N_VERSION } from "@/lib/i18n/version";

async function getJson(url: string): Promise<Record<string, string>> {
  try {
    const res = await fetch(url);
    return res.ok ? await res.json() : {};
  } catch {
    return {};
  }
}

const blogSlug = (path: string) => (path.startsWith("/blog/") ? path.split("/")[2] : null);

/** Starts English mode when the visitor chose it; otherwise does nothing at all. */
export function I18nRuntime() {
  const pathname = usePathname();
  const tr = useRef<Translator | null>(null);
  const loadedBlogs = useRef(new Set<string>());

  useEffect(() => {
    let cancelled = false;
    const boot = async () => {
      if (currentLang() !== "en" || tr.current) return;
      const slug = blogSlug(location.pathname);
      const [base, blog] = await Promise.all([
        getJson(`/i18n/en.json?v=${I18N_VERSION}`),
        slug ? getJson(`/i18n/blog/${slug}.json?v=${I18N_VERSION}`) : Promise.resolve({}),
      ]);
      if (cancelled) return;
      if (slug) loadedBlogs.current.add(slug);
      tr.current = new Translator({ ...base, ...blog, ...loadCache() });
      tr.current.start();
      document.documentElement.classList.remove("i18n-pending");
    };
    // Start after React has finished hydrating, so translated text can't clash
    // with the server HTML React is still matching against.
    const ready = () => {
      const idle = (window as unknown as { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number }).requestIdleCallback;
      if (idle) idle(() => boot(), { timeout: 400 });
      else setTimeout(boot, 50);
    };
    if (document.readyState === "complete") ready();
    else window.addEventListener("load", ready, { once: true });
    const onSwitch = () => boot();
    window.addEventListener("nordinvest-lang", onSwitch);
    return () => {
      cancelled = true;
      window.removeEventListener("nordinvest-lang", onSwitch);
      window.removeEventListener("load", ready);
    };
  }, []);

  // Client-side navigation into a blog post: load that post's dictionary.
  useEffect(() => {
    const slug = pathname ? blogSlug(pathname) : null;
    if (!slug || !tr.current || loadedBlogs.current.has(slug)) return;
    loadedBlogs.current.add(slug);
    getJson(`/i18n/blog/${slug}.json?v=${I18N_VERSION}`).then((d) => {
      tr.current?.merge(d);
      tr.current?.pass(document.body);
    });
  }, [pathname]);

  return null;
}
