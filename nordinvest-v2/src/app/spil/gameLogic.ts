export type ScorePlayer = { id: number; score: number };

export type GuessValue = { value: number | null };

export type RoundScore = {
  playerId: number;
  playerIndex: number;
  guess: number;
  diff: number;
  pct: number;
  points: number; // total points awarded this round (base + winner bonus)
  basePoints: number; // proximity points, everyone gets some
  winnerBonus: number; // extra for being closest
  isWinner: boolean;
};

/**
 * Proximity scoring — everyone gets points for being close, not just the winner.
 * Bug fixed 2026-09-21: the old model gave 0 to non-winners, and 0 to the
 * winner too when their pct-diff was above 20 %, so a whole round could end
 * with nobody scoring. Positive-sum feedback keeps players engaged.
 *
 * Curve:
 *   0.0 %  off → 100 (bullseye)
 *   3.0 %  off → 88
 *   5.0 %  off → 80
 *   10.0 % off → 60
 *   15.0 % off → 45
 *   25.0 % off → 20
 *   50.0 % off → 5 (participation)
 *  ≥75.0 % off → 0
 */
export function proximityPoints(pctDiff: number): number {
  const pct = Math.max(0, pctDiff);
  if (pct >= 75) return 0;
  if (pct >= 50) return 5;
  // Linear-ish curve from 100 (at 0 %) down to ~5 (at 50 %).
  const raw = 100 - pct * 3;
  return Math.max(5, Math.min(100, Math.round(raw)));
}

/** Winner bonus grows with how close the winner actually was. */
export function winnerBonus(pctDiff: number): number {
  if (pctDiff < 1) return 50; // bullseye — perfect run
  if (pctDiff < 3) return 40;
  if (pctDiff < 5) return 30;
  if (pctDiff < 10) return 20;
  return 15; // even a not-so-close winner gets some closing-strongest recognition
}

// Legacy export kept for any old callers/tests. Now identical to proximityPoints.
export function scoreForDiffPct(pctDiff: number): number {
  return proximityPoints(pctDiff);
}

/**
 * Score one round from the same data that the UI uses to lock the guesses.
 * Every player gets proximity points; the closest player(s) also get a
 * winner bonus. Ties share the bonus.
 */
export function calculateRoundScores(
  players: ScorePlayer[],
  guesses: Record<number, GuessValue>,
  actualPrice: number,
): RoundScore[] {
  if (actualPrice <= 0) {
    throw new Error("A property price must be greater than zero");
  }

  const scored = players.map((player, playerIndex) => {
    const guess = guesses[player.id]?.value;
    if (guess == null) {
      throw new Error(`Player ${player.id} has not submitted a guess`);
    }
    const diff = Math.abs(guess - actualPrice);
    const pct = (diff / actualPrice) * 100;
    return {
      playerId: player.id,
      playerIndex,
      guess,
      diff,
      pct,
      basePoints: proximityPoints(pct),
    };
  });

  const closestDiff = Math.min(...scored.map((row) => row.diff));
  const winnerRow = scored.find((row) => row.diff === closestDiff)!;
  const bonus = winnerBonus(winnerRow.pct);

  return scored
    .map((row) => {
      const isWinner = row.diff === closestDiff;
      const winnerBonusPoints = isWinner ? bonus : 0;
      return {
        ...row,
        winnerBonus: winnerBonusPoints,
        points: row.basePoints + winnerBonusPoints,
        isWinner,
      };
    })
    .sort((a, b) => a.diff - b.diff || a.playerIndex - b.playerIndex);
}

/* ---------- 2026-09-25: timer, streaks, accuracy, levels, daily ---------- */

/** What one hint costs every player (points). */
export const HINT_COST = 5;

/** Seconds each player gets per round in timed mode. */
export const TURN_SECONDS = 30;

/** −10 points for every full 5 seconds a player goes over the clock. */
export function timePenalty(secondsUsed: number): number {
  const over = secondsUsed - TURN_SECONDS;
  if (over < 5) return 0;
  return Math.floor(over / 5) * 10;
}

/**
 * Hot-streak bonus: a player who lands within 10 % several rounds in a row
 * gets +10 on the 2nd, +20 on the 3rd and +30 from the 4th round on.
 */
export const STREAK_PCT = 10;
export function streakBonus(streak: number): number {
  if (streak < 2) return 0;
  return Math.min(30, (streak - 1) * 10);
}

export type Accuracy = { key: "spot" | "sharp" | "close" | "off" | "far"; label: string; square: string };

export function accuracy(pct: number): Accuracy {
  if (pct <= 2) return { key: "spot", label: "Plet på!", square: "🟩" };
  if (pct <= 5) return { key: "sharp", label: "Skarpt", square: "🟩" };
  if (pct <= 10) return { key: "close", label: "Tæt på", square: "🟨" };
  if (pct <= 20) return { key: "off", label: "Lidt ved siden af", square: "🟧" };
  return { key: "far", label: "Langt fra", square: "🟥" };
}

/** Daily challenge: pure proximity points per home, minus hints. Max 500. */
export function dailyScore(guesses: number[], prices: number[], hints: number): number {
  let total = 0;
  for (let i = 0; i < prices.length; i++) {
    const g = guesses[i];
    if (!(g > 0) || !(prices[i] > 0)) continue;
    total += proximityPoints((Math.abs(g - prices[i]) / prices[i]) * 100);
  }
  return Math.max(0, total - Math.max(0, Math.min(25, Math.floor(hints))) * HINT_COST);
}

export const LEVELS: { xp: number; title: string }[] = [
  { xp: 0, title: "Boligkigger" },
  { xp: 300, title: "Fremviser" },
  { xp: 800, title: "Husjæger" },
  { xp: 1600, title: "Budgiver" },
  { xp: 3000, title: "Mæglerlærling" },
  { xp: 5000, title: "Ejendomsmægler" },
  { xp: 8000, title: "Vurderingsekspert" },
  { xp: 12000, title: "Boligbaron" },
  { xp: 18000, title: "Markedsorakel" },
  { xp: 26000, title: "Legende" },
];

export function levelFor(xp: number) {
  let i = 0;
  while (i + 1 < LEVELS.length && xp >= LEVELS[i + 1].xp) i++;
  const cur = LEVELS[i];
  const next = LEVELS[i + 1];
  const progress = next ? (xp - cur.xp) / (next.xp - cur.xp) : 1;
  return { level: i + 1, title: cur.title, next, progress: Math.max(0, Math.min(1, progress)) };
}
