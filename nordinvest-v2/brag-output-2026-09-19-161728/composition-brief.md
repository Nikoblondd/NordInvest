# Hyperframes Composition Brief: NordInvest

## Objective
Create a short, launch-style brag video for NordInvest — a Danish AI-powered property-investment analyzer. The video must show the actual product flow: paste a Boligsiden URL → get an investment score, four headline metrics, and a rentestress-test in under 60 seconds. Feels like a Danish fintech product film, not a generic SaaS ad.

## Output
- Composition directory: `brag-output-2026-09-19-161728/composition/`
- Rendered video: `brag-output-2026-09-19-161728/brag.mp4`
- Format: **landscape — 1920x1080**
- Duration: **20 seconds**

## Source Material
- Project root: `/Users/nikoblond/Downloads/nordinvest-v2`
- Primary files read: `src/app/page.tsx`, `src/app/analyseren/page.tsx`, `src/components/analyzer/AnalyzerApp.tsx`, `src/components/home/HeroInput.tsx`, `tailwind.config.ts`, `src/app/globals.css`
- Product name: **NordInvest**
- Tagline / strongest claim: **"Analyser ejendomsinvesteringer på under 60 sekunder"**
- Key UI or visual moment to recreate:
  1. The URL input card (rounded 2xl, white, link-icon prefix, blue "Få analysen →" button)
  2. The big Investment Score (Inter Bold, 7xl, blue #2563EB) with the verdict line under it
  3. The 4-metric grid (KeyStat cards with alt-caps labels and tabular-nums values)
  4. The rentestress-bar (segmented green→amber→rose gradient with a current-rate marker)
- Copy that must appear verbatim:
  - `boligsiden.dk/adresse/aavaenget-5-4690-haslev` (URL that gets pasted)
  - `Få analysen`
  - `INVESTMENT SCORE`
  - `63 / 100 · Middel`
  - `Grænsehandel. Marginen er tynd — men holdbar.`
  - `CASH FLOW / MD.` `+112 kr`
  - `NETTOAFKAST` `5,21 %`
  - `KONTANTAFKAST` `0,26 %`
  - `GÆLDSDÆKNING` `1,01`
  - `RENTESTRESS-TEST`
  - `Holder til 6,4 %`
  - `Fra link til dom.`
  - `Under 60 sekunder.`
  - `NordInvest`

## Creative Direction
- Tone preset: **`polished`**
- Creative direction: **"Danish fintech that means business — precise, calm, confident. No confetti."**
- Interpretation: fewer scenes, longer holds. Every number gets time to read. Motion is restrained; the show-off is the speed of the flow itself, not the effects.
- Angle: The video shows the punchline instead of describing it. A property URL gets pasted. The numbers land like a slot-machine hit — but a serious, Danish, well-behaved one. Investors get to see what an evening of Excel work looks like when it takes 60 seconds.
- Hook: cursor pastes the Boligsiden URL into a clean input card
- Outro / punchline: `Fra link til dom. Under 60 sekunder.` on brand navy
- Avoid:
  - Generic SaaS language ("streamline your workflow", "10x faster")
  - Abstract particle/pattern filler
  - Cinematic risers, whooshes, orchestral swells
  - Confetti, glow strobing, meme-y transitions
  - Redesigning the brand — stay on Inter + slate/blue

## Visual Identity
- Background primary: `#F8FAFC` (slate-50 cream)
- Card white: `#FFFFFF`, borders `#E5E7EB`
- Accent blue: `#2563EB`
- Navy dark (outro): `#0F1F3D`
- Positive (cashflow): emerald `#10B981`
- Warning band: amber `#F59E0B`
- Negative / high stress: rose `#E11D48`
- Text primary: `#0F172A`, muted: `#64748B`, mini-label: `#94A3B8`
- Display font: **Inter** — Bold 700, tracking `-0.028em` on headings
- Body font: **Inter** — Regular / Medium 500
- Enable Inter font-feature-settings `tnum, ss01` on all number fields (tabular alignment is critical — this is what makes the numbers feel spreadsheet-precise, not marketing-fluff)
- Card style: `rounded-2xl border border-slate-200 bg-white shadow-sm` — one visual language throughout. Padding: 24px on desktop
- Visual references from the project:
  - `HeroInput`: URL field is centered, rounded-xl, white, link-icon prefix, blue solid CTA on the right
  - `AnalyzerApp` hero card: `INVESTMENT SCORE` mini-label (11px, tracking `0.14em`, slate-400), then the number at text-7xl leading-none blue, then "/ 100 · Middel" alongside in slate-400
  - KeyStat cards: mini-label alt-caps + big tabular value with subtle grey unit suffix
  - Rentestress bar: horizontal rounded-full 6px, three segments (emerald 0-58%, amber 58-80%, rose 80-100%), marker is a dark 2px vertical tick

## Storyboard
Use the storyboard in `brag-plan.md` as the creative contract. Scene summary:

1. **Hook — Paste URL** — 3.0s — clean input card, URL types in character-by-character, "Få analysen →" button pulses
2. **Data fetch** — 2.0s — three status lines fade: `Henter fra Boligsiden…` → `Læser BBR-data…` → `Beregner cashflow…`
3. **Score reveal** — 4.5s — `INVESTMENT SCORE`, then `63` counts up 0→63, then verdict line materializes below
4. **Four headline metrics** — 5.0s — 4 KeyStat cards slide in one per beat (beat-grid), tabular numbers snap in, hold the full set
5. **Rentestress-bar** — 3.0s — gradient bar draws left→right, marker plants at 5%, sub-label "Holder til 6,4 %"
6. **Punchline / outro** — 2.5s — navy full-bleed, `Fra link til dom.` white, `Under 60 sekunder.` blue underneath, `NordInvest` logotype bottom-center

**Total: 20.0s**

## Audio
- Audio role: **sparse professional accents** — a warm business bed under numbers-focused motion
- Audio arc: bed starts on scene 1, music sits back during the score reveal (dip ~2dB), strong-beat locks land on the metric cards, single logo hit on the punchline, 0.5s fade-out
- Music: `happy-beats-business-moves-vol-1-by-ende-dot-app.mp3`
- Music treatment: start at 0.0s of the video, volume ~0.35 (~-14 LUFS), no fade-in, 0.5s fade-out over the outro. Dip -2dB during 5.0s → 8.0s (score count-up) so the number carries.
- Music cue guidance: bundled preset at `~/.claude/skills/brag/assets/music/cues/happy-beats-business-moves-vol-1-by-ende-dot-app.music-cues.json`. Target strong cues:
  - Score reveal (scene 3 payoff): near ~17.02s of music (but visual scene 3 lands at video ~5s; use natural timing for the score, don't force-lock the entire video to music-time)
  - **For the four metrics (scene 4)**: use beat-grid `strength` peaks, four consecutive beats ~0.5s apart. Compute from beats[] starting at scene 4 start (~9.5s of video). Snap each card's `data-start` to the nearest beat ±0.10s. Mark `// beat-grid: metric N`.
  - Punchline card lands on a strongCue near end. Mark `// beat-locked: punchline`.
- Audio-reactive treatment: **subtle**. Only the outro navy card gently breathes brightness with music RMS (±3% brightness). Nothing else reacts. No waveform bars, no equalizer visuals.
- Audio-coupled moments:
  - Scene 1 — URL typing → soft `key.wav`-style clicks per character (dense but low-volume)
  - Scene 1 — button pulse on completion → single `tap-soft.wav`
  - Scene 3 — score number count-up → subtle tick per 10, then a warm `glass-tap.wav` on the landing at 63
  - Scene 4 — each metric card arrival → one crisp `tick.wav` per card (4 total, beat-grid aligned)
  - Scene 5 — bar fill → soft `sweep.wav` matching the 0.6s fill
  - Scene 6 — punchline card → single clean `logo-hit.wav` at the line landing
- SFX selection guidance: sparse and motion-matched. Pick SFX with LOW high-frequency risk (tick, tap, soft key, glass). Avoid any bright airhorns, cinematic risers, whooshes, laser sweeps, or confetti sounds. Prefer files under ~0.4s duration for the metric ticks so they don't overlap.
- SFX analysis guidance: use `~/.claude/skills/brag/assets/sfx/sfx-analysis.md` if present when picking exact files.
- Exact SFX choice: Hyperframes chooses filenames + volumes after the visual animation exists.
- Audio files: copy the chosen music into `composition/assets/music/happy-beats-business-moves-vol-1-by-ende-dot-app.mp3` and any selected SFX into `composition/assets/sfx/`.

## Hyperframes Instructions
Load the composition-building Hyperframes domain skills (`hyperframes-core`, `hyperframes-animation`, `hyperframes-creative`, `hyperframes-keyframes`, `hyperframes-cli`) to build `composition/`. Do NOT enter the `hyperframes` entry-point intent interview — /brag owns the story and hands you a finished contract.

Requirements:
- Show the real UI: URL input card, INVESTMENT SCORE typography, KeyStat cards, rentestress bar. All must look like the actual site.
- All copy verbatim as listed above. Danish characters (æ/ø/å) rendered correctly.
- Total 20s ± 1s. Individual scenes ± 0.3s.
- Every text element gets its reading-time floor: hook URL ~1.2s settled, score number final ~2.0s, verdict line ~1.5s, each KeyStat label+value pair ~0.8s per card + 1.5s hold on full set, rentestress sub-label ~1.2s, punchline card lines ~1.5s each.
- Include music + tasteful SFX (no --no-music, no --no-sfx).
- Treat music cues as guidance. Beat-lock the metric cards (mark `// beat-grid: metric N`) and the punchline card (`// beat-locked: punchline`). Use natural timing for the score count-up.
- Subtle audio-reactive on outro navy background only.
- `npx hyperframes check` must pass with zero errors before render.
