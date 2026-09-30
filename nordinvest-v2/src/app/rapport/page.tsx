import type { Metadata } from "next";
import { BankReport } from "@/components/report/BankReport";

export const metadata: Metadata = {
  title: "Bankrapport",
  robots: { index: false, follow: false },
};

export default function RapportPage() {
  return <BankReport />;
}
