const BASE_URL = 'https://nordinvest.io';

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
    { url: '/',                   changefreq: 'weekly',  priority: '1.0' },
    { url: '/blog',               changefreq: 'weekly',  priority: '0.9' },
    { url: '/investment-models',  changefreq: 'monthly', priority: '0.7' },
    { url: '/methodology',        changefreq: 'monthly', priority: '0.6' },
  ];

  // Fetch manifest + posts from static CDN files — no filesystem needed
  let blogEntries = [];
  try {
    const origin = `${req.headers['x-forwarded-proto'] || 'https'}://${req.headers.host || 'nordinvest.io'}`;
    const manifestRes = await fetch(`${origin}/content/blog/manifest.json`);
    if (manifestRes.ok) {
      const { posts: slugs } = await manifestRes.json();
      const entries = await Promise.all(slugs.map(async slug => {
        try {
          const r = await fetch(`${origin}/content/blog/${slug}.md`);
          if (!r.ok) return null;
          const meta = parseMeta(await r.text());
          return {
            url:        `/blog/${meta.slug || slug}`,
            lastmod:    meta.date || '',
            changefreq: 'monthly',
            priority:   '0.8',
          };
        } catch { return null; }
      }));
      blogEntries = entries.filter(Boolean).sort((a, b) => b.lastmod > a.lastmod ? 1 : -1);
    }
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
