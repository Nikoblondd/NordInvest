// Edge function — server-side renders the correct <title>, <meta>, OG tags,
// Twitter tags, canonical, hreflang, and Article JSON-LD schema into the
// blog post template BEFORE the browser or Googlebot parses the head.
//
// The client-side loader in blog/post.html still fetches the raw .md and
// re-hydrates the body + head (idempotent). If the client fetch succeeds,
// nothing visible changes. If it fails or is slow, the SSR head already
// has the correct values — no more "NordInvest Blog — Loading…" in SERPs.

export const config = { runtime: 'edge' };

import posts from '../data/blog-posts.mjs';
import template from '../data/blog-post-template.mjs';

const SITE = 'https://www.nordinvest.io';

function esc(s) {
  return String(s || '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function slugFromPath(pathname) {
  // /blog/foo-bar[/] → foo-bar
  const m = pathname.match(/^\/blog\/([^\/?#]+)/);
  return m ? decodeURIComponent(m[1]) : null;
}

function buildJsonLd(slug, post) {
  const url = `${SITE}/blog/${slug}`;
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: post.title,
    description: post.description,
    image: post.image || `${SITE}/nordinvest-logo.png`,
    datePublished: post.date,
    dateModified: post.date,
    inLanguage: post.lang === 'da' ? 'da-DK' : 'en-GB',
    author: { '@type': 'Organization', name: post.author || 'NordInvest', url: SITE },
    publisher: {
      '@type': 'Organization',
      name: 'NordInvest',
      logo: { '@type': 'ImageObject', url: `${SITE}/nordinvest-logo.png` },
    },
    mainEntityOfPage: { '@type': 'WebPage', '@id': url },
    url,
  };
}

function renderHead(slug, post) {
  const url = `${SITE}/blog/${slug}`;
  const title = `${post.title} — NordInvest Blog`;
  const desc  = post.description || '';
  const image = post.image || `${SITE}/nordinvest-logo.png`;
  const lang  = post.lang === 'da' ? 'da' : 'en';
  const localePrimary = lang === 'da' ? 'da_DK' : 'en_GB';
  const localeAlt     = lang === 'da' ? 'en_GB' : 'da_DK';

  // Build hreflang alternates. If this post has a translation counterpart,
  // point to it explicitly; otherwise fall back to the blog index in the
  // other language.
  const otherSlug = post.translation && posts[post.translation] ? post.translation : null;
  const altSameLang = lang === 'da' ? `${SITE}/blog/${slug}` : `${SITE}/blog/${slug}`;
  const altOther    = otherSlug ? `${SITE}/blog/${otherSlug}` : `${SITE}/blog?lang=${lang === 'da' ? 'en' : 'da'}`;
  const alts = lang === 'da'
    ? { da: altSameLang, en: altOther }
    : { en: altSameLang, da: altOther };

  const jsonLd = JSON.stringify(buildJsonLd(slug, post));

  // Replace the placeholder head elements. We keep the client-side IDs in
  // place so the existing hydration code still works (it just overwrites
  // with the same values).
  return template
    .replace(/<html lang="[^"]*"/, `<html lang="${lang}"`)
    .replace(/<title id="page-title">[^<]*<\/title>/, `<title id="page-title">${esc(title)}</title>`)
    .replace(/<meta id="meta-desc" name="description" content="[^"]*">/, `<meta id="meta-desc" name="description" content="${esc(desc)}">`)
    .replace(/<link id="canonical" rel="canonical" href="[^"]*">/, `<link id="canonical" rel="canonical" href="${esc(url)}">`)
    .replace(/<link rel="alternate" hreflang="en" href="[^"]*">/, `<link rel="alternate" hreflang="en" href="${esc(alts.en)}">`)
    .replace(/<link rel="alternate" hreflang="da" href="[^"]*">/, `<link rel="alternate" hreflang="da" href="${esc(alts.da)}">`)
    .replace(/<link rel="alternate" hreflang="x-default" href="[^"]*">/, `<link rel="alternate" hreflang="x-default" href="${esc(alts.en)}">`)
    .replace(/<meta id="og-url"[^>]*content="[^"]*">/, `<meta id="og-url" property="og:url" content="${esc(url)}">`)
    .replace(/<meta id="og-title"[^>]*content="[^"]*">/, `<meta id="og-title" property="og:title" content="${esc(title)}">`)
    .replace(/<meta id="og-desc"[^>]*content="[^"]*">/, `<meta id="og-desc" property="og:description" content="${esc(desc)}">`)
    .replace(/<meta id="og-image"[^>]*content="[^"]*">/, `<meta id="og-image" property="og:image" content="${esc(image)}">`)
    .replace(/<meta property="og:locale" content="[^"]*">/, `<meta property="og:locale" content="${localePrimary}">`)
    .replace(/<meta property="og:locale:alternate" content="[^"]*">/, `<meta property="og:locale:alternate" content="${localeAlt}">`)
    .replace(/<meta id="tw-title"[^>]*content="[^"]*">/, `<meta id="tw-title" name="twitter:title" content="${esc(title)}">`)
    .replace(/<meta id="tw-desc"[^>]*content="[^"]*">/, `<meta id="tw-desc" name="twitter:description" content="${esc(desc)}">`)
    .replace(/<meta id="tw-image"[^>]*content="[^"]*">/, `<meta id="tw-image" name="twitter:image" content="${esc(image)}">`)
    .replace(/<script id="json-ld" type="application\/ld\+json">\{\}<\/script>/, `<script id="json-ld" type="application/ld+json">${jsonLd}</script>`);
}

export default async function handler(req) {
  const { pathname } = new URL(req.url);
  const slug = slugFromPath(pathname);

  const commonHeaders = {
    'Content-Type': 'text/html; charset=utf-8',
    'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
  };

  if (!slug) {
    // Bare /blog — hand back the client-rendered index (unchanged)
    return new Response(template, { status: 200, headers: commonHeaders });
  }

  const post = posts[slug];
  if (!post) {
    // Unknown slug — serve the template so the client 404 flow still runs.
    return new Response(template, { status: 200, headers: commonHeaders });
  }

  return new Response(renderHead(slug, post), { status: 200, headers: commonHeaders });
}
