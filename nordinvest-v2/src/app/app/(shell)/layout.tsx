import { redirect } from "next/navigation";
import { AppShell } from "@/components/app/AppShell";
import { appUser, properties } from "@/lib/app/data";
import { EMPTY_MAPPE, type Mappe } from "@/lib/mappe/checklist";

export const dynamic = "force-dynamic";

export default async function ShellLayout({ children }: { children: React.ReactNode }) {
  const me = await appUser();
  if (!me) redirect("/auth/login?next=/app");
  // First login: password, name and phone before anything else.
  if (!me.onboarded) redirect("/app/velkommen");

  const rows = await properties(me.user.id);
  const mappeOf = (r: (typeof rows)[number]): Mappe => ({ ...EMPTY_MAPPE, ...((r.property_data?.mappe as Mappe | undefined) ?? {}) });
  const live = rows.filter((r) => mappeOf(r).stage !== "droppet");
  const openTasks = live.reduce((n, r) => n + (mappeOf(r).tasks ?? []).filter((t) => !t.done).length, 0);

  return (
    <AppShell
      user={{ name: me.name, email: me.user.email ?? "", admin: me.admin, tour: me.tour }}
      props={rows.map((r) => ({ id: r.id, address: (r.property_data?.address as string | undefined) || r.property_url || "Bolig" }))}
      counts={{ properties: live.length, tasks: openTasks }}
    >
      {children}
    </AppShell>
  );
}
