import { NextResponse } from "next/server";
import { toolUser } from "@/lib/gate";
import { readStore, writeStore } from "@/lib/app/store";
import { mergeRun, runAgent } from "@/lib/app/agent-run";
import type { Agent } from "@/lib/app/agents";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/* POST { id }: "Kør nu". Runs the agent at once; no e-mail, the member is looking at it. */
export async function POST(req: Request) {
  const user = await toolUser();
  if (!user) return NextResponse.json({ ok: false, reason: "no_access" }, { status: 403 });
  const { id } = (await req.json().catch(() => ({}))) as { id?: string };
  const agents = await readStore<Agent>("agents", user.id);
  const cur = agents.find((a) => a.id === id);
  if (!cur) return NextResponse.json({ ok: false, reason: "not_found" }, { status: 404 });
  const { agent, fresh, ok } = await runAgent(cur);
  // Re-read before writing, so a change made meanwhile is not lost.
  const latest = await readStore<Agent>("agents", user.id);
  const saved = await writeStore("agents", user.id, latest.map((a) => (a.id === agent.id ? mergeRun(a, agent) : a)));
  const merged = latest.find((a) => a.id === agent.id);
  return NextResponse.json({ ok: ok && saved, agent: merged ? mergeRun(merged, agent) : agent, fresh: fresh.length }, { headers: { "Cache-Control": "no-store" } });
}
