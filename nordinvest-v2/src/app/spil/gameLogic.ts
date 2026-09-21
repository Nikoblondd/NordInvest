export type ScorePlayer = { id: number; score: number };

export type GuessValue = { value: number | null };

export type RoundScore = {
  playerId: number;
  playerIndex: number;
  guess: number;
  diff: number;
  pct: number;
  points: number;
  isWinner: boolean;
};

// 100 base points, minus 5 × the percentage difference.
// 0% off = 100 points, 10% off = 50 points, 20% off = 0 points.
export function scoreForDiffPct(pctDiff: number): number {
  const raw = 100 - Math.round(pctDiff * 5);
  return Math.max(0, Math.min(100, raw));
}

/**
 * Score one round from the same data that the UI uses to lock the guesses.
 * The closest guess wins; an exact tie gives the same bonus to every tied player.
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
    return {
      playerId: player.id,
      playerIndex,
      guess,
      diff,
      pct: (diff / actualPrice) * 100,
    };
  });

  const closestDiff = Math.min(...scored.map((row) => row.diff));
  const winnerPct = scored.find((row) => row.diff === closestDiff)!.pct;
  const winnerPoints = scoreForDiffPct(winnerPct);

  return scored
    .map((row) => ({
      ...row,
      points: row.diff === closestDiff ? winnerPoints : 0,
      isWinner: row.diff === closestDiff,
    }))
    .sort((a, b) => a.diff - b.diff || a.playerIndex - b.playerIndex);
}
