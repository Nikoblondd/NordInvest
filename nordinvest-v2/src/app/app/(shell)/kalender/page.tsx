import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Calendar } from "@/components/app/Calendar";
import { appUser, properties } from "@/lib/app/data";
import { readStore } from "@/lib/app/store";
import type { CalEvent } from "@/lib/app/events";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Kalender" };

export default async function CalendarPage({ searchParams }: { searchParams: { dag?: string; visning?: string } }) {
  const me = await appUser();
  if (!me) redirect("/auth/login?next=/app/kalender");
  const [rows, events] = await Promise.all([properties(me.user.id), readStore<CalEvent>("events", me.user.id)]);
  return <Calendar rows={rows} events={events} initialDay={searchParams.dag} initialView={searchParams.visning} />;
}
