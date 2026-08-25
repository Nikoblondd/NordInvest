import { redirect } from "next/navigation";
import Link from "next/link";
import { Nav } from "@/components/Nav";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const supabase = createClient();
  if (!supabase) {
    return (
      <div className="min-h-screen bg-slate-50">
        <Nav />
        <div className="mx-auto max-w-2xl px-6 py-32 text-center">
          <h1 className="text-2xl font-bold">Login er ikke aktiveret endnu</h1>
          <p className="mt-3 text-slate-600">
            Tilføj Supabase-nøglerne i miljøvariablerne, så virker dashboardet.
          </p>
        </div>
      </div>
    );
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, phone, email, subscription_tier, analyses_used_this_month")
    .eq("id", user.id)
    .single();

  if (!profile?.phone) redirect("/velkommen");

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <Nav />
      <main className="mx-auto max-w-5xl px-6 py-16">
        <h1 className="text-3xl font-bold tracking-tight">
          Velkommen, {profile.full_name?.split(" ")[0] ?? "investor"}.
        </h1>
        <p className="mt-2 text-slate-600">Din profil er oprettet. Kør din første analyse.</p>

        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          <div className="rounded-3xl border border-slate-200 bg-white p-6">
            <div className="text-xs font-semibold uppercase tracking-wider text-blue-600">Plan</div>
            <div className="mt-1 text-xl font-bold capitalize">{profile.subscription_tier ?? "gratis"}</div>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-white p-6">
            <div className="text-xs font-semibold uppercase tracking-wider text-blue-600">Analyser brugt</div>
            <div className="mt-1 text-xl font-bold tnum">{profile.analyses_used_this_month ?? 0}</div>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-white p-6">
            <div className="text-xs font-semibold uppercase tracking-wider text-blue-600">Kontakt</div>
            <div className="mt-1 text-sm text-slate-600">{profile.email}</div>
            <div className="text-sm text-slate-600">{profile.phone}</div>
          </div>
        </div>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/analyseren" className="rounded-full bg-blue-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-600/20 hover:bg-blue-700">
            Ny analyse →
          </Link>
          <form action="/auth/signout" method="post">
            <button className="rounded-full bg-slate-100 px-6 py-3 text-sm font-medium text-slate-900 hover:bg-slate-200">
              Log ud
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}
