"use client";

import { useLayoutEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import "./game.css";
import { calculateRoundScores } from "./gameLogic";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";

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
  const [roundHintCost, setRoundHintCost] = useState<number>(0);

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
      setRoundHintCost(0);
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
    const hint = HINTS.find((h) => h.key === key);
    if (!hint) return;
    const next = new Set(revealed);
    next.add(key);
    setRevealed(next);
    // A hint is a real cost for every player, including when their score is 0.
    // Negative totals are intentional: the scoreboard must reflect every cost.
    setRoundHintCost((cost) => cost + hint.cost);
    setPlayers((ps) => ps.map((p) => ({ ...p, score: p.score - hint.cost })));
  }

  /* ---------- guessing ---------- */
  /** Live-formats the field as the player types (4300000 → 4.300.000) and returns the formatted string. */
  function setGuess(playerId: number, input: string): string {
    const digits = input.replace(/\D/g, "").replace(/^0+/, "").slice(0, 10);
    const n = digits ? Number(digits) : null;
    const raw = n != null ? fmt(n) : "";
    const value = n != null && n >= 1000 ? n : null;
    setGuesses((g) => ({
      ...g,
      [playerId]: { ...(g[playerId] ?? { raw: "", value: null, locked: false }), raw, value },
    }));
    return raw;
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
    const scored = calculateRoundScores(players, guesses, currentProperty.price);
    setPlayers((ps) =>
      ps.map((p) => {
        const round = scored.find((row) => row.playerId === p.id);
        return round ? { ...p, score: p.score + round.points } : p;
      }),
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
    setRoundHintCost(0);
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
    setRoundHintCost(0);
    setPlayers(players.map((p) => ({ ...p, score: 0 })));
  }

  /* =========================================================
     Render
  ========================================================= */
  return (
    <div className="game-page">
      {/* Site-wide navigation — same Nav component used across all pages, so
          the /spil tab uses the real NordInvest logo + navigation instead of
          a bespoke ◆ mark. */}
      <Nav />

      <header className="game-subheader">
        <div className="game-subheader-inner">
          <h1 className="page-title">Boligpris Spil — Gæt Prisen på Boligen</h1>
          <p className="page-subtitle">
            Danmarks største bolig-quiz — gæt prisen på rigtige huse og lejligheder fra Boligsiden. 2-8 spillere, gratis, ingen login.
          </p>
        </div>
      </header>

      <div className="game-shell">
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
              hintCost={roundHintCost}
              onNext={nextRound}
              isFinal={currentRound === properties.length - 1}
            />
          )}

          {phase === "final" && (
            <FinalScreen players={players} onPlayAgain={playAgain} />
          )}
        </main>
      </div>

      {/* SEO content strip — dense real prose so search engines pick up every
          way a Dane might phrase this query: "boligpris spil", "bolig spil",
          "gæt prisen på boligen", "gæt husets pris", "boligquiz", "prisspil",
          "ejendomsspil", "boligmarked spil", etc. Every H2/H3 anchors a
          distinct query variant. */}
      <section className="game-seo-strip">
        <div className="game-seo-inner">
          <h2>Boligpris Spil — Danmarks største bolig-quiz</h2>
          <p>
            <strong>Gæt Boligprisen</strong> er et gratis <strong>boligpris spil</strong> hvor
            2-8 spillere gætter kontantprisen på rigtige danske boliger fra Boligsiden.
            Det er også kendt som <em>bolig spil</em>, <em>boligquiz</em>, <em>prisspil</em>{" "}
            og <em>ejendomsspil</em> — samme koncept: se boligen, gæt prisen, vind runden.
            Ingen login, ingen betaling, ingen download.
          </p>

          <h3>Gæt prisen på boligen — hus, lejlighed eller villa</h3>
          <p>
            Uanset om du vil <strong>gætte prisen på et hus</strong>, en{" "}
            <strong>lejlighed</strong> eller en villa, dækker boligquizzen alle
            boligtyper. Vi trækker aktive salgsopstillinger direkte fra Boligsiden —
            parcelhuse, ejerlejligheder, rækkehuse, villaer, andelsboliger og
            fritidshuse. Hver runde viser dig billeder af boligen, og du gætter{" "}
            <strong>kontantprisen</strong>. Tættest på vinder.
          </p>

          <h3>Sådan spiller du bolig-quizzen</h3>
          <ol>
            <li>Vælg 2-8 spillere — spil med familien, kollegaerne eller vennerne</li>
            <li>Vælg område: hele Danmark, en landsdel eller specifik by</li>
            <li>Se billederne af boligen og gæt kontantprisen</li>
            <li>Køb evt. hints om areal, byggeår, energimærke — koster 2 point</li>
            <li>Tættest på vinder rundens bonus, alle får point for at være tæt på</li>
          </ol>

          <h3>Boligpris spil i din by</h3>
          <p>
            Spil <strong>Gæt Boligprisen i København</strong>, Aarhus, Odense, Aalborg,
            Esbjerg, Vejle, Randers, Kolding, Horsens, Roskilde, Silkeborg, Herning,
            Helsingør, Næstved eller Hillerød — eller test dig selv på hele
            Danmark. Prisniveauerne er vidt forskellige, og det er en overraskende
            god måde at træne sin intuition for det danske boligmarked.
          </p>

          <h3>Hvorfor spille Gæt Boligprisen?</h3>
          <p>
            Boligmarkedet er svært at aflæse. Prisspillet er den sjoveste måde at
            teste hvor godt du kender det danske boligmarked. Kernebrugerne er
            <strong> kommende boligkøbere, ejendomsinvestorer og mæglerbranchen</strong> —
            men det fungerer også som selskabsspil, familieaften, eller onboarding
            for nye kolleger i ejendomsbranchen. Alt data kommer fra{" "}
            <a href="https://boligsiden.dk" target="_blank" rel="noopener">Boligsiden</a>{" "}
            og opdateres løbende, så udbuddet altid afspejler det aktuelle
            boligmarked.
          </p>

          <h3>Andre gratis værktøjer til boliginvestering</h3>
          <p>
            Vil du analysere en konkret bolig i stedet for at gætte prisen? Prøv{" "}
            <a href="/analyseren">Analyseren</a> — indsæt et boliglink og få cashflow,
            afkast og risiko-vurdering. Vil du se de bedste deals i hele Danmark
            lige nu? Åbn <a href="/deals">Deal-motoren</a>. Vil du lære om
            ejendomsinvestering? Læs vores <a href="/blog">blog</a>.
          </p>

          <p className="game-seo-links">
            Se også: <a href="/analyseren">Boliganalyse</a> ·{" "}
            <a href="/deals">Deal-motoren</a> ·{" "}
            <a href="/blog">Blog om ejendomsinvestering</a> ·{" "}
            <a href="/investering-i-ejendom-koebenhavn">Investering i København</a> ·{" "}
            <a href="/investering-i-ejendom-aarhus">Investering i Aarhus</a>
          </p>
        </div>
      </section>

      <Footer />
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
            <li>Se boligen. Gæt prisen. Lås.</li>
            <li>Hints koster <strong>2 point</strong> — brug dem klogt.</li>
            <li>Tættest på vinder <strong>op til 150 point</strong>.</li>
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
  onGuess: (id: number, raw: string) => string;
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
      <RoundHeader roundIdx={props.roundIdx} totalRounds={props.totalRounds} players={props.players} />

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
          <div className="panel-title panel-title-tight">Hints <span className="panel-title-sub">(−2 point pr. stk.)</span></div>
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
            {props.players.map((pl, i) => (
              <GuessRow
                key={pl.id}
                player={pl}
                index={i}
                guess={props.guesses[pl.id]}
                onGuess={props.onGuess}
                onLock={props.onLock}
                onUnlock={props.onUnlock}
              />
            ))}
          </div>

          <button
            className="btn btn-reveal"
            disabled={!props.allLocked}
            onClick={props.onRevealPrice}
          >
            {props.allLocked ? "AFSLØR PRIS →" : "Lås alle gæt for at afsløre"}
          </button>
        </aside>
      </div>
    </>
  );
}

/**
 * One player's guess. Typing is live-formatted (4.300.000) with the caret
 * kept in place; Enter locks. Once locked the number is hidden behind dots so
 * the other players can't copy it — "Hold for at se" shows it only while held.
 */
function GuessRow({
  player,
  index,
  guess,
  onGuess,
  onLock,
  onUnlock,
}: {
  player: Player;
  index: number;
  guess: PlayerGuess | undefined;
  onGuess: (id: number, raw: string) => string;
  onLock: (id: number) => void;
  onUnlock: (id: number) => void;
}) {
  const [peek, setPeek] = useState(false);
  const locked = !!guess?.locked;
  const inputRef = useRef<HTMLInputElement>(null);
  const caretRef = useRef<number | null>(null);

  // Restore the caret synchronously after the formatted value renders, so
  // editing in the middle of "4.350.000" never jumps to the end.
  useLayoutEffect(() => {
    const el = inputRef.current;
    if (caretRef.current != null && el && document.activeElement === el) {
      el.setSelectionRange(caretRef.current, caretRef.current);
    }
    caretRef.current = null;
  });

  function handleChange(e: ChangeEvent<HTMLInputElement>) {
    const el = e.target;
    const prev = guess?.raw ?? "";
    let digits = el.value.replace(/\D/g, "");
    let digitsBefore = el.value.slice(0, el.selectionStart ?? el.value.length).replace(/\D/g, "").length;
    // Backspace over a thousands dot removes only the dot, which formatting
    // would put straight back — delete the digit in front of it instead.
    if (digits === prev.replace(/\D/g, "") && el.value.length < prev.length && digitsBefore > 0) {
      digits = digits.slice(0, digitsBefore - 1) + digits.slice(digitsBefore);
      digitsBefore -= 1;
    }
    const formatted = onGuess(player.id, digits);
    let pos = 0;
    let seen = 0;
    while (pos < formatted.length && seen < digitsBefore) {
      if (/\d/.test(formatted[pos])) seen++;
      pos++;
    }
    caretRef.current = pos;
  }

  return (
    <div className={`guess-row ${locked ? "guess-row-locked" : ""}`}>
      <span className="mini-badge" style={{ background: playerColor(index) }}>{index + 1}</span>
      <span className="guess-name">{player.name}</span>
      <div className="guess-input-wrap">
        {locked ? (
          <button
            type="button"
            className="guess-hidden"
            aria-label={`${player.name}s gæt er skjult. Hold for at se det.`}
            onPointerDown={() => setPeek(true)}
            onPointerUp={() => setPeek(false)}
            onPointerLeave={() => setPeek(false)}
            onPointerCancel={() => setPeek(false)}
            onKeyDown={(e) => { if (e.key === " " || e.key === "Enter") setPeek(true); }}
            onKeyUp={() => setPeek(false)}
            onContextMenu={(e) => e.preventDefault()}
          >
            {peek ? (
              <span className="guess-hidden-value">{guess?.raw} kr</span>
            ) : (
              <>
                <span className="guess-hidden-dots" aria-hidden>••••••</span>
                <span className="guess-hidden-hint">Hold for at se</span>
              </>
            )}
          </button>
        ) : (
          <>
            <input
              ref={inputRef}
              type="text"
              inputMode="numeric"
              autoComplete="off"
              className="input guess-input"
              placeholder="fx 4.300.000"
              value={guess?.raw ?? ""}
              onChange={handleChange}
              onKeyDown={(e) => {
                if (e.key === "Enter" && guess?.value != null) onLock(player.id);
              }}
            />
            <span className="guess-suffix">kr</span>
          </>
        )}
      </div>
      {locked ? (
        <button className="btn btn-ghost btn-sm" onClick={() => { setPeek(false); onUnlock(player.id); }}>
          Ret
        </button>
      ) : (
        <button
          className="btn btn-primary btn-sm"
          onClick={() => onLock(player.id)}
          disabled={!guess || guess.value == null}
        >
          LÅS
        </button>
      )}
    </div>
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
  hintCost: number;
  onNext: () => void;
  isFinal: boolean;
}) {
  const p = props.property;
  const scored = calculateRoundScores(props.players, props.guesses, p.price);
  const winners = scored.filter((row) => row.isWinner);

  return (
    <>
      <RoundHeader roundIdx={props.roundIdx} totalRounds={props.totalRounds} players={props.players} />

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

      <div className="round-score-summary" role="status">
        <strong>{winners.length > 1 ? "Tæt på!" : "Rundens vinder"}</strong>
        <span>
          {winners.map((row) => props.players.find((pl) => pl.id === row.playerId)?.name).join(" & ")} +
          {winners[0]?.points ?? 0} point
        </span>
        <span>{props.hintCost ? `Hints: −${props.hintCost} point pr. spiller` : "Ingen hints brugt"}</span>
      </div>

      <div className="result-table">
        <div className="result-table-head">
          <span>Spiller</span>
          <span>Gæt</span>
          <span>Difference</span>
          <span>%</span>
          <span>Point</span>
        </div>
        {scored.map((row) => {
          const player = props.players.find((pl) => pl.id === row.playerId)!;
          const net = row.points - props.hintCost;
          return (
            <div
              key={player.id}
              className={`result-table-row ${row.isWinner ? "result-table-row-winner" : ""}`}
            >
              <span>
                <span className="mini-badge" style={{ background: playerColor(row.playerIndex) }}>{row.playerIndex + 1}</span>
                {player.name}
                {row.isWinner && <span className="badge-winner">Tættest på!</span>}
              </span>
              <span>{kr(row.guess)}</span>
              <span className={row.diff === 0 ? "diff-perfect" : ""}>
                {row.guess > p.price ? "+" : row.guess < p.price ? "−" : ""}
                {kr(row.diff)}
              </span>
              <span>{row.pct.toFixed(1)} %</span>
              <span className="pts-cell">
                <strong className={net < 0 ? "score-negative" : ""}>
                  {net >= 0 ? `+${net}` : `−${Math.abs(net)}`}
                </strong>
                <small>
                  {row.basePoints}
                  {row.winnerBonus > 0 ? ` + ${row.winnerBonus} bonus` : ""}
                  {props.hintCost > 0 ? ` − ${props.hintCost} hints` : ""}
                </small>
              </span>
            </div>
          );
        })}
      </div>

      {/* Property listing link — once the price is revealed, players should be
          able to jump to the actual Boligsiden listing to inspect the property
          themselves. Slugifies the address into Boligsiden's URL format. */}
      <div className="result-listing-link">
        <a
          href={boligsidenListingUrl(p)}
          target="_blank"
          rel="noopener noreferrer"
          className="btn btn-outline btn-sm"
        >
          Se opslaget på Boligsiden ↗
        </a>
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

      <Scoreboard players={players} />

      <button className="btn btn-primary btn-big" onClick={onPlayAgain}>
        SPIL IGEN →
      </button>
    </div>
  );
}

function RoundHeader({
  roundIdx,
  totalRounds,
  players,
}: {
  roundIdx: number;
  totalRounds: number;
  players: Player[];
}) {
  return (
    <div className="round-bar">
      <div className="round-label">Runde <strong>{roundIdx + 1}</strong> af {totalRounds}</div>
      <Scoreboard players={players} compact />
    </div>
  );
}

function Scoreboard({ players, compact = false }: { players: Player[]; compact?: boolean }) {
  const ranked = [...players].sort((a, b) => b.score - a.score || a.id - b.id);

  return (
    <section className={`scoreboard ${compact ? "scoreboard-compact" : ""}`} aria-label="Scoreboard" aria-live="polite">
      <div className="scoreboard-heading">
        <span>Scoreboard</span>
        <span>Samlet score</span>
      </div>
      <ol className="scoreboard-list">
        {ranked.map((player, rank) => {
          const playerIndex = players.findIndex((p) => p.id === player.id);
          return (
            <li key={player.id} className="scoreboard-row">
              <span className="scoreboard-rank">{rank + 1}</span>
              <span className="mini-badge" style={{ background: playerColor(playerIndex) }}>{playerIndex + 1}</span>
              <span className="scoreboard-name">{player.name}</span>
              <span className={`scoreboard-score ${player.score < 0 ? "score-negative" : ""}`}>{player.score} p</span>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

/* ---------- shared ---------- */

/**
 * Rebuild the property's Boligsiden URL from its address + zip. Boligsiden uses
 * dash-slug URLs at `/adresse/<street-number-zip-city>` with æ→ae, ø→oe, å→aa
 * (and København→koebenhavn). Good enough that at least the /adresse/ path
 * lands on the right adressekort, even when the exact match slug isn't known.
 */
function boligsidenListingUrl(p: GameProperty): string {
  const slugify = (s: string) =>
    (s || "")
      .toLowerCase()
      .replace(/å/g, "aa")
      .replace(/ø/g, "oe")
      .replace(/æ/g, "ae")
      .replace(/\./g, "")
      .replace(/,/g, "")
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9-]/g, "");
  const street = slugify(p.address);
  const city = slugify(p.city);
  const slug = [street, p.zipCode, city].filter(Boolean).join("-");
  return `https://www.boligsiden.dk/adresse/${slug}`;
}

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
