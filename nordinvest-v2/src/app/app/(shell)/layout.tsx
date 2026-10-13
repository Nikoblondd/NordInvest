import { redirect } from "next/navigation";
import { AppShell } from "@/components/app/AppShell";
import { appUser, properties } from "@/lib/app/data";
import { EMPTY_MAPPE, type Mappe } from "@/lib/mappe/checklist";
import { readStore } from "@/lib/app/store";
import type { CalEvent } from "@/lib/app/events";
import type { Agent } from "@/lib/app/agents";

export const dynamic = "force-dynamic";

export default async function ShellLayout({ children }: { children: React.ReactNode }) {
  const me = await appUser();
  if (!me) redirect("/auth/login?next=/app");
  // First login: password, name and phone before anything else.
  if (!me.onboarded) redirect("/app/velkommen");

  const [rows, events, agents] = await Promise.all([properties(me.user.id), readStore<CalEvent>("events", me.user.id), readStore<Agent>("agents", me.user.id)]);
  const mappeOf = (r: (typeof rows)[number]): Mappe => ({ ...EMPTY_MAPPE, ...((r.property_data?.mappe as Mappe | undefined) ?? {}) });
  const live = rows.filter((r) => mappeOf(r).stage !== "droppet");
  // Today's appointments (Danish date) on properties and in the member's own calendar.
  const today = new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Copenhagen" }).format(new Date());
  const isToday = (t: { due: string | null; done: boolean }) => !t.done && !!t.due && t.due.slice(0, 10) === today;
  const todayCount = live.reduce((n, r) => n + (mappeOf(r).tasks ?? []).filter(isToday).length, 0) + events.filter(isToday).length;
  const fresh = agents.reduce((n, a) => n + a.hits.filter((h) => h.status === "ny").length, 0);

  return (
    <AppShell
      user={{ name: me.name, email: me.user.email ?? "", admin: me.admin, tour: me.tour }}
      props={rows.map((r) => ({ id: r.id, address: (r.property_data?.address as string | undefined) || r.property_url || "Bolig" }))}
      counts={{ properties: live.length, today: todayCount, fresh }}
    >
      {children}
    </AppShell>
  );
}
