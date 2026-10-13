import { NextResponse } from "next/server";
import { toolUser } from "@/lib/gate";
import { parseBrief } from "@/lib/app/agent-ai";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

/* POST { text }: the member's own words to agent criteria, strategy and a name. */
export async function POST(req: Request) {
  const user = await toolUser();
  if (!user) return NextResponse.json({ ok: false, reason: "no_access" }, { status: 403 });
  const { text } = (await req.json().catch(() => ({}))) as { text?: string };
  if (!text || text.trim().length < 4) return NextResponse.json({ ok: false, reason: "empty" }, { status: 422 });
  const parsed = await parseBrief(text);
  return NextResponse.json({ ok: true, ...parsed }, { headers: { "Cache-Control": "no-store" } });
}
