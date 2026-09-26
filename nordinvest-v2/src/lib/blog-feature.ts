import fs from "node:fs";
import path from "node:path";

/*
 * "Feature" articles: blog posts with `layout: feature` in their frontmatter get
 * the designed editorial template (hero photo, key facts, table of contents,
 * figures, FAQ schema). Everything else keeps the classic blog layout.
 * Kept separate from lib/blog.ts so the shared parser stays untouched.
 */

const BLOG_DIR = path.join(process.cwd(), "content", "blog");

export type FeatureFact = { value: string; label: string };
export type FeatureExtras = {
  category: string;
  updated: string | null;
  imageAlt: string | null;
  facts: FeatureFact[];
  cta: string | null;
};
export type TocItem = { id: string; text: string };
export type FaqItem = { q: string; a: string };

function frontmatter(slug: string): Record<string, string> | null {
  for (const f of fs.readdirSync(BLOG_DIR)) {
    if (!f.endsWith(".md")) continue;
    const raw = fs.readFileSync(path.join(BLOG_DIR, f), "utf8");
    const m = raw.match(/^---\s*\n([\s\S]*?)\n---/);
    if (!m) continue;
    const data: Record<string, string> = {};
    for (const line of m[1].split("\n")) {
      const i = line.indexOf(":");
      if (i === -1) continue;
      data[line.slice(0, i).trim()] = line.slice(i + 1).trim().replace(/^["']|["']$/g, "");
    }
    if (data.slug === slug) return data;
  }
  return null;
}

export function getFeatureExtras(slug: string): FeatureExtras | null {
  const d = frontmatter(slug);
  if (!d || d.layout !== "feature") return null;
  const facts = (d.facts ?? "")
    .split("|")
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => {
      const i = s.indexOf("=");
      return i === -1 ? { value: s, label: "" } : { value: s.slice(0, i).trim(), label: s.slice(i + 1).trim() };
    });
  return {
    category: d.category || "Guide",
    updated: d.updated || null,
    imageAlt: d.imageAlt || null,
    facts,
    cta: d.cta || null,
  };
}

const slugify = (s: string) =>
  s
    .toLowerCase()
    .replace(/<[^>]+>/g, "")
    .replace(/&[a-z]+;/g, "")
    .replace(/æ/g, "ae")
    .replace(/ø/g, "oe")
    .replace(/å/g, "aa")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

const stripTags = (s: string) =>
  s
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .trim();

/**
 * Prepares rendered markdown for the feature template: anchors on headings (for
 * the table of contents), images promoted to <figure> with their title as
 * caption, "Obs:" blockquotes marked as notes, and the FAQ section extracted
 * for FAQPage structured data.
 */
export function enhanceFeatureHtml(html: string): { html: string; toc: TocItem[]; faq: FaqItem[] } {
  const toc: TocItem[] = [];
  const used = new Set<string>();
  const uniq = (id: string) => {
    let out = id || "afsnit";
    let n = 2;
    while (used.has(out)) out = `${id}-${n++}`;
    used.add(out);
    return out;
  };

  let out = html.replace(/<h2>([\s\S]*?)<\/h2>/g, (_, inner: string) => {
    const id = uniq(slugify(inner));
    toc.push({ id, text: stripTags(inner) });
    return `<h2 id="${id}">${inner}</h2>`;
  });
  out = out.replace(/<h3>([\s\S]*?)<\/h3>/g, (_, inner: string) => `<h3 id="${uniq(slugify(inner))}">${inner}</h3>`);

  // <p><img src alt title></p> -> figure with caption
  out = out.replace(
    /<p>\s*<img src="([^"]+)" alt="([^"]*)"(?: title="([^"]*)")?\s*\/?>\s*<\/p>/g,
    (_, src: string, alt: string, title?: string) =>
      `<figure><img src="${src}" alt="${alt}" loading="lazy" decoding="async" width="1680" height="944" />${
        title ? `<figcaption>${title}</figcaption>` : ""
      }</figure>`,
  );

  out = out.replace(/<blockquote>\s*<p>Obs:/g, '<blockquote class="note"><p><strong>Obs:</strong>');

  // FAQ: every h3 + answer paragraphs under the "Ofte stillede spørgsmål" h2
  const faq: FaqItem[] = [];
  const faqStart = out.search(/<h2 id="[^"]*">Ofte stillede spørgsmål<\/h2>/);
  if (faqStart !== -1) {
    const rest = out.slice(faqStart);
    const end = rest.indexOf("<h2", 5);
    const block = end === -1 ? rest : rest.slice(0, end);
    const re = /<h3 id="[^"]*">([\s\S]*?)<\/h3>([\s\S]*?)(?=<h3|$)/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(block))) faq.push({ q: stripTags(m[1]), a: stripTags(m[2]).replace(/\s+/g, " ") });
  }

  return { html: out, toc, faq };
}
