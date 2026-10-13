import type { Metadata } from "next";
import { GuidePage } from "@/components/public/GuidePage";
import { ParentsCalculator } from "@/components/public/ParentsCalculator";
import { guideBySlug } from "@/lib/guides";

const g = guideBySlug("foraeldrekoeb")!;
export const metadata: Metadata = {
  title: { absolute: g.metaTitle },
  description: g.metaDescription,
  alternates: { canonical: g.path },
  openGraph: { title: g.metaTitle, description: g.metaDescription, url: g.path, type: "article", images: [{ url: "/opengraph-image.jpg", width: 1200, height: 630, alt: g.h1 }] },
};
export default function Page() {
  return <GuidePage g={g} tool={<ParentsCalculator />} toolAfter="beregning" />;
}
