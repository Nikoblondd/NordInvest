import { createClient } from "@/lib/supabase/server";
import { BuyerApp } from "@/components/buyer/BuyerApp";

export const dynamic = "force-dynamic";

/** Boligkryds: the map. Open to everyone; signing in only adds saving, mails and sharing. */
export default async function BoligkrydsPage() {
  const supabase = createClient();
  const user = supabase ? (await supabase.auth.getUser()).data.user : null;
  return <BuyerApp signedIn={!!user} email={user?.email ?? null} />;
}
