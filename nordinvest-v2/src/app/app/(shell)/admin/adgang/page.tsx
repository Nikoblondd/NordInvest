import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { PageHeader } from "@/components/app/PageHeader";
import { AccessAdmin, type MemberRow } from "@/components/app/AccessAdmin";
import { appUser } from "@/lib/app/data";
import { listRequests } from "@/lib/access/requests";
import { listAuthUsers } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Adgang" };

export default async function AccessAdminPage() {
  const me = await appUser();
  if (!me) redirect("/auth/login?next=/app/admin/adgang");
  if (!me.admin) notFound();
  const [requests, users] = await Promise.all([listRequests(), listAuthUsers()]);
  const members: MemberRow[] = users
    .filter((u) => u.app_metadata?.nordinvest_access === "member" || u.app_metadata?.nordinvest_access === "revoked")
    .map((u) => ({
      id: u.id,
      email: u.email ?? "",
      name: String(u.user_metadata?.full_name ?? ""),
      createdAt: u.created_at,
      lastSignIn: u.last_sign_in_at ?? null,
      access: u.app_metadata?.nordinvest_access === "member" ? "member" : "revoked",
      note: typeof u.app_metadata?.nordinvest_note === "string" ? (u.app_metadata.nordinvest_note as string) : undefined,
    }));
  return (
    <div className="mx-auto max-w-[1040px] px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
      <PageHeader title="Adgang" sub="Anmodninger fra nordinvest.io/adgang og dine medlemmer. Kun du kan se denne side." />
      <AccessAdmin requests={requests} members={members} />
    </div>
  );
}
