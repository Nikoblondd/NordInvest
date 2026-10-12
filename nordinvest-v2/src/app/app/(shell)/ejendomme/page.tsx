import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Crm } from "@/components/dashboard/Crm";
import { appUser, properties } from "@/lib/app/data";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Ejendomme" };

export default async function PropertiesPage() {
  const me = await appUser();
  if (!me) redirect("/auth/login?next=/app/ejendomme");
  const rows = await properties(me.user.id);
  return (
    <div className="mx-auto max-w-[1400px] px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
      <Crm initial={rows} />
    </div>
  );
}
