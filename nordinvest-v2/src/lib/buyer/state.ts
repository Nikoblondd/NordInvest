/*
 * What the home buyer's map remembers per person: filters, where they were
 * looking, saved homes and which mails they want. Shared by the browser and
 * the API; stored server side (member-data/boligkoeb/<user>.json).
 */

export type Sort = "bedste" | "billigst" | "dyrest" | "prisfald" | "nyeste" | "m2" | "stoerst";
export const SORTS: { id: Sort; label: string }[] = [
  { id: "bedste", label: "Bedste køb" },
  { id: "billigst", label: "Billigst" },
  { id: "m2", label: "Lavest m²-pris" },
  { id: "prisfald", label: "Største prisfald" },
  { id: "nyeste", label: "Nyeste" },
  { id: "stoerst", label: "Størst" },
  { id: "dyrest", label: "Dyrest" },
];

export type Filters = {
  types: string[];
  priceMin: number | null;
  priceMax: number | null;
  areaMin: number | null;
  roomsMin: number | null;
  verdicts: ("godt" | "middel" | "dyrt")[];
  onlyCut: boolean;
  onlyNew: boolean;
  sort: Sort;
  /** An area drawn on the map, as [lon, lat] points. Only homes inside it are shown. */
  shape?: [number, number][] | null;
};

export const EMPTY_FILTERS: Filters = { types: [], priceMin: null, priceMax: null, areaMin: null, roomsMin: null, verdicts: [], onlyCut: false, onlyNew: false, sort: "bedste" };

/** Where the buyer is with a saved home. */
export type Stage = "interesseret" | "fremvisning" | "bud" | "fravalgt";
export const STAGES: { id: Stage; label: string }[] = [
  { id: "interesseret", label: "Interesseret" },
  { id: "fremvisning", label: "Fremvisning" },
  { id: "bud", label: "Har budt" },
  { id: "fravalgt", label: "Fravalgt" },
];

export type SavedHome = { id: string; savedAt: string; price: number; address: string; alert: boolean; lastPrice?: number; gone?: boolean; stage?: Stage; note?: string };

export type Household = { income: number | null; savings: number | null; debt: number | null; couple: boolean };

export type BuyerState = {
  filters: Filters;
  /** Where the map was, and the visible box [west, south, east, north] that "new homes" are counted in. */
  view: { lat: number; lon: number; zoom: number; bounds?: [number, number, number, number] } | null;
  saved: SavedHome[];
  /** Last time the map was opened (ISO). The "new since" popup counts from here. */
  lastVisit: string | null;
  /** The day (YYYY-MM-DD, Copenhagen) the "new since" popup was last shown. */
  greetedOn: string | null;
  tourDone: boolean;
  mail: { newMatches: boolean; priceDrops: boolean };
  household: Household;
  /** When the daily mail last ran for this person (ISO). */
  mailedAt?: string | null;
  /** Places the person searched for, newest first, so a shared list can show them. */
  areas?: Area[];
  /** Set by the server when the person shares their list. */
  shareToken?: string | null;
};

export type Area = { label: string; bounds: [number, number, number, number] };

export const EMPTY_STATE: BuyerState = {
  filters: EMPTY_FILTERS, view: null, saved: [], lastVisit: null, greetedOn: null, tourDone: false,
  mail: { newMatches: false, priceDrops: true }, household: { income: null, savings: null, debt: null, couple: false },
};

const n = (v: unknown, max = 1e10) => (typeof v === "number" && Number.isFinite(v) && v >= 0 && v <= max ? v : null);
const VERDICTS = ["godt", "middel", "dyrt"] as const;

/** Never trust what the browser sends: keep only known fields with sane values. */
export function cleanState(raw: unknown, prev: BuyerState = EMPTY_STATE): BuyerState {
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
  const f = (r.filters && typeof r.filters === "object" ? r.filters : prev.filters) as Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
  const filters: Filters = {
    types: Array.isArray(f.types) ? f.types.filter((t: unknown) => typeof t === "string").slice(0, 8) : [],
    priceMin: n(f.priceMin), priceMax: n(f.priceMax), areaMin: n(f.areaMin, 5000), roomsMin: n(f.roomsMin, 50),
    verdicts: Array.isArray(f.verdicts) ? f.verdicts.filter((v: unknown) => (VERDICTS as readonly unknown[]).includes(v)) : [],
    onlyCut: !!f.onlyCut, onlyNew: !!f.onlyNew,
    sort: SORTS.some((s) => s.id === f.sort) ? f.sort : "bedste",
    shape: Array.isArray(f.shape) && f.shape.length >= 3 && f.shape.length <= 400 && f.shape.every((pt: unknown) => Array.isArray(pt) && pt.length === 2 && pt.every((x) => typeof x === "number" && Number.isFinite(x)))
      ? (f.shape as [number, number][]).map(([x, y]) => [Math.round(x * 1e5) / 1e5, Math.round(y * 1e5) / 1e5] as [number, number])
      : null,
  };
  const v = r.view;
  const bounds = Array.isArray(v?.bounds) && v.bounds.length === 4 && v.bounds.every((x: unknown) => typeof x === "number" && Number.isFinite(x)) ? (v.bounds as [number, number, number, number]) : undefined;
  const view = v && n(v.lat, 90) != null && n(v.lon, 180) != null && n(v.zoom, 22) != null ? { lat: v.lat, lon: v.lon, zoom: v.zoom, ...(bounds ? { bounds } : {}) } : prev.view;
  const saved: SavedHome[] = Array.isArray(r.saved)
    ? r.saved.filter((s: any) => s && typeof s.id === "string").slice(0, 300).map((s: any) => ({ // eslint-disable-line @typescript-eslint/no-explicit-any
        id: String(s.id).slice(0, 80), savedAt: typeof s.savedAt === "string" ? s.savedAt : new Date().toISOString(),
        price: n(s.price) ?? 0, address: String(s.address ?? "").slice(0, 160), alert: s.alert !== false,
        ...(n(s.lastPrice) != null ? { lastPrice: s.lastPrice } : {}), ...(s.gone ? { gone: true } : {}),
        ...(STAGES.some((x) => x.id === s.stage) ? { stage: s.stage } : {}),
        ...(typeof s.note === "string" && s.note.trim() ? { note: s.note.slice(0, 1000) } : {}),
      }))
    : prev.saved;
  const h = (r.household && typeof r.household === "object" ? r.household : prev.household) as Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
  return {
    filters, view, saved,
    lastVisit: typeof r.lastVisit === "string" ? r.lastVisit : prev.lastVisit,
    greetedOn: typeof r.greetedOn === "string" ? r.greetedOn.slice(0, 10) : prev.greetedOn,
    tourDone: typeof r.tourDone === "boolean" ? r.tourDone : prev.tourDone,
    mail: r.mail && typeof r.mail === "object" ? { newMatches: !!r.mail.newMatches, priceDrops: !!r.mail.priceDrops } : prev.mail,
    household: { income: n(h.income), savings: n(h.savings), debt: n(h.debt), couple: !!h.couple },
    mailedAt: prev.mailedAt ?? null,
    areas: Array.isArray(r.areas)
      ? r.areas.filter((a: any) => a && typeof a.label === "string" && Array.isArray(a.bounds) && a.bounds.length === 4 && a.bounds.every((x: unknown) => typeof x === "number" && Number.isFinite(x))).slice(0, 8).map((a: any) => ({ label: String(a.label).slice(0, 80), bounds: a.bounds })) // eslint-disable-line @typescript-eslint/no-explicit-any
      : prev.areas ?? [],
    shareToken: prev.shareToken ?? null,
  };
}

/** Today's date in Copenhagen, YYYY-MM-DD. */
export const dkDay = (d = new Date()) => new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Copenhagen" }).format(d);
