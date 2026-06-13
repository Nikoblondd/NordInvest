import { readdir, readFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ── Markdown parser ───────────────────────────────────────────────────────
function esc(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}
function slugId(s) {
  return s.toLowerCase().replace(/[*_`[\]]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
}
function inline(s) {
  return s
    .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" loading="lazy">')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>')
    .replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/__(.+?)__/g, '<strong>$1</strong>')
    .replace(/_(.+?)_/g, '<em>$1</em>')
    .replace(/`([^`]+)`/g, (_,c) => `<code>${esc(c)}</code>`);
}

function markdownToHtml(md) {
  const out   = [];
  const lines = md.split('\n');
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Fenced code block
    if (line.match(/^```/)) {
      const lang      = line.slice(3).trim() || 'text';
      const codeLines = [];
      i++;
      while (i < lines.length && !lines[i].match(/^```/)) { codeLines.push(lines[i]); i++; }
      out.push(`<pre><code class="language-${esc(lang)}">${esc(codeLines.join('\n'))}</code></pre>`);
      i++; continue;
    }

    // Heading
    const hm = line.match(/^(#{1,6})\s+(.+)/);
    if (hm) {
      const lvl = hm[1].length, txt = hm[2];
      out.push(`<h${lvl} id="${slugId(txt)}">${inline(txt)}</h${lvl}>`);
      i++; continue;
    }

    // Horizontal rule
    if (line.match(/^(-{3,}|\*{3,}|_{3,})$/)) {
      out.push('<hr>'); i++; continue;
    }

    // Blockquote
    if (line.startsWith('> ')) {
      const bq = [];
      while (i < lines.length && lines[i].startsWith('> ')) { bq.push(lines[i].slice(2)); i++; }
      out.push(`<blockquote><p>${inline(bq.join(' '))}</p></blockquote>`);
      continue;
    }

    // Unordered list
    if (line.match(/^[-*+] /)) {
      const items = [];
      while (i < lines.length && lines[i].match(/^[-*+] /)) {
        items.push(`<li>${inline(lines[i].replace(/^[-*+] /,''))}</li>`); i++;
      }
      out.push(`<ul>${items.join('')}</ul>`); continue;
    }

    // Ordered list
    if (line.match(/^\d+\. /)) {
      const items = [];
      while (i < lines.length && lines[i].match(/^\d+\. /)) {
        items.push(`<li>${inline(lines[i].replace(/^\d+\. /,''))}</li>`); i++;
      }
      out.push(`<ol>${items.join('')}</ol>`); continue;
    }

    // Table
    if (line.match(/^\|/) && i + 1 < lines.length && lines[i + 1].match(/^\|[\s\-|:]+\|/)) {
      const headers = line.split('|').filter((_,j,a) => j > 0 && j < a.length - 1)
                          .map(c => `<th>${inline(c.trim())}</th>`).join('');
      i += 2; // skip header + separator
      const rows = [];
      while (i < lines.length && lines[i].match(/^\|/)) {
        const cells = lines[i].split('|').filter((_,j,a) => j > 0 && j < a.length - 1)
                               .map(c => `<td>${inline(c.trim())}</td>`).join('');
        rows.push(`<tr>${cells}</tr>`); i++;
      }
      out.push(`<table><thead><tr>${headers}</tr></thead><tbody>${rows.join('')}</tbody></table>`);
      continue;
    }

    // Empty line
    if (!line.trim()) { i++; continue; }

    // Paragraph — consume until blank line or block element
    const para = [];
    while (i < lines.length && lines[i].trim() &&
           !lines[i].match(/^(#{1,6} |```|> |\d+\. |[-*+] |-{3,}|\*{3,}|\|)/) ) {
      para.push(lines[i]); i++;
    }
    if (para.length) out.push(`<p>${inline(para.join(' '))}</p>`);
  }

  return out.join('\n');
}

// ── Frontmatter parser ────────────────────────────────────────────────────
function parseFrontmatter(content) {
  const m = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!m) return { meta: {}, body: content };

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
  return { meta, body: content.slice(m[0].length).trim() };
}

// ── Table of contents ─────────────────────────────────────────────────────
function extractToc(md) {
  return md.split('\n')
    .filter(l => l.match(/^#{2,3} /))
    .map(l => {
      const m = l.match(/^(#{2,3}) (.+)/);
      return m ? { level: m[1].length, text: m[2].replace(/[*_`]/g,''), id: slugId(m[2]) } : null;
    })
    .filter(Boolean);
}

// ── Handler ───────────────────────────────────────────────────────────────
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');

  const slug = req.query.slug || '';
  if (!slug || slug.includes('..') || slug.includes('/')) {
    return res.status(400).json({ error: 'invalid slug' });
  }

  const dir = join(__dirname, 'content', 'blog');

  // Find file matching slug (meta.slug or filename)
  let targetFile = null;
  let targetContent = null;
  try {
    const files = (await readdir(dir)).filter(f => f.endsWith('.md'));
    for (const file of files) {
      const src = await readFile(join(dir, file), 'utf-8');
      const { meta } = parseFrontmatter(src);
      const fileSlug = meta.slug || file.replace('.md','');
      if (fileSlug === slug) { targetFile = file; targetContent = src; break; }
    }
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }

  if (!targetContent) {
    return res.status(404).json({ error: 'Post not found', slug });
  }

  const { meta, body } = parseFrontmatter(targetContent);
  const html          = markdownToHtml(body);
  const toc           = extractToc(body);
  const words         = body.replace(/```[\s\S]*?```/g,'').split(/\s+/).filter(Boolean).length;
  const readingTime   = Math.max(1, Math.round(words / 220));

  // Related posts: same tags, exclude self
  let related = [];
  try {
    const files    = (await readdir(dir)).filter(f => f.endsWith('.md') && f !== targetFile);
    const postTags = Array.isArray(meta.tags) ? meta.tags : (meta.tags ? [meta.tags] : []);
    const others   = await Promise.all(files.map(async f => {
      const src      = await readFile(join(dir, f), 'utf-8');
      const { meta: m } = parseFrontmatter(src);
      const tags     = Array.isArray(m.tags) ? m.tags : (m.tags ? [m.tags] : []);
      const shared   = tags.filter(t => postTags.includes(t)).length;
      return { slug: m.slug || f.replace('.md',''), title: m.title || 'Untitled',
               date: m.date || '', tags, shared };
    }));
    related = others.filter(p => p.shared > 0)
                    .sort((a,b) => b.shared - a.shared || (b.date > a.date ? 1 : -1))
                    .slice(0, 3);
    if (related.length < 2) {
      const rest = others.filter(p => !related.find(r => r.slug === p.slug))
                         .sort((a,b) => b.date > a.date ? 1 : -1);
      related = [...related, ...rest].slice(0, 3);
    }
  } catch (_) {}

  res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=60');
  res.status(200).json({
    success: true,
    meta: {
      slug:        meta.slug || slug,
      title:       meta.title       || 'Untitled',
      date:        meta.date        || '',
      description: meta.description || '',
      tags:        Array.isArray(meta.tags) ? meta.tags : (meta.tags ? [meta.tags] : []),
      author:      meta.author      || 'NordInvest',
      image:       meta.image       || null,
      readingTime,
    },
    toc,
    html,
    related,
  });
}
