"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, Crown, ExternalLink, Flame, RotateCcw, Share2, Timer } from "lucide-react";
import "./game.css";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import {
  HINT_COST,
  STREAK_PCT,
  accuracy,
  calculateRoundScores,
  levelFor,
  streakBonus,
  timePenalty,
} from "./gameLogic";
import {
  addXp,
  award,
  bumpStreak,
  liveStreak,
  loadHistory,
  loadProfile,
  loadSeen,
  markSeen,
  msToNextDaily,
  pushHistory,
  resetHistory,
  saveProfile,
  todayDK,
  BADGES,
  type BadgeId,
  type Profile,
} from "./progress";
import {
  ACC_DOT,
  AccuracyPill,
  Confetti,
  CountUp,
  Gallery,
  GuessRow,
  HintPanel,
  TimerBadge,
  Toasts,
  fmt,
  kr,
  playerColor,
  useTicker,
  type HintKey,
  type PlayHome,
  type PlayerGuess,
  type Toast,
} from "./ui";
import {
  BadgeShelf,
  DailyCard,
  FreePlayCard,
  Leaderboard,
  ProfileStrip,
  REGIONS,
  useBoard,
  type FreeSettings,
} from "./Home";
import { mergeProfiles, pushGame, remoteGame, useGameAccount } from "./account";
import { AccountStrip, SaveProgressCard } from "./AccountForms";
import { CityMap } from "./CityMap";

/* ---------- types ---------- */

type Stage = "home" | "loading" | "play" | "result" | "final" | "error";
type Kind = "free" | "daily";
type Player = { id: number; name: string; score: number; streak: number };
type Row = {
  pid: number;
  guess: number;
  pct: number;
  base: number;
  bonus: number;
  streakBonus: number;
  timePen: number;
  points: number;
  isWinner: boolean;
  streak: number;
};
type Round = { price: number; rows: Row[]; hintCost: number };
type Turn = { pos: number; stage: "inspect" | "handoff" | "running"; startedAt: number };
type DailyResult = { score: number; squares: string; rank?: number; total?: number };

const freshGuesses = (players: { id: number }[]) =>
  Object.fromEntries(players.map((p) => [p.id, { raw: "", value: null, locked: false } as PlayerGuess]));

/* ============================================================ */

export default function GameClient() {
  const [stage, setStage] = useState<Stage>("home");
  const [kind, setKind] = useState<Kind>("free");
  const [error, setError] = useState("");
  const [exhausted, setExhausted] = useState(false);
  const [notice, setNotice] = useState("");

  const [profile, setProfile] = useState<Profile | null>(null);
  const [seenCount, setSeenCount] = useState(0);
  const [gamesPlayed, setGamesPlayed] = useState(0);
  const [boardKey, setBoardKey] = useState(0);
  const board = useBoard(profile?.clientId ?? null, boardKey);
  const [dailyAvailable, setDailyAvailable] = useState<boolean | null>(null);

  const [settings, setSettings] = useState<FreeSettings>({
    players: [{ id: 1, name: "Spiller 1" }],
    region: "hele-dk",
    rounds: 10,
    timed: false,
  });

  // game
  const [homes, setHomes] = useState<PlayHome[]>([]);
  const [round, setRound] = useState(0);
  const [players, setPlayers] = useState<Player[]>([]);
  const [guesses, setGuesses] = useState<Record<number, PlayerGuess>>({});
  const [revealed, setRevealed] = useState<Set<HintKey>>(new Set());
  const [roundHintCost, setRoundHintCost] = useState(0);
  const [hintsUsed, setHintsUsed] = useState(0);
  const [turn, setTurn] = useState<Turn | null>(null);
  const [rounds, setRounds] = useState<Round[]>([]);
  const [revealing, setRevealing] = useState(false);
  const [dailyDate, setDailyDate] = useState("");
  const [dailyResult, setDailyResult] = useState<DailyResult | null>(null);
  const [gameXp, setGameXp] = useState(0);
  const [gameBadges, setGameBadges] = useState<BadgeId[]>([]);

  // feedback
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [confetti, setConfetti] = useState(0);
  const hatTrick = useRef(0);
  const topRef = useRef<HTMLDivElement>(null);

  /* ---------- boot ---------- */

  useEffect(() => {
    const p = loadProfile();
    profileRef.current = p;
    setProfile(p);
    setSeenCount(loadSeen().length);
    setGamesPlayed(loadHistory().length);
    setSettings((s) => ({ ...s, players: [{ id: 1, name: p.name || "Spiller 1" }] }));
    // Warm the daily set so the button is instant.
    fetch("/api/game/daily", { cache: "no-store" })
      .then((r) => r.json())
      .then((j) => setDailyAvailable(!!j?.ok))
      .catch(() => setDailyAvailable(false));
  }, []);

  const toast = useCallback((t: Omit<Toast, "id">) => {
    const id = Date.now() + Math.random();
    setToasts((ts) => [...ts.slice(-1), { ...t, id }]);
    window.setTimeout(() => setToasts((ts) => ts.filter((x) => x.id !== id)), 3500);
  }, []);

  // The profile is read and written through a ref so several updates in one
  // tick compose, and the side effects (save, toasts) run exactly once.
  const profileRef = useRef<Profile | null>(null);
  const updateProfile = useCallback(
    (fn: (p: Profile) => { profile: Profile; fresh?: BadgeId[]; levelUp?: string | null }) => {
      const cur = profileRef.current;
      if (!cur) return;
      const r = fn(cur);
      profileRef.current = r.profile;
      saveProfile(r.profile);
      setProfile(r.profile);
      if (r.fresh?.length) setGameBadges((g) => [...g, ...r.fresh!]);
      for (const id of r.fresh ?? []) {
        const b = BADGES.find((x) => x.id === id);
        if (b) toast({ title: `Ny badge: ${b.title}`, body: b.how, tone: "badge" });
      }
      if (r.levelUp) toast({ title: `Nyt niveau: ${r.levelUp}`, body: "Du stiger i graderne.", tone: "level" });
    },
    [toast],
  );

  const grant = useCallback(
    (ids: BadgeId[]) => {
      if (ids.length) updateProfile((p) => award(p, ids));
    },
    [updateProfile],
  );

  const scrollTop = () => topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });

  /* ---------- profile ↔ account ---------- */

  const account = useGameAccount();
  const syncedFor = useRef<string | null>(null);

  // On login (or when a logged-in player opens the game): pull the account's
  // progress, merge it with this browser's, and play under the account id.
  const userId = account.user?.id ?? null;
  useEffect(() => {
    const u = account.user;
    if (!u || !profileRef.current || syncedFor.current === u.id) return;
    syncedFor.current = u.id;
    const merged = mergeProfiles(profileRef.current, remoteGame(u));
    const next = { ...merged, clientId: u.id, name: account.username || merged.name };
    profileRef.current = next;
    saveProfile(next);
    setProfile(next);
    setSettings((s) => ({ ...s, players: [{ ...s.players[0], name: next.name || "Spiller 1" }, ...s.players.slice(1)] }));
    setBoardKey((k) => k + 1);
    void pushGame(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, account.username, profile]);

  useEffect(() => {
    if (!userId) syncedFor.current = null; // logged out: the next login merges again
  }, [userId]);

  // Keep the account up to date as the player earns XP and badges.
  useEffect(() => {
    if (!userId || !profile || syncedFor.current !== userId) return;
    const t = window.setTimeout(() => void pushGame(profile), 1500);
    return () => window.clearTimeout(t);
  }, [profile, userId]);

  const onAccountDone = (kind: "signup" | "login") =>
    toast(
      kind === "signup"
        ? { title: "Profil oprettet", body: "Du er logget ind, og din fremgang bliver gemt.", tone: "info" }
        : { title: "Velkommen tilbage", body: "Din fremgang er hentet ind.", tone: "info" },
    );

  /* ---------- starting games ---------- */

  function beginRound(ps: { id: number }[], timed: boolean) {
    setGuesses(freshGuesses(ps));
    setRevealed(new Set());
    setRoundHintCost(0);
    setTurn(timed ? { pos: 0, stage: "inspect", startedAt: 0 } : null);
  }

  async function startFree(s = settings) {
    setError("");
    setNotice("");
    setExhausted(false);
    setKind("free");
    setStage("loading");
    scrollTop();
    try {
      const res = await fetch("/api/game/properties", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({ region: s.region, count: s.rounds, exclude: loadSeen() }),
      });
      const j = await res.json();
      if (!j?.ok || !Array.isArray(j.properties) || j.properties.length < 3) {
        const label = REGIONS.find((r) => r.key === s.region)?.label ?? s.region;
        if (j?.error === "exhausted") {
          setExhausted(true);
          setError(`Du har set alle de boliger, vi kan finde i ${label} lige nu. Vælg et andet område, eller nulstil din historik.`);
        } else {
          setError("Vi kunne ikke hente nok boliger lige nu. Prøv igen, eller vælg et andet område.");
        }
        setStage("error");
        return;
      }
      if (j.exhausted) setNotice(`Der var kun ${j.properties.length} nye boliger tilbage i området, så spillet har ${j.properties.length} runder.`);
      const ps = s.players.map((p) => ({ id: p.id, name: p.name.trim() || "Spiller", score: 0, streak: 0 }));
      setHomes(j.properties as PlayHome[]);
      setPlayers(ps);
      setRound(0);
      setRounds([]);
      setHintsUsed(0);
      setGameXp(0);
      setGameBadges([]);
      hatTrick.current = 0;
      beginRound(ps, s.timed);
      updateProfile((p) => ({ profile: { ...p, regions: Array.from(new Set([...p.regions, s.region])) } }));
      setStage("play");
    } catch {
      setError("Netværksfejl. Prøv igen.");
      setStage("error");
    }
  }

  async function startDaily() {
    if (!profile) return;
    if (profile.daily[todayDK()]) return;
    setError("");
    setNotice("");
    setKind("daily");
    setStage("loading");
    scrollTop();
    try {
      const j = await fetch("/api/game/daily", { cache: "no-store" }).then((r) => r.json());
      if (!j?.ok) throw new Error("no daily");
      const ps = [{ id: 1, name: profile.name.trim() || "Dig", score: 0, streak: 0 }];
      setDailyDate(j.date);
      setHomes(j.properties as PlayHome[]);
      setPlayers(ps);
      setRound(0);
      setRounds([]);
      setHintsUsed(0);
      setGameXp(0);
      setGameBadges([]);
      setDailyResult(null);
      hatTrick.current = 0;
      beginRound(ps, false);
      setStage("play");
    } catch {
      setError("Dagens boliger kunne ikke hentes lige nu. Prøv igen om lidt.");
      setStage("error");
    }
  }

  /* ---------- during a round ---------- */

  const home = homes[round];
  const timed = kind === "free" && settings.timed;

  useEffect(() => {
    if (stage !== "play" || !home) return;
    setSeenCount(markSeen(home.id));
  }, [stage, home]);

  function revealHint(k: HintKey) {
    if (revealed.has(k)) return;
    setRevealed((r) => new Set(r).add(k));
    setRoundHintCost((c) => c + HINT_COST);
    setHintsUsed((n) => n + 1);
    setPlayers((ps) => ps.map((p) => ({ ...p, score: p.score - HINT_COST })));
  }

  function setGuess(pid: number, digits: string): string {
    const d = digits.replace(/\D/g, "").replace(/^0+/, "").slice(0, 10);
    const n = d ? Number(d) : null;
    const raw = n != null ? fmt(n) : "";
    setGuesses((g) => ({ ...g, [pid]: { ...(g[pid] ?? { raw: "", value: null, locked: false }), raw, value: n != null && n >= 10_000 ? n : null } }));
    return raw;
  }

  function lock(pid: number) {
    const g = guesses[pid];
    if (!g || g.value == null) return;
    const seconds = turn?.stage === "running" ? (Date.now() - turn.startedAt) / 1000 : undefined;
    setGuesses((all) => ({ ...all, [pid]: { ...g, raw: fmt(g.value!), locked: true, seconds } }));
    if (seconds != null && seconds <= 10 && pid === players[0]?.id) grant(["speedy"]);
    if (turn?.stage === "running") {
      const nextPos = turn.pos + 1;
      setTurn(nextPos < players.length ? { pos: nextPos, stage: "handoff", startedAt: 0 } : { ...turn, pos: nextPos });
    }
    // Daily: one player, so locking is the reveal.
    if (kind === "daily") void revealDaily(g.value);
  }

  function unlock(pid: number) {
    setGuesses((g) => ({ ...g, [pid]: { ...g[pid], locked: false } }));
  }

  const allLocked = useMemo(() => players.length > 0 && players.every((p) => guesses[p.id]?.locked && guesses[p.id]?.value != null), [players, guesses]);

  function ownerBadges(price: number, pct: number) {
    const ids: BadgeId[] = [];
    if (pct <= 1) ids.push("spot_on");
    if (price >= 5_000_000 && pct <= 5) ids.push("millionaire");
    hatTrick.current = pct <= 5 ? hatTrick.current + 1 : 0;
    if (hatTrick.current >= 3) ids.push("hat_trick");
    grant(ids);
  }

  function revealFree() {
    if (!home?.price || !allLocked) return;
    const price = home.price;
    const multi = players.length > 1;
    const scored = calculateRoundScores(
      players.map((p) => ({ id: p.id, score: p.score })),
      Object.fromEntries(players.map((p) => [p.id, { value: guesses[p.id].value }])),
      price,
    );
    const rows: Row[] = scored.map((s) => {
      const p = players.find((x) => x.id === s.playerId)!;
      const streak = s.pct <= STREAK_PCT ? p.streak + 1 : 0;
      const sb = streakBonus(streak);
      const tp = timed ? timePenalty(guesses[p.id].seconds ?? 0) : 0;
      const bonus = multi ? s.winnerBonus : 0;
      return {
        pid: p.id,
        guess: s.guess,
        pct: s.pct,
        base: s.basePoints,
        bonus,
        streakBonus: sb,
        timePen: tp,
        points: s.basePoints + bonus + sb - tp,
        isWinner: multi && s.isWinner,
        streak,
      };
    });
    setPlayers((ps) =>
      ps.map((p) => {
        const r = rows.find((x) => x.pid === p.id)!;
        return { ...p, score: p.score + r.points, streak: r.streak };
      }),
    );
    setRounds((rs) => [...rs, { price, rows, hintCost: roundHintCost }]);
    if (rows.some((r) => r.pct <= 2)) setConfetti((c) => c + 1);
    const own = rows.find((r) => r.pid === players[0].id);
    if (own) ownerBadges(price, own.pct);
    setStage("result");
    scrollTop();
  }

  async function revealDaily(guess: number) {
    if (revealing) return;
    setRevealing(true);
    try {
      const j = await fetch("/api/game/daily", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reveal", date: dailyDate, index: round, guess }),
      }).then((r) => r.json());
      if (!j?.ok) throw new Error("reveal failed");
      setHomes((hs) => hs.map((h, i) => (i === round ? { ...h, price: j.price, address: j.address, listingUrl: j.listingUrl } : h)));
      const me = players[0];
      const row: Row = {
        pid: me.id,
        guess,
        pct: j.pct,
        base: j.points,
        bonus: 0,
        streakBonus: 0,
        timePen: 0,
        points: j.points,
        isWinner: false,
        streak: 0,
      };
      setPlayers((ps) => ps.map((p) => ({ ...p, score: p.score + j.points })));
      setRounds((rs) => [...rs, { price: j.price, rows: [row], hintCost: roundHintCost }]);
      if (j.pct <= 2) setConfetti((c) => c + 1);
      ownerBadges(j.price, j.pct);
      setStage("result");
      scrollTop();
    } catch {
      setNotice("Prisen kunne ikke hentes. Tjek din forbindelse, og lås dit gæt igen.");
      setGuesses((g) => ({ ...g, [players[0].id]: { ...g[players[0].id], locked: false } }));
    } finally {
      setRevealing(false);
    }
  }

  function next() {
    if (round + 1 < homes.length) {
      setRound(round + 1);
      beginRound(players, timed);
      setNotice("");
      setStage("play");
      scrollTop();
    } else {
      void finish();
    }
  }

  /* ---------- end of game ---------- */

  async function finish() {
    const owner = players[0];
    const seen = loadSeen().length;
    if (kind === "free") {
      pushHistory({ at: new Date().toISOString(), region: settings.region, rounds: homes.length, players: players.map((p) => ({ name: p.name, score: p.score })) });
      setGamesPlayed(loadHistory().length);
      const xp = Math.max(0, owner.score);
      setGameXp(xp);
      const ids: BadgeId[] = ["first_game"];
      if (homes.length >= 5 && hintsUsed === 0) ids.push("no_hints");
      if (seen >= 100) ids.push("seen100");
      if ((profileRef.current?.regions.length ?? 0) >= 5) ids.push("explorer");
      grant(ids);
      updateProfile((p) => {
        const r = addXp({ ...p, bestScore: Math.max(p.bestScore, owner.score) }, xp);
        return r;
      });
      setStage("final");
      scrollTop();
      return;
    }

    // Daily: the server scores it again from the stored prices.
    const guessesList = rounds.map((r) => r.rows[0].guess);
    let result: DailyResult = {
      score: Math.max(0, owner.score),
      squares: rounds.map((r) => accuracy(r.rows[0].pct).square).join(""),
    };
    try {
      const j = await fetch("/api/game/daily", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "submit", date: dailyDate, clientId: profileRef.current?.clientId, name: profileRef.current?.name || "Anonym", guesses: guessesList, hints: hintsUsed }),
      }).then((r) => r.json());
      if (j?.ok) result = { score: j.score, squares: j.squares, rank: j.rank, total: j.total };
      else if (j?.error === "already_played" && j.score != null) result = { ...result, score: j.score, rank: j.rank, total: j.total };
    } catch {
      /* offline: keep the local result */
    }
    setDailyResult(result);
    setGameXp(result.score);
    const ids: BadgeId[] = ["daily_done", "first_game"];
    if (result.rank && result.rank <= 10) ids.push("top10");
    if (seen >= 100) ids.push("seen100");
    updateProfile((p) => {
      let np = bumpStreak({ ...p, daily: { ...p.daily, [dailyDate || todayDK()]: result } });
      const streak = liveStreak(np);
      const extra: BadgeId[] = [...ids];
      if (streak >= 3) extra.push("streak3");
      if (streak >= 7) extra.push("streak7");
      const a = award(np, extra);
      np = a.profile;
      const x = addXp(np, result.score);
      return { profile: x.profile, fresh: a.fresh, levelUp: x.levelUp };
    });
    setBoardKey((k) => k + 1);
    setStage("final");
    scrollTop();
  }

  async function share(r: DailyResult) {
    const date = new Date().toLocaleDateString("da-DK", { day: "numeric", month: "long" });
    const text = `NordInvest · Dagens 5 · ${date}\n${r.squares} ${r.score}/500${r.rank ? ` · nr. ${r.rank}` : ""}\nKan du slå mig? nordinvest.io/spil`;
    try {
      if (navigator.share) {
        await navigator.share({ text });
        return;
      }
    } catch {
      /* cancelled — fall through to copy */
    }
    try {
      await navigator.clipboard.writeText(text);
      toast({ title: "Kopieret", body: "Sæt det ind i jeres gruppechat.", tone: "info" });
    } catch {
      toast({ title: "Kunne ikke kopiere", tone: "info" });
    }
  }

  /* ============================================================ */

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      <Nav />
      <Toasts toasts={toasts} />
      <Confetti burst={confetti} />
      <div ref={topRef} className="scroll-mt-16" />

      {stage === "home" && profile && (
        <>
          <header className="game-hero relative overflow-hidden bg-[#0b1b33] px-4 pb-24 pt-10 text-white sm:px-6 sm:pt-14">
            <div className="relative mx-auto max-w-6xl">
              <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl">Gæt boligprisen</h1>
              <p className="mt-2 max-w-xl text-blue-100">
                Rigtige danske boliger til salg lige nu. Gæt prisen, saml point, og se hvor du ligger mod resten af Danmark.
              </p>
              <div className="mt-6 space-y-2">
                <ProfileStrip profile={profile} seen={seenCount} />
                <AccountStrip account={account} defaultName={profile.name} onDone={onAccountDone} />
              </div>
            </div>
          </header>
          <main className="relative mx-auto -mt-16 grid max-w-6xl gap-5 px-4 pb-16 sm:px-6 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="space-y-5">
              <DailyCard
                profile={profile}
                board={board}
                available={dailyAvailable}
                accountName={account.user ? account.username : null}
                onPlay={startDaily}
                onShare={() => {
                  const r = profile.daily[todayDK()];
                  if (r) void share(r);
                }}
                onName={(name) => {
                  const prev = profile.name || "Spiller 1";
                  updateProfile((p) => ({ profile: { ...p, name } }));
                  // Player 1 is you: follow the leaderboard name unless renamed by hand.
                  setSettings((s) =>
                    s.players[0] && (s.players[0].name === prev || s.players[0].name === "Spiller 1")
                      ? { ...s, players: [{ ...s.players[0], name: name || "Spiller 1" }, ...s.players.slice(1)] }
                      : s,
                  );
                }}
              />
              <FreePlayCard settings={settings} setSettings={setSettings} onStart={() => startFree()} />
            </div>
            <div className="space-y-5">
              <Leaderboard board={board} />
              <BadgeShelf profile={profile} />
              <section className="rounded-3xl bg-white p-5 text-sm text-slate-600 shadow-card ring-1 ring-slate-200 sm:p-6">
                <h2 className="text-lg font-extrabold text-slate-900">Dine tal</h2>
                <dl className="mt-3 grid grid-cols-3 gap-2 text-center">
                  <div className="rounded-2xl bg-slate-50 p-3">
                    <dt className="text-xs">Spil</dt>
                    <dd className="text-xl font-bold text-slate-900">{gamesPlayed}</dd>
                  </div>
                  <div className="rounded-2xl bg-slate-50 p-3">
                    <dt className="text-xs">Boliger set</dt>
                    <dd className="text-xl font-bold text-slate-900">{seenCount}</dd>
                  </div>
                  <div className="rounded-2xl bg-slate-50 p-3">
                    <dt className="text-xs">Bedste spil</dt>
                    <dd className="text-xl font-bold text-slate-900">{profile.bestScore}</dd>
                  </div>
                </dl>
                <p className="mt-3">
                  Du får aldrig den samme bolig to gange.{" "}
                  {seenCount > 0 && (
                    <button
                      type="button"
                      className="font-semibold text-blue-700 underline-offset-2 hover:underline"
                      onClick={() => {
                        if (window.confirm("Nulstil de boliger, du har set? Så kan de dukke op igen.")) {
                          resetHistory();
                          setSeenCount(0);
                          setGamesPlayed(0);
                        }
                      }}
                    >
                      Nulstil
                    </button>
                  )}
                </p>
              </section>
            </div>
          </main>
        </>
      )}

      {stage === "loading" && (
        <div className="mx-auto flex max-w-md flex-col items-center px-4 py-24 text-center">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600" />
          <p className="mt-5 text-lg font-bold">Finder nye boliger …</p>
          <p className="mt-1 text-sm text-slate-500">Vi henter boliger, du ikke har set før.</p>
        </div>
      )}

      {stage === "error" && (
        <div className="mx-auto max-w-lg px-4 py-20">
          <div className="rounded-3xl bg-white p-6 shadow-card ring-1 ring-slate-200">
            <h2 className="text-xl font-extrabold">{exhausted ? "Du har set det hele her" : "Noget gik galt"}</h2>
            <p className="mt-2 text-slate-600">{error}</p>
            <div className="mt-5 flex flex-wrap gap-2">
              <button type="button" onClick={() => setStage("home")} className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-bold text-white">
                Tilbage
              </button>
              {exhausted && (
                <button
                  type="button"
                  onClick={() => {
                    resetHistory();
                    setSeenCount(0);
                    void startFree();
                  }}
                  className="rounded-xl px-4 py-2.5 text-sm font-bold text-slate-900 ring-1 ring-inset ring-slate-300"
                >
                  Nulstil og spil
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {(stage === "play" || stage === "result") && home && (
        <main className="mx-auto max-w-6xl px-4 pb-16 pt-4 sm:px-6 sm:pt-6">
          <TopBar
            kind={kind}
            region={settings.region}
            round={round}
            total={homes.length}
            players={players}
            rounds={rounds}
            onQuit={() => setStage("home")}
          />
          {notice && <div className="mt-3 rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-900 ring-1 ring-amber-200">{notice}</div>}

          {stage === "play" ? (
            <div className="mt-4 grid gap-5 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
              <div className="min-w-0">
                <Gallery home={home} nextHome={homes[round + 1]} />
              </div>
              <div className="min-w-0 space-y-4">
                <div className="rounded-3xl bg-white p-4 shadow-card ring-1 ring-slate-200 sm:p-5">
                  <HintPanel home={home} revealed={revealed} onReveal={revealHint} shared={players.length > 1} />
                </div>
                <div className="rounded-3xl bg-white p-4 shadow-card ring-1 ring-slate-200 sm:p-5">
                  <GuessArea
                    players={players}
                    guesses={guesses}
                    turn={turn}
                    onStartTurn={() => turn && setTurn({ ...turn, stage: "running", startedAt: Date.now() })}
                    setGuess={setGuess}
                    lock={lock}
                    unlock={unlock}
                    daily={kind === "daily"}
                    revealing={revealing}
                  />
                  {kind === "free" && (
                    <button
                      type="button"
                      disabled={!allLocked}
                      onClick={revealFree}
                      className="mt-4 flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-emerald-600 text-base font-extrabold text-white shadow-btn transition hover:bg-emerald-700 active:translate-y-px disabled:bg-slate-200 disabled:text-slate-500"
                    >
                      {allLocked ? (
                        <>
                          Afslør prisen <ArrowRight className="h-5 w-5" />
                        </>
                      ) : (
                        "Lås alle gæt først"
                      )}
                    </button>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <RoundResult
              home={home}
              round={rounds[rounds.length - 1]}
              players={players}
              timed={timed}
              isLast={round + 1 >= homes.length}
              daily={kind === "daily"}
              onNext={next}
            />
          )}
        </main>
      )}

      {stage === "final" && profile && (
        <main className="mx-auto max-w-3xl px-4 pb-16 pt-6 sm:px-6">
          {kind === "daily" && dailyResult ? (
            <DailyFinal
              result={dailyResult}
              profile={profile}
              board={board}
              xp={gameXp}
              badges={gameBadges}
              onShare={() => share(dailyResult)}
              save={<SaveProgressCard account={account} defaultName={profile.name} xp={gameXp} onDone={onAccountDone} />}
              onFree={() => {
                setStage("home");
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
            />
          ) : (
            <FreeFinal
              players={players}
              rounds={rounds}
              profile={profile}
              xp={gameXp}
              badges={gameBadges}
              onAgain={() => startFree()}
              save={<SaveProgressCard account={account} defaultName={profile.name} xp={gameXp} onDone={onAccountDone} />}
              onHome={() => {
                setStage("home");
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
            />
          )}
        </main>
      )}

      <Footer />
    </div>
  );
}

/* ============================================================ */

function TopBar({
  kind,
  region,
  round,
  total,
  players,
  rounds,
  onQuit,
}: {
  kind: Kind;
  region: string;
  round: number;
  total: number;
  players: Player[];
  rounds: Round[];
  onQuit: () => void;
}) {
  const label = kind === "daily" ? "Dagens 5" : `Fri leg · ${REGIONS.find((r) => r.key === region)?.label ?? region}`;
  const ranked = [...players].sort((a, b) => b.score - a.score);
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-3 rounded-3xl bg-white px-4 py-3 shadow-card ring-1 ring-slate-200 sm:px-5">
      <div className="min-w-0">
        <div className="text-xs font-semibold text-blue-700">{label}</div>
        <div className="text-lg font-extrabold">
          Bolig {round + 1} <span className="font-medium text-slate-400">af {total}</span>
        </div>
      </div>
      <div className="flex items-center gap-1.5" aria-label="Dine runder">
        {Array.from({ length: total }, (_, i) => {
          const r = rounds[i];
          const pct = r?.rows.find((x) => x.pid === players[0]?.id)?.pct;
          return (
            <span
              key={i}
              className={`h-2.5 rounded-full transition-all ${i === round ? "w-6 bg-blue-600" : "w-2.5"} ${
                pct != null ? ACC_DOT[accuracy(pct).key] : i === round ? "" : "bg-slate-200"
              }`}
            />
          );
        })}
      </div>
      <div className="ml-auto flex flex-wrap items-center gap-2">
        {ranked.map((p) => {
          const idx = players.findIndex((x) => x.id === p.id);
          return (
            <span key={p.id} className="inline-flex items-center gap-1.5 rounded-full bg-slate-50 py-1 pl-1 pr-3 text-sm ring-1 ring-inset ring-slate-200">
              <span className="grid h-6 w-6 place-items-center rounded-full text-[11px] font-bold text-white" style={{ background: playerColor(idx) }}>
                {idx + 1}
              </span>
              {players.length > 1 && <span className="max-w-[6rem] truncate font-medium">{p.name}</span>}
              <span className={`font-bold tabular-nums ${p.score < 0 ? "text-rose-600" : ""}`}>{p.score}</span>
              {p.streak >= 2 && (
                <span className="inline-flex items-center text-amber-600" title={`${p.streak} i træk inden for 10 %`}>
                  <Flame className="h-3.5 w-3.5" />
                  <span className="text-xs font-bold">{p.streak}</span>
                </span>
              )}
            </span>
          );
        })}
        <button type="button" onClick={onQuit} className="rounded-full px-3 py-1 text-xs font-semibold text-slate-500 ring-1 ring-inset ring-slate-200 hover:text-slate-900">
          Afslut
        </button>
      </div>
    </div>
  );
}

function GuessArea({
  players,
  guesses,
  turn,
  onStartTurn,
  setGuess,
  lock,
  unlock,
  daily,
  revealing,
}: {
  players: Player[];
  guesses: Record<number, PlayerGuess>;
  turn: Turn | null;
  onStartTurn: () => void;
  setGuess: (pid: number, d: string) => string;
  lock: (pid: number) => void;
  unlock: (pid: number) => void;
  daily: boolean;
  revealing: boolean;
}) {
  const active = turn ? players[turn.pos] : null;
  return (
    <div>
      <div className="mb-3 flex items-baseline justify-between">
        <h3 className="text-sm font-semibold text-slate-900">{players.length > 1 ? "Jeres gæt" : "Dit gæt"}</h3>
        {turn && (
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-700">
            <Timer className="h-3.5 w-3.5" /> Tidspres
          </span>
        )}
      </div>

      {turn && (turn.stage === "inspect" || turn.stage === "handoff") && active && (
        <div className="mb-3 rounded-2xl bg-amber-50 p-4 ring-1 ring-inset ring-amber-200">
          <p className="text-sm text-amber-950">
            {turn.stage === "inspect" ? (
              <>Kig boligen igennem i ro og mag. Tiden starter først, når I trykker. <strong>{active.name}</strong> starter.</>
            ) : (
              <>Giv enheden videre til <strong>{active.name}</strong>. Tiden starter, når du trykker.</>
            )}
          </p>
          <button
            type="button"
            onClick={onStartTurn}
            className="mt-3 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-amber-500 text-sm font-extrabold text-slate-900 shadow-btn transition hover:bg-amber-400 active:translate-y-px"
          >
            <Timer className="h-4 w-4" /> Start tiden for {active.name}
          </button>
        </div>
      )}

      <div className="space-y-2">
        {players.map((p, i) => {
          const isActive = turn ? turn.stage === "running" && turn.pos === i : true;
          return (
            <GuessRow
              key={p.id}
              name={p.name}
              index={i}
              guess={guesses[p.id]}
              disabled={!isActive || revealing}
              canUnlock={!turn && !daily}
              autoFocus={isActive && (turn ? true : i === 0)}
              onGuess={(d) => setGuess(p.id, d)}
              onLock={() => lock(p.id)}
              onUnlock={() => unlock(p.id)}
              timer={turn && turn.stage === "running" && turn.pos === i ? <TimerBadge startedAt={turn.startedAt} /> : undefined}
            />
          );
        })}
      </div>
      {daily && <p className="mt-3 text-xs text-slate-500">Når du låser, afsløres prisen. Du kan ikke fortryde.</p>}
      {revealing && <p className="mt-3 text-sm font-semibold text-blue-700">Afslører prisen …</p>}
    </div>
  );
}

function RoundResult({
  home,
  round,
  players,
  timed,
  isLast,
  daily,
  onNext,
}: {
  home: PlayHome;
  round: Round | undefined;
  players: Player[];
  timed: boolean;
  isLast: boolean;
  daily: boolean;
  onNext: () => void;
}) {
  const [shown, setShown] = useState(false);
  useEffect(() => setShown(false), [home.id]);
  if (!round) return null;
  const facts = [
    home.typeLabel,
    home.area ? `${home.area} m²` : null,
    home.rooms ? `${home.rooms} vær.` : null,
    home.yearBuilt ? `opført ${home.yearBuilt}` : null,
    home.energyLabel ? `energimærke ${home.energyLabel}` : null,
  ].filter(Boolean);
  const winner = round.rows.find((r) => r.isWinner);

  return (
    <div className="mt-4 grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
      <div className="min-w-0 space-y-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={home.images[0]} alt="" className="aspect-[4/3] w-full rounded-3xl object-cover shadow-card" />
        {home.zipCode && <CityMap zip={home.zipCode} city={home.city} height={200} />}
      </div>
      <div className="min-w-0 space-y-4">
        <div className="rounded-3xl bg-[#0b1b33] p-5 text-white shadow-card-lift sm:p-6">
          <div className="text-sm text-blue-100">Den rigtige pris</div>
          <div className="mt-1 text-4xl font-extrabold tabular-nums tracking-tight sm:text-5xl">
            <CountUp to={round.price} onDone={() => setShown(true)} /> <span className="text-2xl font-bold text-blue-200">kr.</span>
          </div>
          {home.address && <div className="mt-2 text-sm font-medium text-white">{home.address}</div>}
          <div className="mt-1 text-sm text-blue-100">{facts.join(" · ")}</div>
          {home.listingUrl && (
            <a href={home.listingUrl} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-blue-200 hover:text-white">
              Se boligen hos mægleren <ExternalLink className="h-3.5 w-3.5" />
            </a>
          )}
        </div>

        <div className={`space-y-2 transition-opacity duration-300 ${shown ? "opacity-100" : "opacity-0"}`}>
          {winner && players.length > 1 && (
            <div className="rounded-2xl bg-amber-50 px-4 py-2.5 text-sm font-semibold text-amber-900 ring-1 ring-amber-200">
              <Crown className="mr-1.5 inline h-4 w-4" />
              {players.find((p) => p.id === winner.pid)?.name} var tættest på
            </div>
          )}
          {round.rows.map((r, i) => {
            const idx = players.findIndex((p) => p.id === r.pid);
            const p = players[idx];
            return (
              <div key={r.pid} className="row-in rounded-2xl bg-white p-4 shadow-card ring-1 ring-slate-200" style={{ animationDelay: `${i * 90}ms` }}>
                <div className="flex items-center gap-3">
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-xs font-bold text-white" style={{ background: playerColor(idx) }}>
                    {idx + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-bold">{p?.name}</div>
                    <div className="text-sm tabular-nums text-slate-600">
                      {kr(r.guess)} · {r.guess > round.price ? "+" : "−"}
                      {r.pct.toFixed(1).replace(".", ",")} %
                    </div>
                  </div>
                  <AccuracyPill pct={r.pct} />
                  <span className={`w-14 text-right text-xl font-extrabold tabular-nums ${r.points < 0 ? "text-rose-600" : "text-slate-900"}`}>
                    {r.points >= 0 ? "+" : "−"}
                    {Math.abs(r.points)}
                  </span>
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5 pl-11 text-xs">
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-slate-700">+{r.base} for præcision</span>
                  {r.bonus > 0 && <span className="rounded-full bg-amber-100 px-2 py-0.5 font-semibold text-amber-900">+{r.bonus} tættest på</span>}
                  {r.streakBonus > 0 && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-orange-100 px-2 py-0.5 font-semibold text-orange-900">
                      <Flame className="h-3 w-3" /> +{r.streakBonus} stime ({r.streak} i træk)
                    </span>
                  )}
                  {timed && r.timePen > 0 && <span className="rounded-full bg-rose-100 px-2 py-0.5 font-semibold text-rose-800">−{r.timePen} over tid</span>}
                  {round.hintCost > 0 && <span className="rounded-full bg-slate-100 px-2 py-0.5 text-slate-600">−{round.hintCost} hints (trukket)</span>}
                </div>
              </div>
            );
          })}
          <button
            type="button"
            onClick={onNext}
            className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 text-base font-extrabold text-white shadow-btn transition hover:bg-blue-700 active:translate-y-px"
          >
            {isLast ? (daily ? "Se dit resultat" : "Se vinderen") : "Næste bolig"} <ArrowRight className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  );
}

function XpCard({ profile, xp, badges }: { profile: Profile; xp: number; badges: BadgeId[] }) {
  const lvl = levelFor(profile.xp);
  return (
    <div className="rounded-3xl bg-white p-5 shadow-card ring-1 ring-slate-200">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-slate-600">
          Niveau {lvl.level} · <span className="text-slate-900">{lvl.title}</span>
        </span>
        <span className="rounded-full bg-amber-100 px-2.5 py-1 text-sm font-extrabold text-amber-900">+{xp} XP</span>
      </div>
      <div className="mt-3 h-3 overflow-hidden rounded-full bg-slate-100">
        <div className="xp-fill h-full rounded-full bg-gradient-to-r from-amber-300 to-amber-500" style={{ width: `${lvl.progress * 100}%` }} />
      </div>
      <p className="mt-1.5 text-xs text-slate-500">
        {lvl.next ? `${(lvl.next.xp - profile.xp).toLocaleString("da-DK")} XP til ${lvl.next.title}` : "Du er på højeste niveau."}
      </p>
      {badges.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {badges.map((id) => {
            const b = BADGES.find((x) => x.id === id);
            return (
              <span key={id} className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-900 ring-1 ring-amber-200">
                ★ {b?.title}
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
}

function FreeFinal({
  players,
  rounds,
  profile,
  xp,
  badges,
  onAgain,
  onHome,
  save,
}: {
  players: Player[];
  rounds: Round[];
  profile: Profile;
  xp: number;
  badges: BadgeId[];
  onAgain: () => void;
  onHome: () => void;
  save: React.ReactNode;
}) {
  const ranked = [...players].sort((a, b) => b.score - a.score);
  const top = ranked[0];
  const tie = ranked.filter((p) => p.score === top.score).length > 1;
  const ownerId = players[0].id;
  const ownPcts = rounds.map((r) => r.rows.find((x) => x.pid === ownerId)?.pct ?? 100);
  const avg = ownPcts.length ? ownPcts.reduce((a, b) => a + b, 0) / ownPcts.length : 0;
  const best = ownPcts.length ? Math.min(...ownPcts) : 0;
  return (
    <div className="space-y-5">
      <div className="final-pop rounded-3xl bg-[#0b1b33] p-6 text-center text-white shadow-card-lift sm:p-8">
        <Crown className="mx-auto h-10 w-10 text-amber-400" />
        <div className="mt-2 text-sm font-semibold text-blue-100">{players.length > 1 ? (tie ? "Uafgjort" : "Vinderen er") : "Dit resultat"}</div>
        <div className="mt-1 text-3xl font-extrabold sm:text-4xl">{players.length > 1 ? ranked.filter((p) => p.score === top.score).map((p) => p.name).join(" & ") : `${top.score} point`}</div>
        {players.length > 1 && <div className="mt-1 text-lg text-blue-100">{top.score} point</div>}
        <div className="mt-5 grid grid-cols-2 gap-2 text-left">
          <div className="rounded-2xl bg-white/10 p-3">
            <div className="text-xs text-blue-100">Gns. afvigelse{players.length > 1 ? ` · ${players[0].name}` : ""}</div>
            <div className="text-xl font-bold tabular-nums">{avg.toFixed(1).replace(".", ",")} %</div>
          </div>
          <div className="rounded-2xl bg-white/10 p-3">
            <div className="text-xs text-blue-100">Bedste gæt</div>
            <div className="text-xl font-bold tabular-nums">{best.toFixed(1).replace(".", ",")} %</div>
          </div>
        </div>
      </div>

      {players.length > 1 && (
        <ol className="space-y-2">
          {ranked.map((p, i) => {
            const idx = players.findIndex((x) => x.id === p.id);
            return (
              <li key={p.id} className="flex items-center gap-3 rounded-2xl bg-white px-4 py-3 shadow-card ring-1 ring-slate-200">
                <span className="w-5 text-center text-sm font-bold text-slate-400">{i + 1}</span>
                <span className="grid h-7 w-7 place-items-center rounded-full text-xs font-bold text-white" style={{ background: playerColor(idx) }}>
                  {idx + 1}
                </span>
                <span className="flex-1 font-semibold">{p.name}</span>
                <span className={`text-lg font-extrabold tabular-nums ${p.score < 0 ? "text-rose-600" : ""}`}>{p.score}</span>
              </li>
            );
          })}
        </ol>
      )}

      <XpCard profile={profile} xp={xp} badges={badges} />
      {save}

      <div className="grid gap-2 sm:grid-cols-2">
        <button type="button" onClick={onAgain} className="flex h-14 items-center justify-center gap-2 rounded-2xl bg-blue-600 text-base font-extrabold text-white shadow-btn hover:bg-blue-700 active:translate-y-px">
          <RotateCcw className="h-5 w-5" /> Spil igen med nye boliger
        </button>
        <button type="button" onClick={onHome} className="flex h-14 items-center justify-center rounded-2xl bg-white text-base font-bold text-slate-900 ring-1 ring-inset ring-slate-300 hover:bg-slate-50">
          Til forsiden
        </button>
      </div>
    </div>
  );
}

function DailyFinal({
  result,
  profile,
  board,
  xp,
  badges,
  onShare,
  onFree,
  save,
}: {
  result: DailyResult;
  profile: Profile;
  board: ReturnType<typeof useBoard>;
  xp: number;
  badges: BadgeId[];
  onShare: () => void;
  onFree: () => void;
  save: React.ReactNode;
}) {
  useTicker(true, 1000);
  const ms = msToNextDaily();
  const time = [Math.floor(ms / 3_600_000), Math.floor((ms % 3_600_000) / 60_000), Math.floor((ms % 60_000) / 1000)]
    .map((n) => String(n).padStart(2, "0"))
    .join(":");
  const rank = board?.me?.rank ?? result.rank;
  const total = board?.total ?? result.total;
  const streak = liveStreak(profile);
  return (
    <div className="space-y-5">
      <div className="final-pop rounded-3xl bg-gradient-to-br from-blue-700 to-[#0b1b33] p-6 text-center text-white shadow-card-lift sm:p-8">
        <div className="text-sm font-semibold text-blue-100">Dagens 5</div>
        <div className="mt-2 text-6xl font-extrabold tabular-nums">{result.score}</div>
        <div className="text-blue-100">af 500 point</div>
        <div className="mt-3 text-3xl tracking-[0.2em]">{result.squares}</div>
        {rank && total ? (
          <p className="mt-3 text-lg">
            Nr. <strong>{rank}</strong> af {total} i dag
          </p>
        ) : null}
        <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
          <button type="button" onClick={onShare} className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-extrabold text-blue-700 shadow-btn hover:bg-blue-50 active:translate-y-px">
            <Share2 className="h-4 w-4" /> Del og udfordr en ven
          </button>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-sm font-semibold text-amber-300">
            <Flame className="h-4 w-4" /> {streak} {streak === 1 ? "dag" : "dage"} i træk
          </span>
        </div>
        <p className="mt-4 text-sm text-blue-100">
          Nye boliger om <span className="font-bold tabular-nums text-white">{time}</span>. Kom tilbage i morgen og hold stimen i live.
        </p>
      </div>
      <XpCard profile={profile} xp={xp} badges={badges} />
      {save}
      <Leaderboard board={board} />
      <button type="button" onClick={onFree} className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-slate-900 text-base font-extrabold text-white shadow-btn hover:bg-slate-800 active:translate-y-px">
        Spil fri leg imens <ArrowRight className="h-5 w-5" />
      </button>
    </div>
  );
}
