import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/app/PageHeader";
import { TasksView } from "@/components/app/TasksView";
import { appUser, properties } from "@/lib/app/data";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Opgaver" };

export default async function TasksPage() {
  const me = await appUser();
  if (!me) redirect("/auth/login?next=/app/opgaver");
  const rows = await properties(me.user.id);
  return (
    <div className="mx-auto max-w-[1240px] px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
      <PageHeader title="Opgaver" sub="Fremvisninger, bankmøder og frister for alle dine boliger." />
      <TasksView initial={rows} />
    </div>
  );
}
