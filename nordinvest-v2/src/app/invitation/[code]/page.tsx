import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { geist } from "@/components/home/fonts";
import { getAuthUser } from "@/lib/supabase/admin";
import { matchLink, parseCode } from "@/lib/access/invite-link";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: { absolute: "Åbn NordInvest" }, robots: { index: false, follow: false } };

/*
 * The link in an invitation or "Glemt adgangskode" mail. Opening the page
 * signs no one in and uses nothing up, so mail scanners that open links can't
 * spoil it. The button posts to /api/invitation, which signs the person in.
 */
export default async function InvitationPage({ params, searchParams }: { params: { code: string }; searchParams: { fejl?: string } }) {
  const parsed = parseCode(decodeURIComponent(params.code));
  const user = parsed ? await getAuthUser(parsed.userId) : null;
  const match = parsed && user ? matchLink(user.app_metadata, parsed.token) : null;
  const meta = (user?.user_metadata ?? {}) as Record<string, unknown>;
  const first = String(meta.full_name ?? "").trim().split(/\s+/)[0];
  const broker = match?.record.kind === "maegler";
  const buyer = match?.record.kind === "privat";
  const login = match?.purpose === "login";

  return (
    <main className={`${geist.variable} flex min-h-[100dvh] items-center justify-center bg-slate-50 px-4 py-10 font-[family-name:var(--font-geist)] text-slate-900 antialiased`}>
      <div className="w-full max-w-[440px] rounded-2xl border border-slate-200 bg-white p-7 shadow-[0_30px_60px_-30px_rgba(15,23,42,0.25)] sm:p-9">
        <div className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-lg bg-white ring-1 ring-slate-200"><Image src="/nordinvest-logo.png" alt="" width={40} height={40} className="h-[78%] w-[78%] object-contain" /></span>
          <span className="text-[17px] font-semibold">NordInvest{broker ? <span className="font-normal text-slate-500"> for mæglere</span> : buyer ? <span className="font-normal text-slate-500"> for boligkøbere</span> : null}</span>
        </div>
        {match ? (
          <>
            <h1 className="mt-7 text-[26px] font-semibold leading-tight tracking-[-0.02em]">{login ? "Log ind på NordInvest" : first ? `Velkommen, ${first}` : "Velkommen til NordInvest"}</h1>
            <p className="mt-3 text-[16px] leading-relaxed text-slate-600">
              {login
                ? "Tryk på knappen for at logge ind. Bagefter kan du vælge en ny adgangskode under Konto."
                : broker
                  ? "Din adgang til mæglerværktøjet er klar. Tryk på knappen for at logge ind første gang."
                  : buyer
                  ? "Dit boligkort er klar. Tryk på knappen for at logge ind første gang. Du vælger selv en adgangskode bagefter."
                  : "Din konto er klar. Tryk på knappen for at logge ind første gang. Du vælger selv en adgangskode."}
            </p>
            {searchParams.fejl && <p role="alert" className="mt-4 rounded-lg bg-rose-50 px-3 py-2 text-[14px] font-medium text-rose-700">Det lykkedes ikke at logge ind. Prøv igen om et øjeblik.</p>}
            <form action="/api/invitation" method="post" className="mt-7">
              <input type="hidden" name="code" value={params.code} />
              <button type="submit" className="inline-flex min-h-[48px] w-full items-center justify-center rounded-lg bg-blue-600 px-5 text-[16px] font-semibold text-white hover:bg-blue-500">{login ? "Log ind" : broker ? "Åbn mæglerværktøjet" : buyer ? "Åbn boligkortet" : "Åbn NordInvest"}</button>
            </form>
          </>
        ) : (
          <>
            <h1 className="mt-7 text-[26px] font-semibold leading-tight tracking-[-0.02em]">Linket virker ikke længere</h1>
            <p className="mt-3 text-[16px] leading-relaxed text-slate-600">Har du allerede en konto, kan du logge ind med din adgangskode eller få et nyt login-link på mail.</p>
            <Link href="/auth/login" className="mt-7 inline-flex min-h-[48px] w-full items-center justify-center rounded-lg bg-blue-600 px-5 text-[16px] font-semibold text-white hover:bg-blue-500">Gå til log ind</Link>
            <p className="mt-4 text-[14px] text-slate-500">Mangler du adgang, så skriv til <a href="mailto:contact@nordinvest.io" className="font-medium text-blue-700">contact@nordinvest.io</a>.</p>
          </>
        )}
      </div>
    </main>
  );
}
