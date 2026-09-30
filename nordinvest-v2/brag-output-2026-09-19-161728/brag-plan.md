# Brag Plan: NordInvest

## What is this app?
A Danish AI-powered property-investment analyzer. Paste a link from Boligsiden, EDC, or Home — NordInvest fetches BBR data + the listing's numbers, runs cashflow, DSCR, rentestress and a 10-year projection, and hands back a clear investment verdict in under 60 seconds. What used to be a two-hour Excel exercise for one property.

## The angle
The video shows the punchline instead of describing it. A property URL gets pasted. The numbers land like a slot-machine hit. Score. Cashflow. Rentestress. A verdict. Danish investors have never seen their evening's Excel work done this fast.

**Specific to this project, not generic:** we use a real Boligsiden URL. The numbers on screen are the real numbers the site returns (Åvænget 5, 4690 Haslev, 2.399.000 kr, 130 m²). No mocked SaaS filler.

## Hook (first 2-3 seconds)
Cursor pastes `boligsiden.dk/adresse/aavaenget-5-4690-haslev` into a clean input. Loading spinner blinks twice. Done.

## Key moments (the middle)
- **Big Investment Score reveal** — "63 / 100 · Middel" counts up from 0, blue accent, a verdict line under it: "Grænsehandel. Marginen er tynd."
- **Four headline metrics arrive one by one** — Cashflow, Nettoafkast, Kontantafkast, Gældsdækning. Tabular numbers snap into place.
- **Rentestress-bar** — green→amber→rose gradient. Current-rate marker sits at 5 %. Sub-label: "Holder til 6,4 %."

## Outro / punchline
Full-screen tag on brand navy: **"Fra link til dom. Under 60 sekunder."** Small logotype underneath: NordInvest. Fade.

## User flow worth showing
Real flow: **paste URL → BBR + annoncen henter → score + verdict + nøgletal + rentestress.** This is what the actual site does. Every scene shows product-in-use, not marketing sections.

## Tone
- Preset: `polished`
- Creative direction: "Danish fintech that means business — precise, calm, confident. No confetti."
- Interpretation: fewer scenes, longer holds. Every number gets time to read. Motion is restrained; the show-off is the speed of the flow itself, not the effects.

## Format: landscape — 1920x1080
## Duration: 20 seconds

## Visual identity (from the project)
- Background: `#F8FAFC` (slate-50, cream)
- Card white: `#FFFFFF` with `border #E5E7EB`
- Accent blue: `#2563EB` (primary brand)
- Navy dark: `#0F1F3D` (dark surfaces, outro tag)
- Emerald (positive cashflow): `#10B981`
- Rose (negative / high stress): `#E11D48`
- Amber (warning band): `#F59E0B`
- Text primary: `#0F172A`, muted: `#64748B`
- Display font: **Inter** (bold, tight tracking `-0.028em` on headings)
- Body font: **Inter**
- Strongest visual: the investment score number set enormous (7xl+) with a color-tinted verdict below, plus the horizontal rentestress-bar with segmented gradient.

## Share copy (draft)
> Danske ejendomsinvestorer — hold op med at bruge to timer på et regneark. Indsæt boliglinket. NordInvest svarer på 60 sekunder.

## Audio direction
- Role: sparse professional accents — a warm business bed that doesn't fight the numbers
- Music: `happy-beats-business-moves-vol-1-by-ende-dot-app.mp3` — 120 BPM, upbeat but not aggressive; fits fintech confidence
- Music treatment: start at 0.0s, medium-low volume (~0.35), no fade-in, soft 0.5s fade-out over the outro
- Music cue guidance: track has strong cues at 17.02s, 17.52s, 18.52s — target these for the four-metric snap-ins and the punchline card
- Audio-reactive treatment: none — restraint suits Danish fintech
- SFX posture: sparse and motion-matched. One tick per KeyStat arrival (4 total). A softer glass-tap for the score reveal. One clean logo-hit at outro.
- Audio-coupled moments: paste keystrokes on the URL, tick-tick-tick-tick on the 4 metrics, single hit on the punchline card
- Restraint rule: no whoosh, no swoosh, no cinematic riser. This is fintech, not a movie trailer.

### Music cue guidance
- Track: `happy-beats-business-moves-vol-1-by-ende-dot-app.mp3` (bundled preset, 120 BPM)
- Target strong-cue timestamps for major reveals: 17.02s (score reveal beat), 18.52s (metrics land), 20.02s (rentestress bar), 23.02s (punchline card)
- Beat-grid window for the 4-metric sequential reveal: ~17.02→17.52→18.02→18.52 (every second beat, ~0.5s spacing per card)
- Restraint note: keep music bed under -14 LUFS during the score reveal so the number carries the moment, not the track.

---

## Storyboard

### Scene 1 — Hook: Paste the link — 3.0s
Clean white input field centered on cream background, monospace-ish URL text types in with a subtle cursor. `boligsiden.dk/adresse/aavaenget-5-4690-haslev` fills the field. Blue "Få analysen →" button pulses gently. On the final character, the button flashes.
Sequential/interaction: yes — URL types character by character (~30 chars, snappy), then button glow
Audio intent: quiet keyboard tick per character; single soft button-tap on completion
Audio-coupled idea: typed text with keyboard sound
Music: warm business bed starts
Transition mood: clean → Scene 2

### Scene 2 — Data fetch — 2.0s
Three short status lines fade in and out on the same card position: "Henter fra Boligsiden…" → "Læser BBR-data…" → "Beregner cashflow…". Blue loading dots pulse.
Sequential/interaction: yes — three status lines, each ~0.6s
Audio intent: quiet processing bed, no accent
Audio-coupled idea: none
Music: bed continues, subtle build
Transition mood: soft crossfade → Scene 3

### Scene 3 — Score reveal — 4.5s
The big moment. "INVESTMENT SCORE" mini-label appears. The number "63" scales up in enormous Inter Bold, blue accent, counting from 0 → 63 in ~0.8s. "/ 100 · Middel" sits alongside. A verdict line materializes below: **"Grænsehandel. Marginen er tynd — men holdbar."** Hold 2.5s so the reader takes it in.
Sequential/interaction: yes — number counts up, verdict types in after
Audio intent: soft glass-tap on final number; music sits back so the moment lands
Audio-coupled idea: count-up ticks (subtle), single accent on landing
Music: dip volume slightly during count-up, back up as verdict lands
Transition mood: clean → Scene 4

### Scene 4 — Four headline metrics — 5.0s
The 4-in-a-row card: **CASH FLOW / MD.** `+112 kr` (emerald), **NETTOAFKAST** `5,21 %`, **KONTANTAFKAST** `0,26 %`, **GÆLDSDÆKNING** `1,01` (blue). Each card slides in with a beat, ~0.5s apart. Hold the full set for 2s. Tabular numbers, right-aligned units.
Sequential/interaction: yes — 4 cards, one per beat (targeting music beats 17.02, 17.52, 18.02, 18.52s)
Audio intent: one crisp tick per metric arrival; sync to strong cues
Audio-coupled idea: card-by-card reveal with tick
Music: strong beats align with card arrivals
Transition mood: clean → Scene 5

### Scene 5 — Rentestress-bar — 3.0s
Horizontal gradient bar labeled "RENTESTRESS-TEST" — green from 3→5%, amber 5→7%, rose 7→9%. Current-rate marker (a dark vertical tick) sits at 5%. Sub-label fades in: **"Holder til 6,4 %."** with a small shield-check icon.
Sequential/interaction: yes — bar draws left→right (~0.6s), then marker plants, then sub-label
Audio intent: soft sweep as the bar fills; nothing more
Audio-coupled idea: sweep/fill sound
Music: bed rides
Transition mood: soft crossfade → Scene 6

### Scene 6 — Punchline / outro — 2.5s
Full-screen navy `#0F1F3D`. Center: **"Fra link til dom."** in Inter Bold white, tracked tight. Second line, half size: **"Under 60 sekunder."** in blue `#2563EB`. Bottom-center small logotype: `NordInvest` in white with a subtle mark to the left. Fade.
Sequential/interaction: yes — two headline lines land ~0.4s apart, logo settles after
Audio intent: one clean punctuation hit; music resolves and starts fade
Audio-coupled idea: single logo-hit on the punchline card
Music: last strong cue at 23.02s → soft 0.5s fade-out
Transition mood: dramatic → end

---

**Music mood for this video:** upbeat but restrained — Danish fintech confidence
**Audio summary:** A warm 120 BPM business-y bed carries the whole video; four crisp ticks land on the metric cards, a soft glass-tap punctuates the score reveal, and a single clean hit closes on the punchline. No whoosh, no riser, no confetti.
