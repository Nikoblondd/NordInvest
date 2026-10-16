import { isAdmin } from "@/lib/access";
import { listAuthUsers, type AdminUser } from "@/lib/supabase/admin";
import { EMPTY_MAPPE, type Mappe, type Stage } from "@/lib/mappe/checklist";

/*
 * Admin only: every account with what it has done in NordInvest. Read with the
 * service role (RLS would only show the admin's own rows), so this module must
 * only be called from pages and routes that have checked isAdmin first.
 */

const URL_ = () => process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const KEY = () => process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

async function rows<T>(table: string, query: string): Promise<T[]> {
  if (!URL_() || !KEY()) return [];
  const out: T[] = [];
  for (let from = 0; from < 20000; from += 1000) {
    const r = await fetch(`${URL_()}/rest/v1/${table}?${query}`, {
      headers: { Authorization: `Bearer ${KEY()}`, apikey: KEY(), Range: `${from}-${from + 999}` },
      cache: "no-store",
    }).catch(() => null);
    if (!r?.ok) break;
    const page = (await r.json()) as T[];
    out.push(...page);
    if (page.length < 1000) break;
  }
  return out;
}

type ProfileRow = { id: string; full_name: string | null; phone: string | null; subscription_tier: string | null; subscription_status: string | null; stripe_customer_id: string | null; created_at: string };
type AnalysisRow = { id: string; user_id: string; created_at: string; saved_to_portfolio: boolean | null; investment_score: number | null; strategy: string | null; property_url: string | null; property_data: Record<string, unknown> | null };
type WatchRow = { id: string; user_id: string; address: string | null; status: string | null; created_at: string; has_alert: boolean | null };
type FeedbackRow = { id: string; user_id: string; rating: number | null; comment: string | null; created_at: string };

export type Access = "admin" | "member" | "broker" | "revoked" | "none";

export type MemberProperty = {
  id: string;
  address: string;
  createdAt: string;
  updatedAt: string | null;
  saved: boolean;
  score: number | null;
  strategy: string | null;
  price: number | null;
  stage: Stage | "droppet";
  tasksOpen: number;
  tasksDone: number;
  docs: number;
  offer: number | null;
};

export type MemberSummary = {
  id: string;
  email: string;
  name: string;
  phone: string;
  access: Access;
  /** A member who also has the broker tools (invited as "Begge"). */
  alsoBroker: boolean;
  /** Admin through the allowlist; cannot be changed from the board. */
  ownerAdmin: boolean;
  createdAt: string;
  invitedAt: string | null;
  lastSignIn: string | null;
  lastActive: string | null;
  provider: string;
  onboarded: boolean;
  tour: string | null;
  note: string;
  plan: string | null;
  analyses: number;
  analyses30: number;
  saved: number;
  pipeline: Partial<Record<Stage | "droppet", number>>;
  tasksOpen: number;
  tasksDone: number;
  docs: number;
  offers: number;
  watches: number;
  feedback: number;
  /** Analyses per week, oldest first, last 12 weeks. */
  weekly: number[];
};

export type MemberDetail = MemberSummary & {
  properties: MemberProperty[];
  watchList: { id: string; address: string; status: string; createdAt: string; alert: boolean }[];
  feedbackList: { id: string; rating: number | null; comment: string; createdAt: string }[];
};

const WEEK = 7 * 24 * 3600 * 1000;

function accessOf(u: AdminUser): Access {
  const a = u.app_metadata?.nordinvest_access;
  if (a === "revoked") return "revoked";
  if (isAdmin(u)) return "admin";
  if (a === "maegler") return "broker";
  return a === "member" ? "member" : "none";
}

function property(a: AnalysisRow): MemberProperty {
  const pd = a.property_data ?? {};
  const m: Mappe = { ...EMPTY_MAPPE, ...((pd.mappe as Mappe | undefined) ?? {}) };
  const tasks = m.tasks ?? [];
  return {
    id: a.id,
    address: (pd.address as string | undefined) || a.property_url || "Uden adresse",
    createdAt: a.created_at,
    updatedAt: (m as Mappe & { updatedAt?: string }).updatedAt ?? null,
    saved: !!a.saved_to_portfolio,
    score: a.investment_score,
    strategy: a.strategy,
    price: typeof pd.price === "number" ? pd.price : null,
    stage: m.stage,
    tasksOpen: tasks.filter((t) => !t.done).length,
    tasksDone: tasks.filter((t) => t.done).length,
    docs: (m.docs ?? []).length,
    offer: m.offer?.amount ?? null,
  };
}

function summarise(u: AdminUser, p: ProfileRow | undefined, own: AnalysisRow[], watches: WatchRow[], feedback: FeedbackRow[], now: number): MemberSummary {
  const props = own.map(property);
  const saved = props.filter((x) => x.saved);
  const pipeline: MemberSummary["pipeline"] = {};
  for (const x of saved) pipeline[x.stage] = (pipeline[x.stage] ?? 0) + 1;
  const weekly = Array.from({ length: 12 }, (_, i) => {
    const end = now - (11 - i) * WEEK;
    return own.filter((a) => { const t = Date.parse(a.created_at); return t > end - WEEK && t <= end; }).length;
  });
  const meta = (u.user_metadata ?? {}) as Record<string, unknown>;
  const stamps = [u.last_sign_in_at, ...own.map((a) => a.created_at), ...props.map((x) => x.updatedAt), ...watches.map((w) => w.created_at)].filter(Boolean) as string[];
  const providers = (u.app_metadata?.providers as string[] | undefined) ?? [String(u.app_metadata?.provider ?? "email")];
  return {
    id: u.id,
    email: u.email ?? "",
    name: p?.full_name || String(meta.full_name ?? "") || "",
    phone: p?.phone ?? "",
    access: accessOf(u),
    alsoBroker: u.app_metadata?.nordinvest_access === "member" && u.app_metadata?.nordinvest_broker === true,
    ownerAdmin: isAdmin({ ...u, app_metadata: { ...(u.app_metadata ?? {}), nordinvest_role: null } }),
    createdAt: u.created_at,
    invitedAt: (u.app_metadata?.nordinvest_invited_at as string | undefined) ?? null,
    lastSignIn: u.last_sign_in_at ?? null,
    lastActive: stamps.sort().at(-1) ?? null,
    provider: providers.map((x) => (x === "linkedin_oidc" ? "LinkedIn" : x === "google" ? "Google" : "E-mail")).join(", "),
    onboarded: !!meta.onboarded || !!p?.phone,
    tour: (meta.tour as string | undefined) ?? null,
    note: String(u.app_metadata?.nordinvest_note ?? ""),
    plan: p?.subscription_status === "active" ? p.subscription_tier : null,
    analyses: own.length,
    analyses30: own.filter((a) => now - Date.parse(a.created_at) < 30 * 24 * 3600 * 1000).length,
    saved: saved.length,
    pipeline,
    tasksOpen: saved.reduce((n, x) => n + x.tasksOpen, 0),
    tasksDone: saved.reduce((n, x) => n + x.tasksDone, 0),
    docs: saved.reduce((n, x) => n + x.docs, 0),
    offers: saved.filter((x) => x.offer != null).length,
    watches: watches.length,
    feedback: feedback.length,
    weekly,
  };
}

async function load(userId?: string) {
  const filter = userId ? `&user_id=eq.${encodeURIComponent(userId)}` : "";
  const [users, profiles, analyses, watches, feedback] = await Promise.all([
    listAuthUsers(),
    rows<ProfileRow>("profiles", `select=id,full_name,phone,subscription_tier,subscription_status,stripe_customer_id,created_at${userId ? `&id=eq.${encodeURIComponent(userId)}` : ""}`),
    rows<AnalysisRow>("analyses", `select=id,user_id,created_at,saved_to_portfolio,investment_score,strategy,property_url,property_data&order=created_at.desc${filter}`),
    rows<WatchRow>("watches", `select=id,user_id,address,status,created_at,has_alert&order=created_at.desc${filter}`),
    rows<FeedbackRow>("analysis_feedback", `select=id,user_id,rating,comment,created_at&order=created_at.desc${filter}`),
  ]);
  return { users, profiles, analyses, watches, feedback };
}

const by = <T extends { user_id: string }>(list: T[], id: string) => list.filter((x) => x.user_id === id);

/** Every account, members first, most recently active first. */
export async function listMembers(): Promise<MemberSummary[]> {
  const { users, profiles, analyses, watches, feedback } = await load();
  const now = Date.now();
  const rank: Record<Access, number> = { admin: 0, member: 0, broker: 0, revoked: 1, none: 2 };
  return users
    .map((u) => summarise(u, profiles.find((p) => p.id === u.id), by(analyses, u.id), by(watches, u.id), by(feedback, u.id), now))
    .sort((a, b) => rank[a.access] - rank[b.access] || (b.lastActive ?? "").localeCompare(a.lastActive ?? ""));
}

export async function getMember(id: string): Promise<MemberDetail | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const { users, profiles, analyses, watches, feedback } = await load(id);
  const u = users.find((x) => x.id === id);
  if (!u) return null;
  const own = by(analyses, id);
  return {
    ...summarise(u, profiles[0], own, by(watches, id), by(feedback, id), Date.now()),
    properties: own.map(property),
    watchList: by(watches, id).map((w) => ({ id: w.id, address: w.address ?? "Uden adresse", status: w.status ?? "aktiv", createdAt: w.created_at, alert: !!w.has_alert })),
    feedbackList: by(feedback, id).map((f) => ({ id: f.id, rating: f.rating, comment: f.comment ?? "", createdAt: f.created_at })),
  };
}
