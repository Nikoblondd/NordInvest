import { readdir, readFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const BASE_URL = 'https://nordinvest.vercel.app';

function parseMeta(content) {
  const m = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!m) return {};
  const meta = {};
  for (const line of m[1].split('\n')) {
    const i = line.indexOf(':');
    if (i < 0) continue;
    meta[line.slice(0, i).trim()] = line.slice(i + 1).trim().replace(/^["']|["']$/g, '');
  }
  return meta;
}

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/xml; charset=utf-8');
  res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=300');

  const staticPages = [
    { url: '/',     changefreq: 'weekly',  priority: '1.0' },
    { url: '/blog', changefreq: 'weekly',  priority: '0.9' },
  ];

  let blogEntries = [];
  try {
    const dir  = join(__dirname, 'content', 'blog');
    const files = (await readdir(dir)).filter(f => f.endsWith('.md'));
    blogEntries = await Promise.all(files.map(async f => {
      const src  = await readFile(join(dir, f), 'utf-8');
      const meta = parseMeta(src);
      return {
        url:        `/blog/${meta.slug || f.replace('.md', '')}`,
        lastmod:    meta.date || '',
        changefreq: 'monthly',
        priority:   '0.8',
      };
    }));
    blogEntries.sort((a, b) => (b.lastmod > a.lastmod ? 1 : -1));
  } catch (_) {}

  const allPages = [...staticPages, ...blogEntries];

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${allPages.map(p => `  <url>
    <loc>${BASE_URL}${p.url}</loc>${p.lastmod ? `\n    <lastmod>${p.lastmod}</lastmod>` : ''}
    <changefreq>${p.changefreq}</changefreq>
    <priority>${p.priority}</priority>
  </url>`).join('\n')}
</urlset>`;

  res.status(200).send(xml);
}
