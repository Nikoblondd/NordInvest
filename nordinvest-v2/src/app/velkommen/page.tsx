import { redirect } from "next/navigation";
import { toolUser } from "@/lib/gate";

export const dynamic = "force-dynamic";

export default async function VelkommenPage() {
  // The welcome step lives in the app now; its gate handles everyone else.
  if (await toolUser()) redirect("/app/velkommen");
  redirect("/adgang?kilde=konto");
}
