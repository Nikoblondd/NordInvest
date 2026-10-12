import { redirect } from "next/navigation";
import { toolUser } from "@/lib/gate";
import { VelkommenClient } from "@/components/account/VelkommenClient";

export const dynamic = "force-dynamic";

export default async function VelkommenPage() {
  if (!(await toolUser())) redirect("/adgang?kilde=konto");
  return <VelkommenClient />;
}
