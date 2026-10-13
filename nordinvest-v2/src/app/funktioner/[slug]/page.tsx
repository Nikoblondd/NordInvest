import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { FeaturePage } from "@/components/public/FeaturePage";
import { FEATURES, featureBySlug } from "@/lib/features";

export const dynamicParams = false;
export function generateStaticParams() {
  return FEATURES.map((f) => ({ slug: f.slug }));
}

export function generateMetadata({ params }: { params: { slug: string } }): Metadata {
  const f = featureBySlug(params.slug);
  if (!f) return {};
  const path = `/funktioner/${f.slug}`;
  return {
    title: { absolute: f.metaTitle },
    description: f.metaDescription,
    alternates: { canonical: path },
    openGraph: { title: f.metaTitle, description: f.metaDescription, url: path, type: "website", images: [{ url: "/opengraph-image.jpg", width: 1200, height: 630, alt: f.h1 }] },
  };
}

export default function Page({ params }: { params: { slug: string } }) {
  const f = featureBySlug(params.slug);
  if (!f) notFound();
  return <FeaturePage f={f} />;
}
