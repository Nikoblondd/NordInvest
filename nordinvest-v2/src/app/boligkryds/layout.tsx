import type { Metadata, Viewport } from "next";
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

// Edge to edge on phones (the map runs under the notch; controls keep clear of it with the safe-area insets).
export const viewport: Viewport = { width: "device-width", initialScale: 1, viewportFit: "cover", themeColor: "#ffffff" };

// No rubber-band bounce or pull-to-refresh behind the map and the sheets; the sheet slides in from below.
const CSS = `html,body{overscroll-behavior:none}[data-drag]{touch-action:none;user-select:none;-webkit-user-select:none}@keyframes bk-up{from{transform:translateY(100%)}to{transform:none}}@keyframes bk-fade{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:none}}`;

export default function BoligkrydsLayout({ children }: { children: React.ReactNode }) {
  return <div className={`${geist.variable} font-[family-name:var(--font-geist)]`}><style dangerouslySetInnerHTML={{ __html: CSS }} />{children}</div>;
}
