import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import { createClient } from "@/lib/supabase/server";
import { toolUser } from "@/lib/gate";
import { Mappe, type MappeRow } from "@/components/mappe/Mappe";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Ejendomsmappe", robots: { index: false } };

export default async function MappePage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  if (!supabase) notFound();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/auth/login?next=/mappe/${params.id}`);
  if (!(await toolUser())) notFound();
  const { data: row } = await supabase
    .from("analyses")
    .select("id, created_at, property_url, property_data, analysis_result, investment_score, verdict")
    .eq("id", params.id)
    .eq("user_id", user.id)
    .single();
  if (!row) notFound();
  return (
    <>
      <Nav />
      <main className="bg-[#f4f6f9]">
        <Mappe row={row as MappeRow} />
      </main>
      <Footer />
    </>
  );
}
