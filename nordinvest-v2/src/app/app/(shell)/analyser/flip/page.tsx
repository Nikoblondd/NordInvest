import type { Metadata } from "next";
import type { CSSProperties } from "react";
import { Suspense } from "react";
import { FlipReport } from "@/components/flip/FlipReport";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Flip-analyse" };

const geistScope = { "--font-display": "var(--font-geist)", "--font-inter": "var(--font-geist)" } as CSSProperties;

export default function FlipPage() {
  return (
    <div style={geistScope} className="font-geist">
      <Suspense fallback={<div className="mx-auto mt-6 h-96 max-w-[1080px] animate-pulse rounded-2xl bg-white" />}>
        <FlipReport />
      </Suspense>
    </div>
  );
}
