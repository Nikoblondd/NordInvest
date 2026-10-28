/*
 * Private analyses for journalists: one unlisted page each (/presse/<token>),
 * with the Deal-motor's numbers for the kommuner they cover. The token is the
 * only key, so it is long and random; the pages are not indexed or linked.
 */
export type PressReport = { name: string; outlet: string; kommuner: string[] };

export const PRESS_REPORTS: Record<string, PressReport> = {
  "MR4w0ZR1KwCO": { name: "Lennart Kjær Schouborg", outlet: "Horsens Folkeblad", kommuner: ["hedensted", "horsens", "vejle", "odder"] },
};
