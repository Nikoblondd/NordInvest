/**
 * NordInvest tools i18n — lightweight, self-contained runtime for the tool pages.
 * -----------------------------------------------------------------------------
 * Danish is the default and lives as the literal HTML content (SEO canonical).
 * Each page provides only an ENGLISH dictionary in window.TOOL_STRINGS_EN,
 * keyed by data-i18n / data-i18n-html / data-i18n-ph attributes. On first run
 * we cache the original Danish text so we can restore it when switching back —
 * so only English needs maintaining per page.
 *
 * Shares the 'ni_lang' localStorage key with the main site's i18n.js, so the
 * language preference follows the visitor across the whole site.
 *
 * Dynamic calculator strings live in each page's own script, which reads
 * window.toolLang and listens for the 'toolLang:changed' event to re-render.
 */
(function () {
  var SUPPORTED = ['da', 'en'];
  var DEFAULT_LANG = 'da';
  var STORAGE_KEY = 'ni_lang';

  function detect() {
    try {
      var u = new URLSearchParams(window.location.search).get('lang');
      if (u && SUPPORTED.indexOf(u) >= 0) return u;
    } catch (e) {}
    try {
      var s = localStorage.getItem(STORAGE_KEY);
      if (s && SUPPORTED.indexOf(s) >= 0) return s;
    } catch (e) {}
    return DEFAULT_LANG;
  }

  function apply(lang) {
    var en = window.TOOL_STRINGS_EN || {};
    document.documentElement.lang = lang;

    document.querySelectorAll('[data-i18n]').forEach(function (el) {
      if (!el.hasAttribute('data-i18n-orig')) el.setAttribute('data-i18n-orig', el.textContent);
      var key = el.getAttribute('data-i18n');
      var v = (lang === 'da') ? el.getAttribute('data-i18n-orig') : en[key];
      if (v != null) el.textContent = v;
    });

    document.querySelectorAll('[data-i18n-html]').forEach(function (el) {
      if (!el.hasAttribute('data-i18n-orig-html')) el.setAttribute('data-i18n-orig-html', el.innerHTML);
      var key = el.getAttribute('data-i18n-html');
      var v = (lang === 'da') ? el.getAttribute('data-i18n-orig-html') : en[key];
      if (v != null) el.innerHTML = v;
    });

    document.querySelectorAll('[data-i18n-ph]').forEach(function (el) {
      if (!el.hasAttribute('data-i18n-orig-ph')) el.setAttribute('data-i18n-orig-ph', el.getAttribute('placeholder') || '');
      var key = el.getAttribute('data-i18n-ph');
      var v = (lang === 'da') ? el.getAttribute('data-i18n-orig-ph') : en[key];
      if (v != null) el.setAttribute('placeholder', v);
    });

    // Tab title: cache Danish once, swap to English if provided
    if (!document.documentElement.hasAttribute('data-title-orig')) {
      document.documentElement.setAttribute('data-title-orig', document.title);
    }
    if (lang === 'da') {
      document.title = document.documentElement.getAttribute('data-title-orig');
    } else if (en.__title) {
      document.title = en.__title;
    }

    // Active state on the language toggle
    document.querySelectorAll('.lang-btn').forEach(function (b) {
      b.classList.toggle('active', b.getAttribute('data-lang') === lang);
    });

    // Keep the visible URL clean (preference persists via localStorage)
    try {
      var url = new URL(window.location.href);
      if (url.searchParams.has('lang')) {
        url.searchParams.delete('lang');
        window.history.replaceState({}, '', url.toString());
      }
    } catch (e) {}

    window.toolLang = lang;
    document.dispatchEvent(new CustomEvent('toolLang:changed', { detail: { lang: lang } }));
  }

  window.setToolLang = function (lang) {
    if (SUPPORTED.indexOf(lang) < 0) return;
    try { localStorage.setItem(STORAGE_KEY, lang); } catch (e) {}
    apply(lang);
  };

  function init() { apply(detect()); }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
