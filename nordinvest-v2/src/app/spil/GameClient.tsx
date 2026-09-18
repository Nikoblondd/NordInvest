"use client";

import { useMemo, useState } from "react";
import "./game.css";

/* ---------- types ---------- */

type GameProperty = {
  id: string;
  price: number;
  area: number;
  rooms?: number;
  yearBuilt?: number;
  energyLabel?: string;
  monthlyExpenses?: number;
  propertyType?: string;
  address: string;
  city: string;
  zipCode: string;
  images: string[];
};

type Player = { id: number; name: string; score: number };

type HintKey = "address" | "area" | "rooms" | "year" | "energy" | "expense";

type Phase = "setup" | "loading" | "guessing" | "roundResult" | "final" | "error";

type PlayerGuess = { raw: string; value: number | null; locked: boolean };

/* ---------- constants ---------- */

const HINTS: { key: HintKey; label: string; cost: number }[] = [
  { key: "address", label: "Vis by / område", cost: 2 },
  { key: "area", label: "Vis areal (m²)", cost: 2 },
  { key: "rooms", label: "Vis værelser", cost: 2 },
  { key: "year", label: "Vis byggeår", cost: 2 },
  { key: "energy", label: "Vis energimærke", cost: 2 },
  { key: "expense", label: "Vis ejerudgift", cost: 2 },
];

const REGIONS: { key: string; label: string; group: string }[] = [
  { key: "hele-dk", label: "Hele Danmark", group: "Landsdele" },
  { key: "sjaelland", label: "Sjælland", group: "Landsdele" },
  { key: "fyn", label: "Fyn", group: "Landsdele" },
  { key: "jylland", label: "Jylland", group: "Landsdele" },
  { key: "kbh", label: "Storkøbenhavn", group: "Byer" },
  { key: "aarhus", label: "Aarhus", group: "Byer" },
  { key: "odense", label: "Odense", group: "Byer" },
  { key: "aalborg", label: "Aalborg", group: "Byer" },
  { key: "esbjerg", label: "Esbjerg", group: "Byer" },
  { key: "vejle", label: "Vejle", group: "Byer" },
  { key: "randers", label: "Randers", group: "Byer" },
  { key: "kolding", label: "Kolding", group: "Byer" },
  { key: "horsens", label: "Horsens", group: "Byer" },
  { key: "roskilde", label: "Roskilde", group: "Byer" },
  { key: "helsingoer", label: "Helsingør", group: "Byer" },
  { key: "fredensborg", label: "Fredensborg", group: "Byer" },
  { key: "hilleroed", label: "Hillerød", group: "Byer" },
  { key: "koege", label: "Køge", group: "Byer" },
  { key: "naestved", label: "Næstved", group: "Byer" },
  { key: "slagelse", label: "Slagelse", group: "Byer" },
  { key: "holbaek", label: "Holbæk", group: "Byer" },
  { key: "frederikshavn", label: "Frederikshavn", group: "Byer" },
  { key: "silkeborg", label: "Silkeborg", group: "Byer" },
  { key: "viborg", label: "Viborg", group: "Byer" },
  { key: "herning", label: "Herning", group: "Byer" },
];

const ROUND_OPTIONS = [3, 5, 10, 15, 20];

/* ---------- helpers ---------- */

const fmt = (n: number) =>
  new Intl.NumberFormat("da-DK", { maximumFractionDigits: 0 }).format(n);

const kr = (n: number) => `${fmt(n)} kr`;
const krMd = (n: number) => `${fmt(n)} kr/md.`;

// Parse Danish-style number input: "4.300.000 kr" / "4300000" / "4,3 mio" → number
function parseGuess(raw: string): number | null {
  if (!raw) return null;
  const s = raw.toLowerCase().replace(/kr|\.|\s|dkk/g, "").replace(/,/g, ".");
  const mio = /mio|m/.test(s);
  const cleaned = s.replace(/[^0-9.]/g, "");
  if (!cleaned) return null;
  let n = Number(cleaned);
  if (!isFinite(n)) return null;
  if (mio && n < 100) n = n * 1_000_000;
  if (n < 1000) return null;
  return Math.round(n);
}

// Score curve: closest wins, points scale with % accuracy.
// 100 base points, minus 5× the % diff — so 0% off = 100 pts, 10% off = 50 pts,
// 20% off = 0 pts. Only the closest player wins the round bonus.
function scoreForDiffPct(pctDiff: number): number {
  const raw = 100 - Math.round(pctDiff * 5);
  return Math.max(0, Math.min(100, raw));
}

/* ============================================================
   Root component
============================================================ */

export default function GameClient() {
  const [phase, setPhase] = useState<Phase>("setup");
  const [error, setError] = useState<string>("");

  // setup
  const [players, setPlayers] = useState<Player[]>([
    { id: 1, name: "Spiller 1", score: 0 },
    { id: 2, name: "Spiller 2", score: 0 },
  ]);
  const [region, setRegion] = useState<string>("hele-dk");
  const [roundCount, setRoundCount] = useState<number>(10);

  // game state
  const [properties, setProperties] = useState<GameProperty[]>([]);
  const [currentRound, setCurrentRound] = useState<number>(0); // 0-indexed
  const [revealed, setRevealed] = useState<Set<HintKey>>(new Set());
  const [guesses, setGuesses] = useState<Record<number, PlayerGuess>>({});
  const [imageIdx, setImageIdx] = useState<number>(0);

  /* ---------- start game ---------- */
  async function startGame() {
    setError("");
    setPhase("loading");
    try {
      const res = await fetch(
        `/api/game/properties?region=${encodeURIComponent(region)}&count=${roundCount}`,
        { cache: "no-store" },
      );
      const j = await res.json();
      if (!j?.ok || !Array.isArray(j.properties) || j.properties.length < 3) {
        setError("Kunne ikke hente nok boliger til dette område. Prøv en anden region.");
        setPhase("error");
        return;
      }
      setProperties(j.properties as GameProperty[]);
      setCurrentRound(0);
      setRevealed(new Set());
      setImageIdx(0);
      setGuesses(
        Object.fromEntries(players.map((p) => [p.id, { raw: "", value: null, locked: false }])),
      );
      setPlayers(players.map((p) => ({ ...p, score: 0 })));
      setPhase("guessing");
    } catch {
      setError("Netværksfejl. Prøv igen.");
      setPhase("error");
    }
  }

  /* ---------- player list mgmt ---------- */
  function addPlayer() {
    if (players.length >= 8) return;
    const nextId = Math.max(...players.map((p) => p.id)) + 1;
    setPlayers([...players, { id: nextId, name: `Spiller ${nextId}`, score: 0 }]);
  }
  function removePlayer(id: number) {
    if (players.length <= 2) return;
    setPlayers(players.filter((p) => p.id !== id));
  }
  function renamePlayer(id: number, name: string) {
    setPlayers(players.map((p) => (p.id === id ? { ...p, name } : p)));
  }

  /* ---------- hints ---------- */
  function revealHint(key: HintKey) {
    if (revealed.has(key)) return;
    const next = new Set(revealed);
    next.add(key);
    setRevealed(next);
    // Everyone pays the cost — clamped at 0 so nobody goes negative from hints
    setPlayers((ps) =>
      ps.map((p) => ({ ...p, score: Math.max(0, p.score - HINTS.find((h) => h.key === key)!.cost) })),
    );
  }

  /* ---------- guessing ---------- */
  function setGuess(playerId: number, raw: string) {
    const value = parseGuess(raw);
    setGuesses((g) => ({
      ...g,
      [playerId]: { ...(g[playerId] ?? { raw: "", value: null, locked: false }), raw, value },
    }));
  }
  function lockGuess(playerId: number) {
    setGuesses((g) => {
      const cur = g[playerId];
      if (!cur || cur.value == null) return g;
      // Normalise the displayed string on lock so it shows Danish-formatted kr
      return { ...g, [playerId]: { ...cur, raw: fmt(cur.value), locked: true } };
    });
  }
  function unlockGuess(playerId: number) {
    setGuesses((g) => ({
      ...g,
      [playerId]: { ...(g[playerId] ?? { raw: "", value: null, locked: false }), locked: false },
    }));
  }

  const allLocked = useMemo(
    () => players.every((p) => guesses[p.id]?.locked && guesses[p.id]?.value != null),
    [players, guesses],
  );

  /* ---------- reveal round result ---------- */
  const currentProperty = properties[currentRound];

  function revealPrice() {
    if (!currentProperty || !allLocked) return;
    // find closest guess — winner gets score-for-diff, others get 0 bonus
    const actual = currentProperty.price;
    const scored = players
      .map((p) => {
        const g = guesses[p.id]!;
        const diff = Math.abs((g.value ?? 0) - actual);
        const pct = (diff / actual) * 100;
        return { p, guess: g.value!, diff, pct };
      })
      .sort((a, b) => a.diff - b.diff);
    const winner = scored[0];
    const winnerBonus = scoreForDiffPct(winner.pct);
    setPlayers((ps) =>
      ps.map((p) => (p.id === winner.p.id ? { ...p, score: p.score + winnerBonus } : p)),
    );
    setPhase("roundResult");
  }

  function nextRound() {
    const next = currentRound + 1;
    if (next >= properties.length) {
      setPhase("final");
      return;
    }
    setCurrentRound(next);
    setRevealed(new Set());
    setImageIdx(0);
    setGuesses(
      Object.fromEntries(players.map((p) => [p.id, { raw: "", value: null, locked: false }])),
    );
    setPhase("guessing");
  }

  function playAgain() {
    setPhase("setup");
    setProperties([]);
    setCurrentRound(0);
    setRevealed(new Set());
    setGuesses({});
    setPlayers(players.map((p) => ({ ...p, score: 0 })));
  }

  /* =========================================================
     Render
  ========================================================= */
  return (
    <div className="game-page">
      <header className="game-header">
        <div className="game-header-inner">
          <a href="/" className="brand-link">
            <span className="brand-mark" aria-hidden>◆</span>
            <span className="brand-name">NordInvest</span>
          </a>
          <h1 className="page-title">GÆT BOLIGPRISEN</h1>
          <a href="/" className="header-back">← Analyseren</a>
        </div>
        <nav className="crumb-bar" aria-label="Menu">
          <span className="crumb">Multiplayer</span>
          <span className="crumb-sep">·</span>
          <span className="crumb">Rigtige danske boliger</span>
          <span className="crumb-sep">·</span>
          <span className="crumb">Gratis</span>
        </nav>
      </header>

      <div className="game-shell">
        {/* LEFT AD RAIL */}
        <aside className="ad-rail ad-rail-left" aria-label="Reklame">
          <div className="ad-slot ad-160x600">
            <span className="ad-label">Reklame</span>
            <span className="ad-hint">160 × 600</span>
          </div>
          <div className="ad-slot ad-160x300">
            <span className="ad-label">Reklame</span>
            <span className="ad-hint">160 × 300</span>
          </div>
        </aside>

        {/* MAIN GAME AREA */}
        <main className="game-main">
          {phase === "setup" && (
            <SetupScreen
              players={players}
              onAdd={addPlayer}
              onRemove={removePlayer}
              onRename={renamePlayer}
              region={region}
              setRegion={setRegion}
              roundCount={roundCount}
              setRoundCount={setRoundCount}
              onStart={startGame}
            />
          )}

          {phase === "loading" && <LoadingScreen region={region} />}

          {phase === "error" && (
            <div className="panel error-panel">
              <div className="panel-title">Fejl</div>
              <p style={{ margin: "12px 0" }}>{error}</p>
              <button className="btn btn-primary" onClick={() => setPhase("setup")}>
                Tilbage
              </button>
            </div>
          )}

          {phase === "guessing" && currentProperty && (
            <GuessingScreen
              property={currentProperty}
              roundIdx={currentRound}
              totalRounds={properties.length}
              revealed={revealed}
              onReveal={revealHint}
              players={players}
              guesses={guesses}
              onGuess={setGuess}
              onLock={lockGuess}
              onUnlock={unlockGuess}
              onRevealPrice={revealPrice}
              allLocked={allLocked}
              imageIdx={imageIdx}
              setImageIdx={setImageIdx}
            />
          )}

          {phase === "roundResult" && currentProperty && (
            <RoundResultScreen
              property={currentProperty}
              roundIdx={currentRound}
              totalRounds={properties.length}
              players={players}
              guesses={guesses}
              onNext={nextRound}
              isFinal={currentRound === properties.length - 1}
            />
          )}

          {phase === "final" && (
            <FinalScreen players={players} onPlayAgain={playAgain} />
          )}
        </main>

        {/* RIGHT AD RAIL */}
        <aside className="ad-rail ad-rail-right" aria-label="Reklame">
          <div className="ad-slot ad-160x600">
            <span className="ad-label">Reklame</span>
            <span className="ad-hint">160 × 600</span>
          </div>
          <div className="ad-slot ad-160x300">
            <span className="ad-label">Reklame</span>
            <span className="ad-hint">160 × 300</span>
          </div>
        </aside>
      </div>

      {/* Bottom banner ad */}
      <div className="ad-banner-wrap">
        <div className="ad-slot ad-728x90">
          <span className="ad-label">Reklame</span>
          <span className="ad-hint">728 × 90</span>
        </div>
      </div>

      <footer className="game-footer">
        <div>
          Data fra <a href="https://boligsiden.dk" target="_blank" rel="noopener">Boligsiden</a> ·
          Priser vist er aktuelle udbudspriser · Spillet er gratis og gemmer ingenting.
        </div>
        <div>
          <a href="/">← Tilbage til NordInvest analyseren</a>
        </div>
      </footer>
    </div>
  );
}

/* ============================================================
   Setup screen
============================================================ */

function SetupScreen(props: {
  players: Player[];
  onAdd: () => void;
  onRemove: (id: number) => void;
  onRename: (id: number, name: string) => void;
  region: string;
  setRegion: (r: string) => void;
  roundCount: number;
  setRoundCount: (n: number) => void;
  onStart: () => void;
}) {
  const groups = useMemo(() => {
    const g: Record<string, typeof REGIONS> = {};
    for (const r of REGIONS) (g[r.group] ||= []).push(r);
    return g;
  }, []);

  return (
    <div className="setup-grid">
      <section className="panel">
        <div className="panel-title">1. Spillere <span className="panel-title-sub">(min. 2 · max. 8)</span></div>
        <div className="player-list">
          {props.players.map((p, i) => (
            <div key={p.id} className="player-row">
              <span className="player-badge" style={{ background: playerColor(i) }}>{i + 1}</span>
              <input
                type="text"
                className="input player-name-input"
                value={p.name}
                onChange={(e) => props.onRename(p.id, e.target.value.slice(0, 20))}
                maxLength={20}
                placeholder={`Spiller ${i + 1}`}
              />
              {props.players.length > 2 && (
                <button className="btn-icon" onClick={() => props.onRemove(p.id)} aria-label="Fjern spiller">
                  ×
                </button>
              )}
            </div>
          ))}
          {props.players.length < 8 && (
            <button className="btn btn-outline btn-add-player" onClick={props.onAdd}>
              + Tilføj spiller
            </button>
          )}
        </div>
      </section>

      <section className="panel">
        <div className="panel-title">2. Område</div>
        {Object.entries(groups).map(([group, list]) => (
          <div key={group} className="region-group">
            <div className="region-group-title">{group}</div>
            <div className="region-chips">
              {list.map((r) => (
                <button
                  key={r.key}
                  className={`chip ${props.region === r.key ? "chip-active" : ""}`}
                  onClick={() => props.setRegion(r.key)}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </div>
        ))}
      </section>

      <section className="panel">
        <div className="panel-title">3. Runder pr. spil</div>
        <div className="round-chips">
          {ROUND_OPTIONS.map((n) => (
            <button
              key={n}
              className={`chip ${props.roundCount === n ? "chip-active" : ""}`}
              onClick={() => props.setRoundCount(n)}
            >
              {n} boliger
            </button>
          ))}
        </div>

        <div className="rules-box">
          <div className="rules-title">Sådan spiller I</div>
          <ol>
            <li>Alle ser billederne af boligen — ingen tal, ingen adresse.</li>
            <li>Har I brug for hjælp? Tryk på et hint — hele holdet mister <strong>2 point</strong>.</li>
            <li>Hver spiller skriver sit gæt i kroner og trykker <strong>LÅS</strong>.</li>
            <li>Når alle har låst, afsløres prisen. Tættest på scorer op til <strong>100 point</strong>.</li>
          </ol>
        </div>

        <button className="btn btn-primary btn-start" onClick={props.onStart}>
          START SPIL →
        </button>
      </section>
    </div>
  );
}

/* ============================================================
   Loading
============================================================ */

function LoadingScreen({ region }: { region: string }) {
  const label = REGIONS.find((r) => r.key === region)?.label ?? region;
  return (
    <div className="panel loading-panel">
      <div className="spinner" />
      <div className="loading-title">Henter boliger fra {label}...</div>
      <div className="loading-sub">Vi trækker rigtige, aktive boliger fra Boligsiden</div>
    </div>
  );
}

/* ============================================================
   Guessing screen
============================================================ */

function GuessingScreen(props: {
  property: GameProperty;
  roundIdx: number;
  totalRounds: number;
  revealed: Set<HintKey>;
  onReveal: (k: HintKey) => void;
  players: Player[];
  guesses: Record<number, PlayerGuess>;
  onGuess: (id: number, raw: string) => void;
  onLock: (id: number) => void;
  onUnlock: (id: number) => void;
  onRevealPrice: () => void;
  allLocked: boolean;
  imageIdx: number;
  setImageIdx: (n: number) => void;
}) {
  const p = props.property;
  return (
    <>
      <div className="round-bar">
        <div className="round-label">Runde <strong>{props.roundIdx + 1}</strong> af {props.totalRounds}</div>
        <div className="mini-scoreboard">
          {props.players.map((pl, i) => (
            <div key={pl.id} className="mini-score">
              <span className="mini-badge" style={{ background: playerColor(i) }}>{i + 1}</span>
              <span className="mini-name">{pl.name}</span>
              <span className="mini-pts">{pl.score} p</span>
            </div>
          ))}
        </div>
      </div>

      <div className="stage">
        <div className="gallery-wrap">
          <div className="gallery-main">
            {p.images[props.imageIdx] ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={p.images[props.imageIdx]}
                alt={`Bolig — billede ${props.imageIdx + 1} af ${p.images.length}`}
                className="gallery-img"
              />
            ) : (
              <div className="gallery-empty">Ingen billeder</div>
            )}
            {p.images.length > 1 && (
              <>
                <button
                  className="gallery-nav gallery-prev"
                  onClick={() => props.setImageIdx((props.imageIdx - 1 + p.images.length) % p.images.length)}
                  aria-label="Forrige billede"
                >‹</button>
                <button
                  className="gallery-nav gallery-next"
                  onClick={() => props.setImageIdx((props.imageIdx + 1) % p.images.length)}
                  aria-label="Næste billede"
                >›</button>
                <div className="gallery-count">
                  {props.imageIdx + 1} / {p.images.length}
                </div>
              </>
            )}
          </div>
          <div className="gallery-thumbs">
            {p.images.slice(0, 12).map((src, i) => (
              <button
                key={src}
                className={`thumb ${i === props.imageIdx ? "thumb-active" : ""}`}
                onClick={() => props.setImageIdx(i)}
                aria-label={`Vis billede ${i + 1}`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={src} alt="" />
              </button>
            ))}
          </div>
        </div>

        <aside className="side-panel">
          <div className="panel-title panel-title-tight">Hints (koster 2 point pr. stk.)</div>
          <div className="hint-list">
            {HINTS.map((h) => {
              const isRevealed = props.revealed.has(h.key);
              const value = hintValue(h.key, p);
              return (
                <button
                  key={h.key}
                  className={`hint-btn ${isRevealed ? "hint-btn-revealed" : ""}`}
                  disabled={isRevealed || value == null}
                  onClick={() => props.onReveal(h.key)}
                >
                  {isRevealed ? (
                    <>
                      <span className="hint-key">{hintShortLabel(h.key)}</span>
                      <span className="hint-value">{value ?? "—"}</span>
                    </>
                  ) : (
                    <>
                      <span className="hint-key">{h.label}</span>
                      <span className="hint-cost">−{h.cost}</span>
                    </>
                  )}
                </button>
              );
            })}
          </div>

          <div className="panel-title panel-title-tight" style={{ marginTop: 20 }}>
            Jeres gæt
          </div>
          <div className="guess-list">
            {props.players.map((pl, i) => {
              const g = props.guesses[pl.id];
              return (
                <div key={pl.id} className={`guess-row ${g?.locked ? "guess-row-locked" : ""}`}>
                  <span className="mini-badge" style={{ background: playerColor(i) }}>{i + 1}</span>
                  <span className="guess-name">{pl.name}</span>
                  <div className="guess-input-wrap">
                    <input
                      type="text"
                      inputMode="numeric"
                      className="input guess-input"
                      placeholder="fx 4300000"
                      disabled={g?.locked}
                      value={g?.raw ?? ""}
                      onChange={(e) => props.onGuess(pl.id, e.target.value)}
                    />
                    <span className="guess-suffix">kr</span>
                  </div>
                  {g?.locked ? (
                    <button className="btn btn-ghost btn-sm" onClick={() => props.onUnlock(pl.id)}>
                      Åbn
                    </button>
                  ) : (
                    <button
                      className="btn btn-primary btn-sm"
                      onClick={() => props.onLock(pl.id)}
                      disabled={!g || g.value == null}
                    >
                      LÅS
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          <button
            className="btn btn-reveal"
            disabled={!props.allLocked}
            onClick={props.onRevealPrice}
          >
            {props.allLocked ? "AFSLØR PRIS →" : "Alle skal låse deres gæt først"}
          </button>
        </aside>
      </div>
    </>
  );
}

function hintValue(key: HintKey, p: GameProperty): string | null {
  switch (key) {
    case "address":
      return `${p.zipCode} ${p.city}`;
    case "area":
      return `${p.area} m²`;
    case "rooms":
      return p.rooms != null ? `${p.rooms} værelser` : null;
    case "year":
      return p.yearBuilt != null ? String(p.yearBuilt) : null;
    case "energy":
      return p.energyLabel ?? null;
    case "expense":
      return p.monthlyExpenses != null ? krMd(p.monthlyExpenses) : null;
  }
}

function hintShortLabel(key: HintKey): string {
  return {
    address: "Område",
    area: "Areal",
    rooms: "Værelser",
    year: "Byggeår",
    energy: "Energi",
    expense: "Ejerudgift",
  }[key];
}

/* ============================================================
   Round result
============================================================ */

function RoundResultScreen(props: {
  property: GameProperty;
  roundIdx: number;
  totalRounds: number;
  players: Player[];
  guesses: Record<number, PlayerGuess>;
  onNext: () => void;
  isFinal: boolean;
}) {
  const p = props.property;
  const scored = props.players
    .map((pl, i) => {
      const g = props.guesses[pl.id]!;
      const diff = Math.abs((g.value ?? 0) - p.price);
      const pct = (diff / p.price) * 100;
      return { pl, i, guess: g.value!, diff, pct };
    })
    .sort((a, b) => a.diff - b.diff);
  const winner = scored[0];
  const winnerPts = scoreForDiffPct(winner.pct);

  return (
    <>
      <div className="round-bar">
        <div className="round-label">Runde <strong>{props.roundIdx + 1}</strong> af {props.totalRounds}</div>
        <div className="mini-scoreboard">
          {props.players.map((pl, i) => (
            <div key={pl.id} className="mini-score">
              <span className="mini-badge" style={{ background: playerColor(i) }}>{i + 1}</span>
              <span className="mini-name">{pl.name}</span>
              <span className="mini-pts">{pl.score} p</span>
            </div>
          ))}
        </div>
      </div>

      <div className="result-hero">
        <div className="result-actual-label">Boligens rigtige pris</div>
        <div className="result-actual-price">{kr(p.price)}</div>
        <div className="result-address">{p.address}</div>
        <div className="result-facts">
          <span>{p.area} m²</span>
          {p.rooms != null && <span>· {p.rooms} værelser</span>}
          {p.yearBuilt != null && <span>· opført {p.yearBuilt}</span>}
          {p.energyLabel && <span>· energi {p.energyLabel}</span>}
          {p.propertyType && <span>· {p.propertyType}</span>}
        </div>
      </div>

      <div className="result-table">
        <div className="result-table-head">
          <span>Spiller</span>
          <span>Gæt</span>
          <span>Difference</span>
          <span>%</span>
          <span>Point</span>
        </div>
        {scored.map((row, place) => (
          <div
            key={row.pl.id}
            className={`result-table-row ${place === 0 ? "result-table-row-winner" : ""}`}
          >
            <span>
              <span className="mini-badge" style={{ background: playerColor(row.i) }}>{row.i + 1}</span>
              {row.pl.name}
              {place === 0 && <span className="badge-winner">Tættest på!</span>}
            </span>
            <span>{kr(row.guess)}</span>
            <span className={row.diff === 0 ? "diff-perfect" : ""}>
              {row.guess > p.price ? "+" : row.guess < p.price ? "−" : ""}
              {kr(row.diff)}
            </span>
            <span>{row.pct.toFixed(1)} %</span>
            <span className="pts-cell">
              {place === 0 ? `+${winnerPts}` : "0"}
            </span>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", justifyContent: "center", marginTop: 24 }}>
        <button className="btn btn-primary btn-big" onClick={props.onNext}>
          {props.isFinal ? "SE VINDEREN →" : "NÆSTE RUNDE →"}
        </button>
      </div>
    </>
  );
}

/* ============================================================
   Final screen
============================================================ */

function FinalScreen({ players, onPlayAgain }: { players: Player[]; onPlayAgain: () => void }) {
  const sorted = [...players].sort((a, b) => b.score - a.score);
  const winner = sorted[0];
  const topScore = winner.score;
  const winners = sorted.filter((p) => p.score === topScore);

  return (
    <div className="final-wrap">
      <div className="final-crown">🏆</div>
      <div className="final-title">
        {winners.length > 1 ? "UAFGJORT!" : "VINDER!"}
      </div>
      <div className="final-name">
        {winners.map((w) => w.name).join(" & ")}
      </div>
      <div className="final-score">
        {winner.score} <span>point</span>
      </div>

      <div className="final-board">
        {sorted.map((p, idx) => {
          const orig = players.findIndex((pl) => pl.id === p.id);
          return (
            <div key={p.id} className={`final-row ${idx === 0 ? "final-row-first" : ""}`}>
              <span className="final-place">{idx + 1}</span>
              <span className="mini-badge" style={{ background: playerColor(orig) }}>{orig + 1}</span>
              <span className="final-row-name">{p.name}</span>
              <span className="final-row-pts">{p.score} p</span>
            </div>
          );
        })}
      </div>

      <button className="btn btn-primary btn-big" onClick={onPlayAgain}>
        SPIL IGEN →
      </button>
    </div>
  );
}

/* ---------- shared ---------- */

function playerColor(idx: number): string {
  const palette = [
    "#e63946", // rød
    "#1d7dd1", // blå
    "#2a9d3f", // grøn
    "#f4a520", // orange
    "#8a3ffc", // lilla
    "#0e9694", // teal
    "#d43ea8", // pink
    "#5c5c5c", // grå
  ];
  return palette[idx % palette.length];
}

