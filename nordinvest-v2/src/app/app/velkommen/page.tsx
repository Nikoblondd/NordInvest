import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Welcome } from "@/components/app/Welcome";
import { appUser } from "@/lib/app/data";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Velkommen" };

export default async function WelcomePage() {
  const me = await appUser();
  if (!me) redirect("/auth/login?next=/app");
  if (me.onboarded) redirect("/app");
  // Accounts that signed in with Google or LinkedIn already have a way back in.
  const providers = ((me.user.app_metadata?.providers as string[] | undefined) ?? [me.user.app_metadata?.provider as string]).filter(Boolean);
  const needsPassword = !providers.some((p) => p === "google" || p === "linkedin_oidc");
  return <Welcome initialName={me.name} initialPhone={(me.profile?.phone as string | null) ?? ""} email={me.user.email ?? ""} needsPassword={needsPassword} />;
}
