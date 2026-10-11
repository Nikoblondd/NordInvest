"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ArrowRight, Menu, X, Settings, ChevronDown, LogOut, User } from "lucide-react";
import { Logo } from "./Logo";
import { hasAuthCookie, loadSupabase } from "@/lib/supabase/lazy";
import { LangToggle } from "./i18n/LangToggle";

const links = [
  { href: "/analyseren", label: "Analyseren" },
  { href: "/deals", label: "Deal-motor" },
  { href: "/spil", label: "Spil" },
  { href: "/priser", label: "Priser" },
  { href: "/blog", label: "Blog" },
];

export function Nav() {
  const [open, setOpen] = useState(false);
  const [authed, setAuthed] = useState(false);
  const [name, setName] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    // No session cookie means not logged in: skip loading Supabase entirely.
    if (!hasAuthCookie()) return;
    let alive = true;
    let unsub: (() => void) | undefined;
    (async () => {
      const supabase = await loadSupabase();
      if (!supabase || !alive) return;
      const loadName = async (userId: string) => {
        const { data } = await supabase.from("profiles").select("full_name").eq("id", userId).single();
        setName((data?.full_name as string) ?? null);
      };
      supabase.auth.getUser().then(({ data }) => {
        setAuthed(!!data.user);
        if (data.user) loadName(data.user.id);
      });
      const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
        setAuthed(!!session);
        if (session?.user) loadName(session.user.id);
        else setName(null);
      });
      unsub = () => sub.subscription.unsubscribe();
    })();
    return () => {
      alive = false;
      unsub?.();
    };
  }, []);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const firstName = name?.split(" ")[0];

  return (
    <header className="sticky top-0 z-50 w-full border-b border-slate-200/60 bg-slate-50/80 backdrop-blur-lg">
      <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
        <div translate="no" data-no-i18n className="shrink-0 max-[379px]:[&_.text-xl]:text-[18px]">
          <Logo />
        </div>

        <div className="hidden items-center gap-4 text-sm font-medium text-slate-600 md:flex lg:gap-8">
          {authed && (
            <Link href="/dashboard" className="whitespace-nowrap font-semibold text-slate-900 transition-colors hover:text-blue-600">
              Mine ejendomme
            </Link>
          )}
          {links.map((l) => (
            <Link key={l.href} href={l.href} className={authed && (l.href === "/spil" || l.href === "/blog") ? "hidden whitespace-nowrap transition-colors hover:text-blue-600 lg:inline" : "whitespace-nowrap transition-colors hover:text-blue-600"}>
              {l.label}
            </Link>
          ))}
        </div>

        <div className="flex min-w-0 items-center gap-1.5 sm:gap-3">
          <LangToggle />
          {authed ? (
            <div ref={menuRef} className="relative">
              <button
                onClick={() => setMenuOpen((v) => !v)}
                className="flex items-center gap-2 rounded-full bg-slate-900 py-1.5 pl-1.5 pr-3 text-sm font-medium text-white transition-all hover:bg-slate-800"
              >
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-600 text-xs font-bold uppercase">
                  {firstName ? firstName[0] : <User size={14} />}
                </span>
                <span className="hidden max-w-[8rem] truncate sm:inline md:hidden xl:inline">{firstName ?? "Min konto"}</span>
                <ChevronDown size={15} className={menuOpen ? "rotate-180 transition-transform" : "transition-transform"} />
              </button>
              {menuOpen && (
                <div className="absolute right-0 top-full mt-2 w-52 overflow-hidden rounded-2xl border border-slate-200 bg-white py-1 shadow-xl shadow-slate-900/10">
                  {name && (
                    <div className="border-b border-slate-100 px-4 py-2.5">
                      <div className="text-xs text-slate-400">Logget ind som</div>
                      <div className="truncate text-sm font-semibold text-slate-900">{name}</div>
                    </div>
                  )}
                  <Link
                    href="/konto"
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50"
                  >
                    <Settings size={16} className="text-slate-400" /> Konto og abonnement
                  </Link>
                  <form action="/auth/signout" method="post">
                    <button
                      type="submit"
                      className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm text-rose-600 hover:bg-rose-50"
                    >
                      <LogOut size={16} /> Log ud
                    </button>
                  </form>
                </div>
              )}
            </div>
          ) : (
            <>
              <Link
                href="/auth/login"
                prefetch={false}
                className="hidden text-sm font-medium text-slate-600 transition-colors hover:text-slate-900 md:block"
              >
                Log ind
              </Link>
              <Link
                href="/auth/signup"
                prefetch={false}
                className="flex items-center gap-2 whitespace-nowrap rounded-full bg-slate-900 px-3.5 py-2 text-sm font-medium text-white transition-all hover:bg-slate-800 max-[379px]:px-3 max-[379px]:text-[13px] sm:px-4"
              >
                Start gratis <ArrowRight size={16} className="hidden min-[400px]:block" />
              </Link>
            </>
          )}
          <button
            aria-label="Menu"
            className="-mr-1 p-1 text-slate-700 md:hidden"
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </nav>

      {open && (
        <div className="border-t border-slate-200 bg-slate-50 px-4 py-5 sm:px-6 md:hidden">
          <div className="flex flex-col gap-4">
            {authed && (
              <Link href="/dashboard" className="text-base font-semibold text-slate-900" onClick={() => setOpen(false)}>
                Mine ejendomme
              </Link>
            )}
            {links.map((l) => (
              <Link key={l.href} href={l.href} className="text-base font-medium text-slate-700" onClick={() => setOpen(false)}>
                {l.label}
              </Link>
            ))}
            {!authed && (
              <Link href="/auth/login" className="text-base font-medium text-slate-700" onClick={() => setOpen(false)}>
                Log ind
              </Link>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
