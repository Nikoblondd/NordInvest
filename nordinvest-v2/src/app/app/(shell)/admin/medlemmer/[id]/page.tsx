import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { MemberProfile } from "@/components/app/admin/MemberProfile";
import { appUser } from "@/lib/app/data";
import { getMember } from "@/lib/admin/members";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Medlem" };

export default async function MemberPage({ params }: { params: { id: string } }) {
  const me = await appUser();
  if (!me) redirect(`/auth/login?next=/app/admin/medlemmer/${encodeURIComponent(params.id)}`);
  if (!me.admin) notFound();
  const m = await getMember(params.id);
  if (!m) notFound();
  return <MemberProfile m={m} self={m.id === me.user.id} />;
}
