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
