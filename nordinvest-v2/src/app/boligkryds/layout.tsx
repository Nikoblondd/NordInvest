import type { Metadata } from "next";
import { geist } from "@/components/home/fonts";

/*
 * Boligkryds: the home buyer's map, served on boligkryds.nordinvest.io (the
 * middleware rewrites that host to these pages). A separate product from
 * NordInvest, with its own name and no index until it gets its own domain.
 */
export const metadata: Metadata = {
  metadataBase: new URL("https://boligkryds.nordinvest.io"),
  title: { absolute: "Boligkryds · Er boligen et godt køb?", template: "%s · Boligkryds" },
  description: "Alle boliger til salg i Danmark på ét kort. Grøn er et godt køb, rød er for dyr i forhold til lignende boliger i nærheden.",
  openGraph: { siteName: "Boligkryds", locale: "da_DK", type: "website" },
  robots: { index: false, follow: false },
  alternates: { canonical: null },
};

export default function BoligkrydsLayout({ children }: { children: React.ReactNode }) {
  return <div className={`${geist.variable} font-[family-name:var(--font-geist)]`}>{children}</div>;
}
