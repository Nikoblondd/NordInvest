import { redirect } from "next/navigation";
import { Suspense } from "react";
import { Nav } from "@/components/Nav";
import { createClient } from "@/lib/supabase/server";
import { Crm, type CrmRow } from "@/components/dashboard/Crm";
import { WelcomeCelebration } from "@/components/dashboard/WelcomeCelebration";
import { isAdmin } from "@/lib/access";

export const dynamic = "force-dynamic";

/*
 * "Mine ejendomme": the CRM and nothing else. Plan, usage, alerts and saved
 * searches live on /konto, reached from the profile menu.
 */
export default async function DashboardPage() {
  const supabase = createClient();
  if (!supabase) {
    return (
      <div className="min-h-screen bg-slate-50">
        <Nav />
        <div className="mx-auto max-w-2xl px-6 py-32 text-center">
          <h1 className="text-2xl font-bold">Login er ikke aktiveret endnu</h1>
        </div>
      </div>
    );
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");
  // Closed platform: only accounts with tool access have a workspace.
  if (!isAdmin(user)) redirect("/adgang?kilde=konto");

  const { data: profile } = await supabase.from("profiles").select("full_name, phone").eq("id", user.id).single();
  if (!profile?.phone) redirect("/velkommen");

  const { data: analyses } = await supabase
    .from("analyses")
    .select("id, created_at, investment_score, property_url, property_data, analysis_result")
    .eq("user_id", user.id)
    .eq("saved_to_portfolio", true)
    .order("created_at", { ascending: false });

  const firstName = profile.full_name?.split(" ")[0] ?? "investor";

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <Suspense fallback={null}>
        <WelcomeCelebration firstName={firstName} />
      </Suspense>
      <Nav />
      <main className="mx-auto max-w-[1400px] px-4 py-6 sm:px-6 sm:py-10">
        <Crm initial={(analyses ?? []) as CrmRow[]} firstName={firstName} />
      </main>
    </div>
  );
}
