import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { PageHeader } from "@/components/app/PageHeader";
import { AccessAdmin } from "@/components/app/AccessAdmin";
import { appUser } from "@/lib/app/data";
import { listRequests } from "@/lib/access/requests";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Anmodninger" };

export default async function AccessAdminPage({ searchParams }: { searchParams: { anmodning?: string; handling?: string } }) {
  const me = await appUser();
  if (!me) redirect(`/auth/login?next=${encodeURIComponent(`/app/admin/adgang${searchParams.anmodning ? `?anmodning=${searchParams.anmodning}&handling=${searchParams.handling ?? ""}` : ""}`)}`);
  if (!me.admin) notFound();
  const requests = await listRequests();
  const id = typeof searchParams.anmodning === "string" && /^[0-9a-f-]{36}$/i.test(searchParams.anmodning) ? searchParams.anmodning : null;
  const action = searchParams.handling === "afvis" ? "afvis" : "godkend";
  return (
    <div className="mx-auto max-w-[1040px] px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
      <PageHeader title="Anmodninger" sub="Godkend eller afvis dem, der har anmodet om adgang på nordinvest.io/adgang. Kun administratorer kan se denne side." />
      <AccessAdmin requests={requests} focus={id ? { id, action } : null} />
    </div>
  );
}
