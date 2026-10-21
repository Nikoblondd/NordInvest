import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { PageHeader } from "@/components/app/PageHeader";
import { MembersBoard } from "@/components/app/admin/MembersBoard";
import { appUser } from "@/lib/app/data";
import { listMembers } from "@/lib/admin/members";
import { listRequests } from "@/lib/access/requests";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Medlemmer" };

export default async function MembersPage() {
  const me = await appUser();
  if (!me) redirect("/auth/login?next=/app/admin/medlemmer");
  if (!me.admin) notFound();
  const [members, requests] = await Promise.all([listMembers(), listRequests()]);
  return (
    <div className="mx-auto max-w-[1200px] px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
      <PageHeader title="Medlemmer" sub="Alle med en konto, og hvordan de bruger NordInvest. Klik på en person for at se profilen og skifte adgangstype." actions={<a href="/boligkoeb?som=ny" target="_blank" rel="noopener" className="inline-flex min-h-[44px] items-center rounded-lg border border-slate-300 bg-white px-4 text-[14px] font-semibold text-slate-800 hover:border-slate-400">Se boligkortet som ny boligkøber</a>} />
      <MembersBoard members={members} pending={requests.filter((r) => r.status === "ny" || r.status === "kontaktet").length} />
    </div>
  );
}
