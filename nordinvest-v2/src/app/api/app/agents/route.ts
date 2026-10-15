import { NextResponse } from "next/server";
import { toolUser } from "@/lib/gate";
import { readStore, writeStore } from "@/lib/app/store";
import { runAgent } from "@/lib/app/agent-run";
import { MAX_AGENTS, PER_RUN_MAX, cleanCriteria, cleanSchedule, cleanStrategy, nextRun, suggestName, tidyAgent, type Agent, type HitStatus } from "@/lib/app/agents";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/*
 * The member's search agents.
 *  GET                         all agents
 *  POST   { name?, criteria, schedule, email, maxPerRun? }   create (runs once right away)
 *  PATCH  { id, name?, criteria?, schedule?, email?, active?, maxPerRun? }   change
 *  PATCH  { id, hit: { id, status, savedId? } }   mark a found listing
 *  PATCH  { id, readAll: true }   mark every new listing as seen
 *  DELETE ?id=
 * Members only; each member only ever reads and writes their own file.
 */
const json = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });
const STATUSES: HitStatus[] = ["ny", "set", "gemt", "afvist"];
const perRun = (v: unknown) => (Number.isFinite(Number(v)) ? Math.min(PER_RUN_MAX, Math.max(1, Math.round(Number(v)))) : PER_RUN_MAX);

export async function GET() {
  const user = await toolUser();
  if (!user) return json({ ok: false, reason: "no_access" }, 403);
  return json({ ok: true, agents: (await readStore<Agent>("agents", user.id)).map(tidyAgent) });
}

export async function POST(req: Request) {
  const user = await toolUser();
  if (!user) return json({ ok: false, reason: "no_access" }, 403);
  const b = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const agents = await readStore<Agent>("agents", user.id);
  if (agents.length >= MAX_AGENTS) return json({ ok: false, reason: "max" }, 422);
  const criteria = cleanCriteria(b.criteria);
  const schedule = cleanSchedule(b.schedule);
  const now = new Date().toISOString();
  const name = typeof b.name === "string" && b.name.trim() ? b.name.trim().slice(0, 80) : suggestName(criteria);
  const fresh: Agent = {
    id: crypto.randomUUID(), name, active: true, criteria, schedule, email: b.email !== false, maxPerRun: perRun(b.maxPerRun),
    strategy: cleanStrategy(b.strategy) ?? (criteria.market === "investering" ? "erhverv" : "udlejning"),
    brief: typeof b.brief === "string" ? b.brief.trim().slice(0, 600) : undefined,
    createdAt: now, updatedAt: now, lastRunAt: null, nextRunAt: nextRun(schedule), seen: [], runs: [], hits: [],
  };
  const { agent } = await runAgent(fresh, { first: true });
  const ok = await writeStore("agents", user.id, [agent, ...agents]);
  return ok ? json({ ok: true, agent }) : json({ ok: false, reason: "save" }, 502);
}

export async function PATCH(req: Request) {
  const user = await toolUser();
  if (!user) return json({ ok: false, reason: "no_access" }, 403);
  const b = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const agents = await readStore<Agent>("agents", user.id);
  const i = agents.findIndex((a) => a.id === b.id);
  if (i < 0) return json({ ok: false, reason: "not_found" }, 404);
  let a = tidyAgent({ ...agents[i] });

  if (b.hit && typeof b.hit === "object") {
    const h = b.hit as Record<string, unknown>;
    if (!STATUSES.includes(h.status as HitStatus)) return json({ ok: false, reason: "bad" }, 422);
    a.hits = a.hits.map((x) => (x.id === h.id ? { ...x, status: h.status as HitStatus, ...(typeof h.savedId === "string" ? { savedId: h.savedId } : {}) } : x));
  } else if (b.readAll) {
    a.hits = a.hits.map((x) => (x.status === "ny" ? { ...x, status: "set" } : x));
  } else {
    const nextCriteria = b.criteria !== undefined ? cleanCriteria(b.criteria) : null;
    const criteriaChanged = !!nextCriteria && JSON.stringify(nextCriteria) !== JSON.stringify(a.criteria);
    if (typeof b.name === "string" && b.name.trim()) a.name = b.name.trim().slice(0, 80);
    if (nextCriteria) a.criteria = nextCriteria;
    if (b.maxPerRun !== undefined) a.maxPerRun = perRun(b.maxPerRun);
    if (b.schedule !== undefined) a.schedule = cleanSchedule(b.schedule);
    if (typeof b.email === "boolean") a.email = b.email;
    if (typeof b.active === "boolean") a.active = b.active;
    const strategyChanged = cleanStrategy(b.strategy) && cleanStrategy(b.strategy) !== a.strategy;
    if (cleanStrategy(b.strategy)) a.strategy = cleanStrategy(b.strategy);
    if (typeof b.brief === "string") a.brief = b.brief.trim().slice(0, 600);
    a.nextRunAt = a.active ? nextRun(a.schedule) : null;
    a.updatedAt = new Date().toISOString();
    // New criteria: start over, so the list matches what the agent now looks for.
    if (criteriaChanged || strategyChanged) a = (await runAgent({ ...a, seen: [], hits: [], lastRunAt: null }, { first: true })).agent;
  }
  agents[i] = a;
  const ok = await writeStore("agents", user.id, agents);
  return ok ? json({ ok: true, agent: a }) : json({ ok: false, reason: "save" }, 502);
}

export async function DELETE(req: Request) {
  const user = await toolUser();
  if (!user) return json({ ok: false, reason: "no_access" }, 403);
  const id = new URL(req.url).searchParams.get("id");
  const agents = await readStore<Agent>("agents", user.id);
  const next = agents.filter((a) => a.id !== id);
  if (next.length === agents.length) return json({ ok: false, reason: "not_found" }, 404);
  const ok = await writeStore("agents", user.id, next);
  return json({ ok }, ok ? 200 : 502);
}
