import { readdir, readFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

function parseFrontmatter(content) {
  const m = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!m) return { meta: {}, excerpt: content.slice(0, 200) };

  const meta = {};
  for (const line of m[1].split('\n')) {
    const i = line.indexOf(':');
    if (i < 0) continue;
    const key = line.slice(0, i).trim();
    const raw = line.slice(i + 1).trim();
    if (raw.startsWith('[') && raw.endsWith(']')) {
      meta[key] = raw.slice(1, -1).split(',').map(s => s.trim().replace(/^["']|["']$/g, ''));
    } else {
      meta[key] = raw.replace(/^["']|["']$/g, '');
    }
  }

  const body    = content.slice(m[0].length).trim();
  const excerpt = meta.description
    || body.replace(/^#{1,6}\s.+$/mg, '').replace(/[*`#\[\]!]/g, '').split('\n')
         .filter(l => l.trim().length > 40).slice(0, 2).join(' ').slice(0, 220);

  return { meta, excerpt };
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=60');

  try {
    const dir   = join(__dirname, 'content', 'blog');
    const files = (await readdir(dir)).filter(f => f.endsWith('.md'));

    const posts = await Promise.all(files.map(async file => {
      const src           = await readFile(join(dir, file), 'utf-8');
      const { meta, excerpt } = parseFrontmatter(src);
      const words         = src.replace(/```[\s\S]*?```/g, '').split(/\s+/).length;
      return {
        slug:        meta.slug  || file.replace('.md', ''),
        title:       meta.title || 'Untitled',
        date:        meta.date  || '',
        description: excerpt,
        tags:        Array.isArray(meta.tags) ? meta.tags : (meta.tags ? [meta.tags] : []),
        image:       meta.image  || null,
        author:      meta.author || 'NordInvest',
        readingTime: Math.max(1, Math.round(words / 220)),
      };
    }));

    posts.sort((a, b) => (b.date > a.date ? 1 : -1));
    res.status(200).json({ success: true, count: posts.length, posts });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}
