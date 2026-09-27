import { EN_IMAGES } from "./images";

/*
 * NordInvest's English mode.
 *
 * The site is written in Danish. When a visitor picks English, this engine
 * translates the live DOM: every text node, the attributes people read
 * (placeholder, aria-label, title, alt) and the page title. It keeps working
 * as React updates the page, because a MutationObserver re-translates anything
 * that changes. Numbers are lifted out before lookup, so "Nej, du lægger
 * 3.531 kr til" and "Nej, du lægger 1.384 kr til" share one translation, and
 * they come back in English format (3,531).
 *
 * Translations come from a pre-built dictionary (public/i18n/en.json). Anything
 * the dictionary doesn't know is sent to /api/i18n/translate and cached, so new
 * or data-driven text is translated too.
 */

export type Lang = "da" | "en";
export const LANG_KEY = "nordinvest-lang";
export const LANG_COOKIE = "nordinvest-lang";

export function currentLang(): Lang {
  if (typeof document === "undefined") return "da";
  return document.documentElement.getAttribute("data-lang") === "en" ? "en" : "da";
}

export function setLang(lang: Lang) {
  try {
    localStorage.setItem(LANG_KEY, lang);
  } catch {}
  document.cookie = `${LANG_COOKIE}=${lang}; path=/; max-age=31536000; samesite=lax`;
}

// ── numbers ────────────────────────────────────────────────────────────────
// Danish numbers: 4.300.000 / 3,46 / −3.531. A minus is U+2212, or a hyphen
// directly before a digit at the start or after a space/bracket.
// (No lookbehind: older iOS Safari can't parse it.)
const NUM = /[-−]?\d{1,3}(?:\.\d{3})+(?:,\d+)?|[-−]?\d+(?:,\d+)?/g;

/** Replace numbers with ⟦n⟧; a hyphen glued to a word or digit ("2018-2026", "7-9") is a dash, not a minus. */
function liftNumbers(text: string, nums: string[]): string {
  return text.replace(NUM, (m, offset: number, whole: string) => {
    let lead = "";
    if (m[0] === "-" && offset > 0 && /[A-Za-zÆØÅæøåÄÖÜäöüÉé0-9]/.test(whole[offset - 1])) {
      lead = "-";
      m = m.slice(1);
    }
    nums.push(m);
    return `${lead}⟦${nums.length - 1}⟧`;
  });
}
const LETTER = /[A-Za-zÆØÅæøåÄÖÜäöüÉé]/;

export function toEnNumber(n: string): string {
  // thousands dots -> commas, decimal comma -> dot
  return n.replace(/\./g, "\u0000").replace(/,/g, ".").replace(/\u0000/g, ",");
}

export function tokenize(text: string): { key: string; nums: string[]; lead: string; trail: string } {
  const lead = text.match(/^\s*/)?.[0] ?? "";
  const trail = text.match(/\s*$/)?.[0] ?? "";
  const nums: string[] = [];
  const key = text
    .trim()
    .replace(/\s+/g, " ");
  return { key: liftNumbers(key, nums), nums, lead, trail };
}

function fill(tr: string, nums: string[]): string {
  return tr.replace(/⟦(\d+)⟧/g, (_, i) => (nums[Number(i)] != null ? toEnNumber(nums[Number(i)]) : ""));
}

/** Tokenize numbers only in the text between tags of an HTML fragment. */
export function tokenizeHtml(html: string): { key: string; nums: string[] } {
  const nums: string[] = [];
  const key = html
    .replace(/\s+/g, " ")
    .trim()
    .split(/(<[^>]+>)/)
    .map((part) =>
      part.startsWith("<") ? part : liftNumbers(part, nums),
    )
    .join("");
  return { key, nums };
}

function fillHtml(tr: string, nums: string[]): string {
  return tr
    .split(/(<[^>]+>)/)
    .map((p) => (p.startsWith("<") ? p : fill(p, nums)))
    .join("");
}

// ── engine ─────────────────────────────────────────────────────────────────

const SKIP_TAGS = new Set(["SCRIPT", "STYLE", "NOSCRIPT", "CODE", "PRE", "TEXTAREA", "INPUT", "SELECT"]);
const SKIP_SELECTOR = '[translate="no"], .notranslate, [data-no-i18n], [contenteditable="true"]';
const ATTRS = ["placeholder", "aria-label", "title", "alt"] as const;
const HTML_BLOCKS = "p, li, h1, h2, h3, h4, h5, td, th, figcaption, dt, dd, blockquote";
const HTML_KEY = "html:";
const toEnImage = (src: string) => {
  const [path, query] = src.split("?");
  const en = EN_IMAGES.get(path);
  return en ? en + (query ? `?${query}` : "") : src;
};

type Pending = { key: string; html: boolean; ctx: string };

export class Translator {
  private dict: Record<string, string>;
  private texts = new WeakMap<Text, { src: string; out: string }>();
  private attrs = new WeakMap<Element, Record<string, { src: string; out: string }>>();
  private htmlDone = new WeakMap<Element, string>();
  private pending = new Map<string, Pending>();
  private asked = new Set<string>();
  private observer: MutationObserver | null = null;
  private scheduled = false;
  private flushTimer: number | null = null;
  private titleSrc: { src: string; out: string } | null = null;
  private inflight = 0;

  constructor(dict: Record<string, string>) {
    this.dict = dict;
    // Handle for scripts/i18n: the site crawler reads the dictionary from here.
    (window as unknown as { __nordinvestI18n?: Translator }).__nordinvestI18n = this;
  }

  /** Everything known so far, plus how many requests are still in flight. */
  snapshot() {
    return {
      dict: { ...this.dict },
      asked: Array.from(this.asked).concat(Array.from(this.pending.keys())),
      busy: this.inflight + this.pending.size + (this.flushTimer != null ? 1 : 0),
    };
  }

  merge(more: Record<string, string>) {
    Object.assign(this.dict, more);
  }

  start() {
    this.pass(document.body);
    this.observer = new MutationObserver((records) => {
      for (const r of records) {
        const el = r.target.nodeType === 1 ? (r.target as Element) : r.target.parentElement;
        if (el) this.dirty.add(el);
      }
      this.schedule();
    });
    this.observer.observe(document.body, {
      subtree: true,
      childList: true,
      characterData: true,
      attributes: true,
      attributeFilter: [...ATTRS, "src", "srcset"],
    });
    const title = document.querySelector("title");
    if (title) this.observer.observe(title, { childList: true, characterData: true, subtree: true });
  }

  stop() {
    this.observer?.disconnect();
  }

  private dirty = new Set<Element>();

  // Only the parts of the page that changed are re-translated (whole page if many changed).
  private schedule() {
    if (this.scheduled) return;
    this.scheduled = true;
    requestAnimationFrame(() => {
      this.scheduled = false;
      const roots = Array.from(this.dirty).filter((el) => el.isConnected);
      this.dirty.clear();
      if (roots.length > 40) {
        this.pass(document.body);
        return;
      }
      const top = roots.filter((el) => !roots.some((o) => o !== el && o.contains(el)));
      top.forEach((el) => this.pass(el.closest("[data-i18n-html]") ?? el));
      if (!top.length) this.passTitle();
    });
  }

  /** Translate everything under `root` that isn't translated yet. */
  pass(root: Element) {
    this.passHtml(root);
    this.passText(root);
    this.passAttrs(root);
    this.passImages(root);
    this.passTitle();
    // our own writes would otherwise re-trigger the observer
    this.observer?.takeRecords();
  }

  private skip(el: Element | null): boolean {
    if (!el) return true;
    if (SKIP_TAGS.has(el.tagName)) return true;
    return !!el.closest(SKIP_SELECTOR);
  }

  private lookup(text: string, ctx: string): string | null {
    const { key, nums, lead, trail } = tokenize(text);
    if (!key) return null;
    if (!LETTER.test(key.replace(/⟦\d+⟧/g, ""))) {
      // numbers and symbols only: just switch the number format
      return nums.length ? lead + fill(key, nums) + trail : null;
    }
    const tr = this.dict[key];
    if (tr != null) return lead + fill(tr, nums) + trail;
    this.want(key, false, ctx);
    return null;
  }

  private passText(root: Element) {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode: (n) => {
        const v = n.nodeValue;
        if (!v || !v.trim()) return NodeFilter.FILTER_REJECT;
        const p = n.parentElement;
        if (!p || this.skip(p) || p.closest("[data-i18n-html]")) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      },
    });
    let node = walker.nextNode() as Text | null;
    while (node) {
      const value = node.nodeValue ?? "";
      const seen = this.texts.get(node);
      if (!seen || seen.out !== value) {
        const src = value;
        const ctx = (node.parentElement?.closest("p, li, h1, h2, h3, h4, td, th, dd, dt, label, button, a") ?? node.parentElement)?.textContent ?? "";
        const out = this.lookup(src, ctx.length > 240 ? ctx.slice(0, 240) : ctx);
        if (out != null && out !== src) {
          node.nodeValue = out;
          this.texts.set(node, { src, out });
        } else if (out == null) {
          this.texts.delete(node);
        } else {
          this.texts.set(node, { src, out: src });
        }
      }
      node = walker.nextNode() as Text | null;
    }
  }

  private passAttrs(root: Element) {
    const sel = ATTRS.map((a) => `[${a}]`).join(",");
    const els = root.matches(sel) ? [root, ...Array.from(root.querySelectorAll(sel))] : Array.from(root.querySelectorAll(sel));
    els.forEach((el) => {
      if (this.skip(el) && !(el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.tagName === "SELECT")) return;
      if (el.closest(SKIP_SELECTOR)) return;
      const store = this.attrs.get(el) ?? {};
      for (const a of ATTRS) {
        const v = el.getAttribute(a);
        if (!v || !v.trim()) continue;
        const rec = store[a];
        if (rec && rec.out === v) continue;
        const out = this.lookup(v, "");
        if (out != null && out !== v) {
          el.setAttribute(a, out);
          store[a] = { src: v, out };
        }
      }
      this.attrs.set(el, store);
    });
  }

  private passImages(root: Element) {
    const sel = "img[src], source[srcset]";
    const els = root.matches(sel) ? [root, ...Array.from(root.querySelectorAll(sel))] : Array.from(root.querySelectorAll(sel));
    els.forEach((el) => {
      const attr = el.tagName === "IMG" ? "src" : "srcset";
      const v = el.getAttribute(attr);
      if (!v) return;
      const out = toEnImage(v);
      if (out !== v) el.setAttribute(attr, out);
    });
  }

  private passTitle() {
    const t = document.title;
    if (!t || (this.titleSrc && this.titleSrc.out === t)) return;
    const out = this.lookup(t, "");
    if (out != null && out !== t) {
      document.title = out;
      this.titleSrc = { src: t, out };
    }
  }

  /** Article bodies are translated block by block as HTML, so inline links and bold words stay in the sentence. */
  private passHtml(root: Element) {
    const containers = root.matches?.("[data-i18n-html]")
      ? [root]
      : Array.from(root.querySelectorAll("[data-i18n-html]"));
    for (const c of containers) {
      c.querySelectorAll(HTML_BLOCKS).forEach((block) => {
        if (block.querySelector(HTML_BLOCKS)) return; // translate the innermost blocks only
        const current = block.innerHTML;
        if (this.htmlDone.get(block) === current) return;
        const { key, nums } = tokenizeHtml(current);
        if (!LETTER.test(key.replace(/<[^>]+>/g, ""))) return;
        const tr = this.dict[HTML_KEY + key];
        if (tr != null) {
          const out = fillHtml(tr, nums);
          block.innerHTML = out;
          this.htmlDone.set(block, block.innerHTML);
        } else {
          this.want(HTML_KEY + key, true, "");
        }
      });
    }
  }

  // ── misses: ask the server, then re-run ─────────────────────────────────
  private want(key: string, html: boolean, ctx: string) {
    if (this.asked.has(key) || this.pending.has(key)) return;
    this.pending.set(key, { key, html, ctx });
    if (this.flushTimer == null) this.flushTimer = window.setTimeout(() => this.flush(), 250);
  }

  private async flush() {
    this.flushTimer = null;
    const items = Array.from(this.pending.values());
    this.pending.clear();
    items.forEach((i) => this.asked.add(i.key));
    const chunks: Pending[][] = [];
    let cur: Pending[] = [];
    let size = 0;
    for (const it of items) {
      const len = it.key.length + it.ctx.length;
      if (cur.length && (cur.length >= 40 || size + len > 12000)) {
        chunks.push(cur);
        cur = [];
        size = 0;
      }
      cur.push(it);
      size += len;
    }
    if (cur.length) chunks.push(cur);
    await Promise.all(
      chunks.map(async (chunk) => {
        this.inflight++;
        try {
          let warm: string | null = null;
          try {
            warm = localStorage.getItem("nordinvest-i18n-warm");
          } catch {}
          const res = await fetch("/api/i18n/translate", {
            method: "POST",
            headers: { "Content-Type": "application/json", ...(warm ? { "x-i18n-warm": warm } : {}) },
            body: JSON.stringify({ items: chunk.map((c) => ({ k: c.key, html: c.html, ctx: c.ctx || undefined })) }),
          });
          if (!res.ok) return;
          const data = (await res.json()) as { t?: Record<string, string> };
          if (data.t) {
            this.merge(data.t);
            saveCache(data.t);
          }
        } catch {
          /* offline: the text stays Danish */
        } finally {
          this.inflight--;
        }
      }),
    );
    this.pass(document.body);
  }
}

// Runtime translations are kept in the browser too, so a returning visitor
// never waits for the same sentence twice.
const CACHE_KEY = "nordinvest-i18n-cache-v1";
export function loadCache(): Record<string, string> {
  try {
    return JSON.parse(localStorage.getItem(CACHE_KEY) ?? "{}");
  } catch {
    return {};
  }
}
function saveCache(more: Record<string, string>) {
  try {
    const all = { ...loadCache(), ...more };
    const keys = Object.keys(all);
    if (keys.length > 4000) keys.slice(0, keys.length - 4000).forEach((k) => delete all[k]);
    localStorage.setItem(CACHE_KEY, JSON.stringify(all));
  } catch {}
}
