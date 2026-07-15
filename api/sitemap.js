const BASE_URL = 'https://www.nordinvest.io';

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
    { url: '/glossary',           changefreq: 'monthly', priority: '0.7' },
    { url: '/methodology',        changefreq: 'monthly', priority: '0.6' },
    { url: '/property-investment-copenhagen', changefreq: 'monthly', priority: '0.8' },
    { url: '/property-investment-stockholm',  changefreq: 'monthly', priority: '0.8' },
    { url: '/property-investment-oslo',       changefreq: 'monthly', priority: '0.8' },
    { url: '/investering-i-ejendom-koebenhavn', changefreq: 'monthly', priority: '0.9' },
    { url: '/investering-i-ejendom-aarhus',     changefreq: 'monthly', priority: '0.9' },
    { url: '/investering-i-ejendom-fyn',        changefreq: 'monthly', priority: '0.9' },
    { url: '/boligsiden-investering-guide',     changefreq: 'monthly', priority: '0.8' },
    { url: '/investere-i-ejendom-danmark-2026', changefreq: 'monthly', priority: '0.95' },
    {
      url: '/brand',
      changefreq: 'monthly',
      priority: '0.6',
      images: [
        { loc: '/brand/nordinvest-logo.png',              title: 'NordInvest logo — primary black wordmark',                              caption: 'NordInvest primary logo for the Nordic and European property investment analyzer.' },
        { loc: '/brand/nordinvest-icon-black.png',        title: 'NordInvest icon — standalone N-mark',                                    caption: 'NordInvest icon used for the ejendomsanalyzer app icon and favicons.' },
        { loc: '/brand/nordinvest-logo-dark-banner.png',  title: 'NordInvest banner — dark mode (white logo on black)',                    caption: 'NordInvest dark-mode banner for social preview, video thumbnails, and press headers.' },
        { loc: '/brand/nordinvest-logo-light-banner.png', title: 'NordInvest banner — light mode (black logo on white)',                   caption: 'NordInvest light-mode banner for editorial articles, blog covers, and presentations.' },
      ],
    },
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

  const escXml = (s) => String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
${allPages.map(p => `  <url>
    <loc>${BASE_URL}${p.url}</loc>${p.lastmod ? `\n    <lastmod>${p.lastmod}</lastmod>` : ''}
    <changefreq>${p.changefreq}</changefreq>
    <priority>${p.priority}</priority>${(p.images || []).map(img => `
    <image:image>
      <image:loc>${BASE_URL}${img.loc}</image:loc>
      <image:title>${escXml(img.title)}</image:title>
      <image:caption>${escXml(img.caption)}</image:caption>
    </image:image>`).join('')}
  </url>`).join('\n')}
</urlset>`;

  res.status(200).send(xml);
}
