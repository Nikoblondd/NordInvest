# Design — NordInvest

Locked design system (Hallmark redesign, 19 Oct 2026). Every page reads this
first. Written after a professional investor said the site felt AI-generated.
The site should read like a property analysis on paper: dated, sourced,
signed. Not like a SaaS template.

## Genre
editorial

## Macrostructure family
- Marketing (forside): Long Document shaped as an *investeringsnotat*: one
  column at reading measure, headings that grow out of the prose, tables with
  footnoted sources, a worked example on a real property, the founder's
  signature. One understated primary button; the rest are typographic links.
- Analysis pages (/e, analyseren, app analysis): report layout. Report head
  (date, address, verdict in words), tables with hairline rules, sections
  separated by space and a top rule. No shadowed cards, no KPI tile grids,
  no tinted alternating bands.
- App pages: function first; same type, colour and rules. No enrichment.

## Theme (tokens in src/app/globals.css :root, Tailwind remap in tailwind.config.ts)
- paper `#f6f4ef` · paper-2 `#fbfaf7` · ink `#17213a` · ink-2 `#3c4153`
- muted `#555661` · rule `#e4e0d8`
- accent: brick `#9a3b26` (Danish red brick). Footnote marks, link underlines,
  focus. Under 5 % of any view. Never a button fill, never a background.
- Meaning colours: emerald = good, amber = watch, rose = bad. Never decoration.
- Tailwind `blue-*` is remapped to the ink scale, `slate-*` to warm neutrals.

## Typography
- Display: Source Serif 4, 600, roman only (no italic headings), tracking −0.01em.
- Body: IBM Plex Sans 400/500/600 (carried on --font-inter and --font-geist).
- Mono: IBM Plex Mono for footnotes, sources, colophon.
- Numbers in tables: tabular-nums. Big display figures: proportional.

## Motion
None on marketing pages. No reveals, no count-ups, no 3D, no floating cards.
UI state changes ≤ 200 ms opacity/transform.

## CTA voice
- Primary: ink fill, 8 px radius, "Anmod om adgang".
- Secondary: typographic link with brick underline, "→" allowed.

## Banned (AI tells seen on this site before)
Two-tone headlines, gradients and radial glows, dot patterns, uppercase
eyebrows on sections, floating notification cards, re-drawn app mockups with
invented data, icon-chip rows, check-badge lists, stat strips with left rules,
shadowed cards, 4 equal KPI tiles, score rings as decoration, dark navy bands
with framed screenshots, 4-column link footers with © line.

## What pages must share
Wordmark, paper/ink/brick, Source Serif + Plex, hairline rule language,
footnoted sources, the founder's name and phone on analysis pages.
