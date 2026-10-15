import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { geist } from "@/components/home/fonts";
import { brokerUser } from "@/lib/broker/gate";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: { default: "NordInvest for mæglere", template: "%s · NordInvest" },
  robots: { index: false, follow: false },
};

/*
 * The agents' own corner of NordInvest. Signed-in estate agents (and admins)
 * only; agents do not see the investor platform.
 */
export default async function BrokerLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient();
  const user = supabase ? (await supabase.auth.getUser()).data.user : null;
  if (!user) redirect("/auth/login?next=/maegler");
  const me = await brokerUser();
  if (!me) redirect("/adgang?kilde=maegler");
  return (
    <div className={`${geist.variable} min-h-[100dvh] bg-slate-50 font-[family-name:var(--font-geist)] text-slate-900 antialiased`}>
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-[1080px] items-center gap-3 px-4 sm:px-6">
          <Link href="/maegler" className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-lg bg-white ring-1 ring-slate-200"><Image src="/nordinvest-logo.png" alt="" width={40} height={40} className="h-[78%] w-[78%] object-contain" /></span>
            <span className="whitespace-nowrap text-[16px] font-semibold">NordInvest <span className="hidden font-normal text-slate-500 sm:inline">for mæglere</span></span>
          </Link>
          <nav className="ml-auto flex items-center gap-0.5 whitespace-nowrap text-[14px] font-medium sm:gap-1">
            {me.admin && <Link href="/app" className="hidden rounded-lg px-3 py-2 text-slate-600 hover:bg-slate-100 sm:block">Til platformen</Link>}
            <Link href="/kontakt?emne=samarbejde" className="rounded-lg px-3 py-2 text-slate-600 hover:bg-slate-100">Kontakt</Link>
            <form action="/auth/signout" method="post"><button type="submit" className="rounded-lg px-3 py-2 text-slate-600 hover:bg-slate-100">Log ud</button></form>
          </nav>
        </div>
      </header>
      <main id="indhold">{children}</main>
    </div>
  );
}
