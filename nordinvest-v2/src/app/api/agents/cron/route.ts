import { NextResponse } from "next/server";
import { cronAuthorized } from "@/lib/gate";
import { hasToolAccess } from "@/lib/access";
import { getAuthUser } from "@/lib/supabase/admin";
import { readStore, storeOwners, writeStore } from "@/lib/app/store";
import { agentEmail, mergeRun, runAgent, sendAgentEmail } from "@/lib/app/agent-run";
import type { Agent } from "@/lib/app/agents";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

/*
 * Every hour: runs the search agents that are due (their own hour and days,
 * Danish time), and e-mails members about listings that are new since the
 * last run. Members only; an agent whose owner lost access is skipped.
 */
export async function GET(req: Request) {
  if (!cronAuthorized(req)) return NextResponse.json({ ok: false }, { status: 401 });
  const started = Date.now();
  const owners = await storeOwners("agents");
  let ran = 0, mailed = 0;
  for (const userId of owners) {
    if (Date.now() - started > 240000) break;
    const agents = await readStore<Agent>("agents", userId);
    const due = agents.filter((a) => a.active && a.nextRunAt && Date.parse(a.nextRunAt) <= Date.now() + 60000);
    if (!due.length) continue;
    const user = await getAuthUser(userId);
    if (!user || !hasToolAccess(user)) continue;
    const first = String(user.user_metadata?.full_name ?? "").split(" ")[0];
    const results = new Map<string, Agent>();
    for (const a of due) {
      const { agent, fresh, ok } = await runAgent(a);
      ran++;
      if (ok && fresh.length && a.email && user.email) {
        const sent = await sendAgentEmail(user.email, agentEmail(agent, fresh, first));
        if (sent) { mailed++; agent.runs[0] = { ...agent.runs[0], emailed: true }; }
      }
      results.set(agent.id, agent);
    }
    // Re-read and merge only the run results, so edits made meanwhile survive.
    const latest = await readStore<Agent>("agents", userId);
    await writeStore("agents", userId, latest.map((a) => {
      const r = results.get(a.id);
      return r ? mergeRun(a, r) : a;
    }));
  }
  return NextResponse.json({ ok: true, owners: owners.length, ran, mailed });
}
