import type { Metadata } from "next";
import Link from "next/link";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";

export const metadata: Metadata = {
  title: "Siden findes ikke",
  robots: { index: false },
};

export default function NotFound() {
  return (
    <>
      <Nav />
      <main className="bg-[#f6f4ef] px-4 py-20 sm:px-6 sm:py-28">
        <div className="mx-auto max-w-xl">
          <p className="text-[15px] font-semibold text-blue-600">404</p>
          <h1 className="mt-2 text-[32px] font-semibold leading-[1.1] tracking-[-0.02em] text-slate-900 [text-wrap:balance] sm:text-[44px]">
            Siden findes ikke.
          </h1>
          <p className="mt-3 text-[17px] leading-relaxed text-slate-600">
            Linket er måske forældet, eller adressen er skrevet forkert. Her er de steder, de fleste leder efter:
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/analyseren/start" className="inline-flex min-h-[48px] items-center rounded-xl bg-blue-600 px-5 text-[16px] font-semibold text-white shadow-btn ring-1 ring-inset ring-white/10 hover:bg-blue-500 active:translate-y-px">
              Analysér en bolig
            </Link>
            <Link href="/deals" className="inline-flex min-h-[48px] items-center rounded-xl border border-slate-300 bg-white px-5 text-[16px] font-semibold text-slate-900 hover:border-slate-400">
              Deal-motoren
            </Link>
            <Link href="/" className="inline-flex min-h-[48px] items-center rounded-xl px-3 text-[16px] font-semibold text-slate-700 hover:text-slate-900">
              Forsiden
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
