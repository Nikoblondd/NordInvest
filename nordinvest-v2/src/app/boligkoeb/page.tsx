import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { hasBuyerAccess } from "@/lib/access";
import { geist } from "@/components/home/fonts";
import { BuyerApp } from "@/components/buyer/BuyerApp";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: { absolute: "Boligkort · NordInvest" },
  robots: { index: false, follow: false },
};

/*
 * NordInvest for boligkøbere: the map of every home for sale with a price
 * verdict. Private buyers land here after the invitation and every login;
 * members and admins can open it too. Everyone else is sent to log in or to
 * the access request.
 */
export default async function BoligkoebPage({ searchParams }: { searchParams: Record<string, string | undefined> }) {
  const supabase = createClient();
  const user = supabase ? (await supabase.auth.getUser()).data.user : null;
  if (!user) {
    const back = `/boligkoeb${searchParams.bolig ? `?bolig=${encodeURIComponent(searchParams.bolig)}` : ""}`;
    redirect(`/auth/login?next=${encodeURIComponent(back)}`);
  }
  if (!hasBuyerAccess(user)) redirect("/boligkoeber");
  return (
    <main className={`${geist.variable} font-[family-name:var(--font-geist)]`}>
      <BuyerApp />
    </main>
  );
}
