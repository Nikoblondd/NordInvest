"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { Logo } from "@/components/Logo";
import { hasAuthCookie } from "@/lib/supabase/lazy";

/* Top bar for the public pages: real pages only, no in-page jumps. */
const LINKS = [
  { href: "/funktioner", label: "Funktioner" },
  { href: "/spil", label: "Ejendomsspillet" },
  { href: "/deals", label: "Bedste boliger" },
  { href: "/blog", label: "Viden" },
  { href: "/om", label: "Om os" },
];

export function LandingNav() {
  const [open, setOpen] = useState(false);
  const [member, setMember] = useState(false);
  useEffect(() => setMember(hasAuthCookie()), []);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = ""; };
  }, [open]);

  return (
    <>
    <header className="sticky top-0 z-50 border-b border-[#e4e0d8] bg-[#f6f4ef]/95 backdrop-blur">
      <nav aria-label="Hovedmenu" className="mx-auto flex h-16 max-w-[1320px] items-center justify-between gap-4 px-4 sm:px-8">
        <Logo />
        <div className="hidden items-center gap-8 text-[15px] font-medium text-slate-600 lg:flex">
          {LINKS.map((l) => <Link key={l.href} href={l.href} className="rounded transition-colors hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300">{l.label}</Link>)}
        </div>
        <div className="flex items-center gap-1 sm:gap-3">
          <Link href={member ? "/app" : "/auth/login"} prefetch={false} className="hidden min-h-[40px] items-center whitespace-nowrap px-2 text-[15px] font-medium text-slate-700 hover:text-slate-900 sm:inline-flex">{member ? "Åbn NordInvest" : "Log ind"}</Link>
          <Link href="/adgang" className="inline-flex min-h-[40px] items-center whitespace-nowrap rounded-lg bg-blue-600 px-3.5 text-[14px] font-semibold text-white transition-colors hover:bg-blue-500 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-200 sm:px-4 sm:text-[15px]">Anmod om adgang</Link>
          <button type="button" aria-label={open ? "Luk menu" : "Åbn menu"} aria-expanded={open} onClick={() => setOpen((v) => !v)} className="-mr-2 flex h-11 w-11 items-center justify-center text-slate-700 lg:hidden">
            {open ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </nav>
    </header>
      {open && (
        <div className="fixed inset-x-0 bottom-0 top-16 z-[60] overflow-y-auto bg-white px-4 pb-8 pt-2 lg:hidden">
          <ul className="divide-y divide-slate-100">
            {LINKS.map((l) => <li key={l.href}><Link href={l.href} onClick={() => setOpen(false)} className="flex min-h-[56px] items-center text-[18px] font-medium text-slate-900">{l.label}</Link></li>)}
            <li><Link href={member ? "/app" : "/auth/login"} prefetch={false} onClick={() => setOpen(false)} className="flex min-h-[56px] items-center text-[18px] font-medium text-slate-900">{member ? "Åbn NordInvest" : "Log ind"}</Link></li>
          </ul>
          <Link href="/adgang" onClick={() => setOpen(false)} className="mt-6 flex min-h-[52px] items-center justify-center rounded-lg bg-blue-600 text-[16px] font-semibold text-white">Anmod om adgang</Link>
          <Link href="/kontakt" onClick={() => setOpen(false)} className="mt-3 flex min-h-[52px] items-center justify-center rounded-lg border border-slate-300 text-[16px] font-semibold text-slate-900">Kontakt</Link>
        </div>
      )}
    </>
  );
}
