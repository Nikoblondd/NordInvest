import fs from "node:fs";
import path from "node:path";
import { marked } from "marked";

const BLOG_DIR = path.join(process.cwd(), "content", "blog");

// Lenient frontmatter parser — tolerates unquoted colons in values (e.g. titles),
// which strict YAML rejects. Splits each line on the first ": ".
function splitFrontmatter(raw: string): {
  data: Record<string, unknown>;
  content: string;
} {
  const m = raw.match(/^---\s*\n([\s\S]*?)\n---\s*\n?([\s\S]*)$/);
  if (!m) return { data: {}, content: raw };
  const [, fm, content] = m;
  const data: Record<string, unknown> = {};
  for (const line of fm.split("\n")) {
    if (!line.trim() || /^\s*#/.test(line)) continue;
    const idx = line.indexOf(":");
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim();
    let value = line.slice(idx + 1).trim();
    value = value.replace(/^["']|["']$/g, "");
    if (value.startsWith("[") && value.endsWith("]")) {
      data[key] = value
        .slice(1, -1)
        .split(",")
        .map((s) => s.trim().replace(/^["']|["']$/g, ""))
        .filter(Boolean);
    } else {
      data[key] = value;
    }
  }
  return { data, content };
}

export type PostMeta = {
  slug: string;
  title: string;
  date: string;
  description: string;
  tags: string[];
  author: string;
  image?: string;
  lang: string;
  readingMinutes: number;
};

function readManifestOrder(): string[] {
  try {
    const raw = fs.readFileSync(path.join(BLOG_DIR, "manifest.json"), "utf8");
    return (JSON.parse(raw).posts as string[]) ?? [];
  } catch {
    return [];
  }
}

function parseFile(file: string): { meta: PostMeta; body: string } | null {
  const raw = fs.readFileSync(path.join(BLOG_DIR, file), "utf8");
  const { data, content } = splitFrontmatter(raw);
  if (!data.slug || !data.title) return null;
  const words = content.trim().split(/\s+/).length;
  return {
    meta: {
      slug: String(data.slug),
      title: String(data.title),
      date: String(data.date ?? ""),
      description: String(data.description ?? ""),
      tags: Array.isArray(data.tags) ? data.tags.map(String) : [],
      author: String(data.author ?? "NordInvest"),
      image: data.image ? String(data.image) : undefined,
      lang: String(data.lang ?? "da"),
      readingMinutes: Math.max(1, Math.round(words / 200)),
    },
    body: content,
  };
}

// Danish-only in v2. English source files stay on disk for hreflang later.
export function getAllPosts(): PostMeta[] {
  const files = fs.readdirSync(BLOG_DIR).filter((f) => f.endsWith(".md"));
  const parsed = files
    .map(parseFile)
    .filter((p): p is { meta: PostMeta; body: string } => !!p)
    .map((p) => p.meta)
    .filter((m) => m.lang !== "en");

  const order = readManifestOrder();
  return parsed.sort((a, b) => {
    const ia = order.indexOf(a.slug);
    const ib = order.indexOf(b.slug);
    if (ia !== -1 && ib !== -1) return ia - ib;
    if (ia !== -1) return -1;
    if (ib !== -1) return 1;
    return b.date.localeCompare(a.date);
  });
}

export function getPost(slug: string): { meta: PostMeta; html: string } | null {
  const files = fs.readdirSync(BLOG_DIR).filter((f) => f.endsWith(".md"));
  for (const f of files) {
    const p = parseFile(f);
    if (p && p.meta.slug === slug) {
      return { meta: p.meta, html: marked.parse(p.body) as string };
    }
  }
  return null;
}

export function formatDateDa(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("da-DK", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}
