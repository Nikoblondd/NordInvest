/*
 * What each visitor gets from the Deal-motor. The public pages (/deals and the
 * kommune pages) show a free sample; the engine itself is the paid product.
 * Without an account a search shows its 3 best deals, a free account shows
 * 10, and a paid plan shows everything, plus the map, the advanced filters
 * and Deal-vagt emails. Shared by the search API (which enforces it) and the
 * Deal-motor UI (which explains it).
 */
export type DealAccess = "anon" | "free" | "paid";

export const DEAL_ROWS: Record<DealAccess, number> = { anon: 3, free: 10, paid: Number.POSITIVE_INFINITY };

/** Search parameters only a paid plan may use. */
export const PAID_FILTERS = ["minYield", "minCashflow", "minScore", "minDscr", "roomsMin", "yearFrom", "energy", "subcat"] as const;

/** A search result larger than this is a map request, which is paid. */
export const MAP_LIMIT = 100;

export type LockedSummary = { count: number; positive: number; bestCashflow: number } | null;
