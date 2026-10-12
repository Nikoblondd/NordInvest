import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { BankReport } from "@/components/report/BankReport";
import { toolUser } from "@/lib/gate";

export const metadata: Metadata = {
  title: "Bankrapport",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";

export default async function RapportPage() {
  if (!(await toolUser())) redirect("/adgang?kilde=konto");
  return <BankReport />;
}
