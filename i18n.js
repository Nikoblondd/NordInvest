/**
 * NordInvest i18n — lightweight vanilla runtime
 * ---------------------------------------------
 * - Reads ?lang= URL param > localStorage 'ni_lang' > default 'en'
 * - Fetches /locales/{lang}.json
 * - Translates [data-i18n], [data-i18n-placeholder], [data-i18n-aria]
 * - Exposes window.t(key, vars), window.setLang(lang), window.getLang()
 * - Updates <html lang>, canonical, and hreflang tags
 * - Fires 'i18n:ready' event when translations are applied
 *
 * Adding a new language: drop locales/<code>.json + add to SUPPORTED below.
 */
(function () {
  const SUPPORTED = ['en', 'da'];
  const DEFAULT_LANG = 'en';
  const STORAGE_KEY = 'ni_lang';
  let dict = {};
  let currentLang = DEFAULT_LANG;

  function detectLang() {
    const url = new URL(window.location.href);
    const urlLang = url.searchParams.get('lang');
    if (urlLang && SUPPORTED.includes(urlLang)) return urlLang;
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored && SUPPORTED.includes(stored)) return stored;
    } catch (_) {}
    return DEFAULT_LANG;
  }

  function getByPath(obj, path) {
    return path.split('.').reduce((acc, key) => (acc && acc[key] !== undefined ? acc[key] : undefined), obj);
  }

  function interpolate(str, vars) {
    if (!vars || typeof str !== 'string') return str;
    return str.replace(/\{(\w+)\}/g, (_, k) => (vars[k] !== undefined ? vars[k] : `{${k}}`));
  }

  function t(key, vars) {
    const val = getByPath(dict, key);
    if (val === undefined) return key;
    return interpolate(val, vars);
  }

  function applyTranslations(root) {
    const scope = root || document;
    scope.querySelectorAll('[data-i18n]').forEach((el) => {
      const key = el.getAttribute('data-i18n');
      const val = getByPath(dict, key);
      if (val !== undefined) {
        if (el.hasAttribute('data-i18n-html')) el.innerHTML = val;
        else el.textContent = val;
      }
    });
    scope.querySelectorAll('[data-i18n-placeholder]').forEach((el) => {
      const key = el.getAttribute('data-i18n-placeholder');
      const val = getByPath(dict, key);
      if (val !== undefined) el.setAttribute('placeholder', val);
    });
    scope.querySelectorAll('[data-i18n-aria]').forEach((el) => {
      const key = el.getAttribute('data-i18n-aria');
      const val = getByPath(dict, key);
      if (val !== undefined) el.setAttribute('aria-label', val);
    });
    scope.querySelectorAll('[data-i18n-title]').forEach((el) => {
      const key = el.getAttribute('data-i18n-title');
      const val = getByPath(dict, key);
      if (val !== undefined) el.setAttribute('title', val);
    });
  }

  function updateHtmlLang() {
    document.documentElement.lang = currentLang;
  }

  function updateHreflang() {
    const origin = window.location.origin;
    const pathname = window.location.pathname;
    const baseUrl = origin + pathname;

    // Update canonical to match current language
    let canonical = document.querySelector('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.setAttribute('rel', 'canonical');
      document.head.appendChild(canonical);
    }
    canonical.setAttribute('href', currentLang === DEFAULT_LANG ? baseUrl : `${baseUrl}?lang=${currentLang}`);

    // Remove old hreflang tags
    document.querySelectorAll('link[rel="alternate"][hreflang]').forEach((el) => el.remove());

    // Add fresh hreflang tags for every supported language + x-default
    SUPPORTED.forEach((lang) => {
      const link = document.createElement('link');
      link.setAttribute('rel', 'alternate');
      link.setAttribute('hreflang', lang);
      link.setAttribute('href', lang === DEFAULT_LANG ? baseUrl : `${baseUrl}?lang=${lang}`);
      document.head.appendChild(link);
    });
    const xDefault = document.createElement('link');
    xDefault.setAttribute('rel', 'alternate');
    xDefault.setAttribute('hreflang', 'x-default');
    xDefault.setAttribute('href', baseUrl);
    document.head.appendChild(xDefault);
  }

  async function loadLang(lang) {
    if (!SUPPORTED.includes(lang)) lang = DEFAULT_LANG;
    try {
      const res = await fetch(`/locales/${lang}.json`, { cache: 'no-cache' });
      if (!res.ok) throw new Error('Failed to load locale');
      dict = await res.json();
      currentLang = lang;
      try { localStorage.setItem(STORAGE_KEY, lang); } catch (_) {}
      updateHtmlLang();
      updateHreflang();
      applyTranslations();
      // Sync URL ?lang= without reload
      try {
        const url = new URL(window.location.href);
        if (lang === DEFAULT_LANG) url.searchParams.delete('lang');
        else url.searchParams.set('lang', lang);
        window.history.replaceState({}, '', url.toString());
      } catch (_) {}
      document.dispatchEvent(new CustomEvent('i18n:ready', { detail: { lang } }));
    } catch (err) {
      console.warn('[i18n] load failed for', lang, err);
      if (lang !== DEFAULT_LANG) await loadLang(DEFAULT_LANG);
    }
  }

  function setLang(lang) {
    if (lang === currentLang) return;
    loadLang(lang);
  }

  // Public API
  window.t = t;
  window.setLang = setLang;
  window.getLang = () => currentLang;
  window.applyI18n = applyTranslations;

  // Bootstrap
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => loadLang(detectLang()));
  } else {
    loadLang(detectLang());
  }
})();
