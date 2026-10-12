import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { PropertyCase } from "@/components/app/PropertyCase";
import type { MappeRow } from "@/components/mappe/Mappe";
import { appUser } from "@/lib/app/data";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  const me = await appUser();
  if (!me) return { title: "Ejendom" };
  const { data } = await me.supabase.from("analyses").select("property_data").eq("id", params.id).eq("user_id", me.user.id).single();
  const address = (data?.property_data as { address?: string } | null)?.address;
  return { title: address ? address.split(",")[0] : "Ejendom" };
}

export default async function PropertyPage({ params, searchParams }: { params: { id: string }; searchParams: { fane?: string } }) {
  const me = await appUser();
  if (!me) redirect(`/auth/login?next=/app/ejendomme/${params.id}`);
  // Only a valid id that belongs to this member.
  if (!/^[0-9a-f-]{20,40}$/i.test(params.id)) notFound();
  const { data: row } = await me.supabase
    .from("analyses")
    .select("id, created_at, property_url, property_data, analysis_result, investment_score, verdict")
    .eq("id", params.id)
    .eq("user_id", me.user.id)
    .single();
  if (!row) notFound();
  return <PropertyCase row={row as MappeRow} initialTab={searchParams.fane} />;
}
