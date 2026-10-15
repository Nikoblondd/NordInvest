import { NextResponse } from "next/server";
import { brokerUser } from "@/lib/broker/gate";
import { caseFromUrl, findCases } from "@/lib/broker/cases";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* GET /api/maegler/sager?q=: the agent's listing on Ejendomstorvet, by address or link. Agents and admins only. */
export async function GET(req: Request) {
  if (!(await brokerUser())) return NextResponse.json({ ok: false, reason: "no_access" }, { status: 403 });
  const q = (new URL(req.url).searchParams.get("q") ?? "").trim();
  if (/^https?:\/\//i.test(q)) {
    const c = await caseFromUrl(q);
    return NextResponse.json({ ok: true, cases: c ? [c] : [], fromLink: true }, { headers: { "Cache-Control": "no-store" } });
  }
  const cases = await findCases(q);
  return NextResponse.json({ ok: true, cases }, { headers: { "Cache-Control": "no-store" } });
}
