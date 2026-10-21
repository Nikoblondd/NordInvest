import type { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { geist } from "@/components/home/fonts";
import { toolUser } from "@/lib/gate";
import { isBroker, isPrivate } from "@/lib/access";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: { default: "NordInvest", template: "%s · NordInvest" },
  robots: { index: false, follow: false },
};

/*
 * Everything under /app is the product. Checked on the server for every
 * request: signed in, and a member (or admin). Nothing here is public.
 */
export default async function AppGate({ children }: { children: React.ReactNode }) {
  const supabase = createClient();
  const user = supabase ? (await supabase.auth.getUser()).data.user : null;
  if (!user) {
    const path = headers().get("x-ni-path") ?? "";
    redirect(`/auth/login?next=${encodeURIComponent(path.startsWith("/app") && !path.startsWith("//") ? path : "/app")}`);
  }
  if (!(await toolUser())) redirect(isBroker(user) ? "/maegler" : isPrivate(user) ? "/boligkoeb" : "/adgang?kilde=konto");
  return <div className={`${geist.variable} min-h-[100dvh] bg-slate-50 font-[family-name:var(--font-geist)] text-slate-900 antialiased`}>{children}</div>;
}
