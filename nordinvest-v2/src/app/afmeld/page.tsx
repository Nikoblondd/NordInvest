import type { Metadata } from "next";
import { AfmeldButton } from "./AfmeldButton";

export const metadata: Metadata = { title: "Afmeld mails fra NordInvest", robots: { index: false, follow: false } };

/* The page behind the unsubscribe link in outreach mail: one button, no login. */
export default function AfmeldPage({ searchParams }: { searchParams: { e?: string; t?: string } }) {
  return (
    <main className="flex min-h-[100dvh] items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 text-center sm:p-8">
        <h1 className="text-[22px] font-semibold text-slate-900">Afmeld mails fra NordInvest</h1>
        <p className="mt-2 text-[15px] text-slate-600">Du får ikke flere henvendelser fra os, når du har afmeldt dig.</p>
        <AfmeldButton e={searchParams.e ?? ""} t={searchParams.t ?? ""} />
      </div>
    </main>
  );
}
