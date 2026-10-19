# Design — NordInvest

Locked design system (19 Oct 2026, second pass). The editorial "printed memo"
experiment (serif, beige paper, mono footnotes) was rejected by Niko as
old-fashioned. The site is now white, modern and plain, in the spirit of
boligflow.dk, and still avoids the AI-template tells.

## Look
- Background white. Light grey `slate-50` (#f7f8fa) only for alternating sections. Never beige.
- Text ink navy `slate-900` (#17213a); secondary `slate-600`. Tailwind `blue-*`
  is remapped to the ink scale, `slate-*` to neutral greys (tailwind.config.ts).
- Meaning colours only: emerald = good, amber = watch, rose = bad.
- Headings: Albert Sans (semibold/bold, tracking −0.02 to −0.03em). Body: Inter.
  No serif, no monospace in the UI.
- Cards: white, 1 px slate-200 border, rounded-2xl, soft shadow only on hero/preview cards.

## Layout
- Landing: hero (headline + lead + 2 CTAs + live proof line) with a real
  analysis card on today's top property; data-source strip; "Hvad en analyse
  indeholder" list; real example with public-record findings; founder; FAQ; CTA.
- Analysis pages: report head (address, verdict in words, one photo), key
  figures in one bordered row, sections separated by a light top border,
  tables for numbers.
- App pages: one centered column where content is a single flow (e.g. Analysér).

## Banned
Two-tone headlines, gradients and glows, dot patterns, uppercase eyebrows,
floating notification cards, fake app mockups with invented data, icon-chip
rows, check-badge lists, gauge/score rings, coloured status dots on tabs,
sparkle (AI) icons, invented numbers.
