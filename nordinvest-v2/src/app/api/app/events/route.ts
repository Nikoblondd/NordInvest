import { NextResponse } from "next/server";
import { toolUser } from "@/lib/gate";
import { readStore, writeStore } from "@/lib/app/store";
import { cleanEvent, type CalEvent } from "@/lib/app/events";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/*
 * The member's own calendar entries that are not on a property.
 *  GET · POST { event } · PATCH { event } (by id) · DELETE ?id=
 */
const json = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });

export async function GET() {
  const user = await toolUser();
  if (!user) return json({ ok: false, reason: "no_access" }, 403);
  return json({ ok: true, events: await readStore<CalEvent>("events", user.id) });
}

export async function POST(req: Request) {
  const user = await toolUser();
  if (!user) return json({ ok: false, reason: "no_access" }, 403);
  const b = (await req.json().catch(() => ({}))) as { event?: unknown };
  const ev = cleanEvent(b.event, crypto.randomUUID());
  if (!ev) return json({ ok: false, reason: "invalid" }, 422);
  const all = await readStore<CalEvent>("events", user.id);
  if (all.length >= 2000) return json({ ok: false, reason: "max" }, 422);
  const ok = await writeStore("events", user.id, [...all, ev]);
  return ok ? json({ ok: true, event: ev }) : json({ ok: false, reason: "save" }, 502);
}

export async function PATCH(req: Request) {
  const user = await toolUser();
  if (!user) return json({ ok: false, reason: "no_access" }, 403);
  const b = (await req.json().catch(() => ({}))) as { event?: { id?: string } };
  const all = await readStore<CalEvent>("events", user.id);
  const i = all.findIndex((e) => e.id === b.event?.id);
  if (i < 0) return json({ ok: false, reason: "not_found" }, 404);
  const ev = cleanEvent({ ...all[i], ...b.event }, all[i].id);
  if (!ev) return json({ ok: false, reason: "invalid" }, 422);
  all[i] = ev;
  const ok = await writeStore("events", user.id, all);
  return ok ? json({ ok: true, event: ev }) : json({ ok: false, reason: "save" }, 502);
}

export async function DELETE(req: Request) {
  const user = await toolUser();
  if (!user) return json({ ok: false, reason: "no_access" }, 403);
  const id = new URL(req.url).searchParams.get("id");
  const all = await readStore<CalEvent>("events", user.id);
  const next = all.filter((e) => e.id !== id);
  if (next.length === all.length) return json({ ok: false, reason: "not_found" }, 404);
  const ok = await writeStore("events", user.id, next);
  return json({ ok }, ok ? 200 : 502);
}
