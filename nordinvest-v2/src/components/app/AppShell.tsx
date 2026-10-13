"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Building2, CalendarDays, Calculator, ChevronDown, CircleHelp, Home, KeyRound, LayoutGrid, LogOut, Phone, Plus, Rocket, Search, Settings, BarChart3, Users, X } from "lucide-react";
import { clsx } from "@/lib/clsx";
import { site } from "@/lib/site";
import { Tour, startTour } from "./Tour";

/*
 * The NordInvest workspace frame: a dark rail with the five places of the
 * product, a top bar with one field that both adds a property (paste a link)
 * and finds your own, and a tab bar on phones. Every page under /app sits in it.
 */

export type ShellUser = { name: string; email: string; admin: boolean; tour: string | null };
export type ShellProperty = { id: string; address: string };

export const NAV = [
  { href: "/app", label: "Overblik", Icon: LayoutGrid, tour: "nav-overblik", exact: true },
  { href: "/app/ejendomme", label: "Ejendomme", Icon: Building2, tour: "nav-ejendomme" },
  { href: "/app/kalender", label: "Kalender", Icon: CalendarDays, tour: "nav-kalender" },
  { href: "/app/find", label: "Find boliger", short: "Find", Icon: Search, tour: "nav-find" },
  { href: "/app/analyser", label: "Analysér", Icon: Calculator, tour: "nav-analyser" },
];

const ADMIN = [
  { href: "/app/admin/medlemmer", label: "Medlemmer", Icon: Users },
  { href: "/app/admin/adgang", label: "Anmodninger", Icon: KeyRound },
  { href: "/dashboard/launch", label: "Launch", Icon: Rocket },
  { href: "/dashboard/analytics", label: "Analytics", Icon: BarChart3 },
];

const initials = (n: string, e: string) => (n.trim() ? n.trim().split(/\s+/).map((p) => p[0]).slice(0, 2).join("") : e[0] ?? "N").toUpperCase();

export function AppShell({ user, props, counts, children }: { user: ShellUser; props: ShellProperty[]; counts: { properties: number; today: number; fresh: number }; children: React.ReactNode }) {
  const path = usePathname();
  const active = (href: string, exact?: boolean) => (exact ? path === href : path === href || path.startsWith(`${href}/`));
  const count = (href: string) => (href === "/app/ejendomme" ? counts.properties : href === "/app/kalender" ? counts.today : href === "/app/find" ? counts.fresh : 0);

  return (
    <div className="flex min-h-[100dvh]">
      {/* Rail (desktop) */}
      <aside data-tour="nav" className="sticky top-0 hidden h-[100dvh] w-[248px] shrink-0 flex-col bg-[#0b1b33] px-3 pb-4 pt-5 text-white lg:flex">
        <Link href="/app" className="flex items-center gap-2.5 px-2">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-white ring-1 ring-slate-200/60"><Image src="/nordinvest-logo.png" alt="" width={40} height={40} className="h-[78%] w-[78%] object-contain" /></span>
          <span className="text-[17px] font-semibold tracking-[-0.01em]">NordInvest</span>
        </Link>
        <Link href="/app/analyser" data-tour="add" className="mt-6 flex h-10 items-center justify-center gap-2 rounded-lg bg-blue-600 text-[14px] font-semibold transition-colors hover:bg-blue-500">
          <Plus size={16} /> Tilføj bolig
        </Link>
        <nav aria-label="Hovedmenu" className="mt-5 space-y-0.5">
          {NAV.map(({ href, label, Icon, tour, exact }) => {
            const on = active(href, exact);
            const n = count(href);
            return (
              <Link key={href} href={href} data-tour={tour} aria-current={on ? "page" : undefined}
                className={clsx("flex h-10 items-center gap-3 rounded-lg px-3 text-[14px] font-medium transition-colors", on ? "bg-white/[0.12] text-white" : "text-white/65 hover:bg-white/[0.06] hover:text-white")}>
                <Icon size={17} className={on ? "text-blue-300" : ""} />
                <span className="flex-1">{label}</span>
                {n > 0 && <span className={clsx("rounded-full px-1.5 text-[12px] font-semibold tabular-nums", href === "/app/find" ? "bg-blue-500 text-white" : "bg-white/10 text-white/70")}>{n}</span>}
              </Link>
            );
          })}
        </nav>
        {user.admin && (
          <div className="mt-6">
            <p className="px-3 text-[12px] font-semibold text-white/40">Administration</p>
            <div className="mt-1.5 space-y-0.5">
              {ADMIN.map(({ href, label, Icon }) => (
                <Link key={href} href={href} className={clsx("flex h-9 items-center gap-3 rounded-lg px-3 text-[14px] transition-colors", active(href) ? "bg-white/[0.12] text-white" : "text-white/55 hover:bg-white/[0.06] hover:text-white")}><Icon size={16} />{label}</Link>
              ))}
            </div>
          </div>
        )}
        <div className="mt-auto space-y-0.5" data-tour="help">
          <button type="button" onClick={startTour} className="flex h-9 w-full items-center gap-3 rounded-lg px-3 text-left text-[14px] text-white/65 hover:bg-white/[0.06] hover:text-white"><CircleHelp size={16} /> Vis guiden igen</button>
          <a href={site.phoneHref} className="flex h-9 items-center gap-3 rounded-lg px-3 text-[14px] text-white/65 hover:bg-white/[0.06] hover:text-white"><Phone size={16} /> Ring til Nikolaj</a>
          <Link href="/app/konto" className={clsx("flex h-9 items-center gap-3 rounded-lg px-3 text-[14px] hover:bg-white/[0.06] hover:text-white", active("/app/konto") ? "bg-white/[0.12] text-white" : "text-white/65")}><Settings size={16} /> Konto</Link>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar user={user} props={props} />
        <main id="indhold" className="min-w-0 flex-1 pb-24 lg:pb-10">{children}</main>
      </div>

      {/* Tab bar (phones) */}
      <nav aria-label="Hovedmenu" data-tour="nav" className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-slate-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden">
        {NAV.map(({ href, label, short, Icon, tour, exact }) => {
          const on = active(href, exact);
          return (
            <Link key={href} href={href} data-tour={tour} aria-current={on ? "page" : undefined}
              className={clsx("flex min-h-[58px] flex-col items-center justify-center gap-0.5 text-[11px] font-semibold", on ? "text-blue-700" : "text-slate-500")}>
              <span className="relative"><Icon size={21} strokeWidth={on ? 2.2 : 1.8} />{href === "/app/find" && counts.fresh > 0 && <span className="absolute -right-1.5 -top-1 h-2.5 w-2.5 rounded-full bg-blue-600 ring-2 ring-white" aria-label={`${counts.fresh} nye boliger`} />}</span>{short ?? label}
            </Link>
          );
        })}
      </nav>

      <Tour name={user.name.split(" ")[0]} initial={user.tour} />
    </div>
  );
}

function TopBar({ user, props }: { user: ShellUser; props: ShellProperty[] }) {
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-slate-200 bg-white/90 px-4 backdrop-blur sm:px-6 lg:px-8">
      <Link href="/app" className="flex items-center lg:hidden" aria-label="Overblik">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-white ring-1 ring-slate-200/60"><Image src="/nordinvest-logo.png" alt="" width={40} height={40} className="h-[78%] w-[78%] object-contain" /></span>
      </Link>
      <QuickFind props={props} />
      <Link href="/app/analyser" data-tour="add" className="hidden h-10 items-center gap-1.5 rounded-lg bg-blue-600 px-3.5 text-[14px] font-semibold text-white hover:bg-blue-500 sm:flex lg:hidden"><Plus size={16} /> Tilføj</Link>
      <UserMenu user={user} />
    </header>
  );
}

/** One field: paste a listing link to analyse it, or type to find one of your own properties. */
function QuickFind({ props }: { props: ShellProperty[] }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [hi, setHi] = useState(0);
  const box = useRef<HTMLDivElement>(null);
  const isLink = /^https?:\/\/\S+\.\S+/i.test(q.trim());
  const matches = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t || isLink) return [];
    return props.filter((p) => p.address.toLowerCase().includes(t)).slice(0, 6);
  }, [q, props, isLink]);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => { if (box.current && !box.current.contains(e.target as Node)) setOpen(false); };
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") { e.preventDefault(); box.current?.querySelector("input")?.focus(); }
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("mousedown", onDoc); document.removeEventListener("keydown", onKey); };
  }, []);

  const go = (href: string) => { setOpen(false); setQ(""); router.push(href); };
  const submit = () => {
    if (isLink) return go(`/app/analyser?url=${encodeURIComponent(q.trim())}`);
    if (matches[hi]) return go(`/app/ejendomme/${matches[hi].id}`);
  };

  return (
    <div ref={box} data-tour="quickfind" className="relative min-w-0 flex-1 sm:max-w-[520px]">
      <label htmlFor="quickfind" className="sr-only">Indsæt et boliglink eller søg i dine ejendomme</label>
      <div className="flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 focus-within:border-blue-500 focus-within:bg-white focus-within:ring-2 focus-within:ring-blue-100">
        <Search size={16} className="shrink-0 text-slate-400" />
        <input id="quickfind" value={q} onChange={(e) => { setQ(e.target.value); setOpen(true); setHi(0); }} onFocus={() => setOpen(true)}
          onKeyDown={(e) => {
            if (e.key === "Enter") { e.preventDefault(); submit(); }
            if (e.key === "ArrowDown") { e.preventDefault(); setHi((h) => Math.min(h + 1, Math.max(0, matches.length - 1))); }
            if (e.key === "ArrowUp") { e.preventDefault(); setHi((h) => Math.max(0, h - 1)); }
            if (e.key === "Escape") setOpen(false);
          }}
          placeholder="Indsæt et boliglink eller søg i dine ejendomme" autoComplete="off"
          className="min-w-0 flex-1 bg-transparent text-[15px] text-slate-900 outline-none placeholder:text-slate-400" />
        {q ? <button type="button" aria-label="Ryd" onClick={() => setQ("")} className="text-slate-400 hover:text-slate-600"><X size={15} /></button>
          : <kbd className="hidden rounded border border-slate-200 bg-white px-1.5 text-[11px] font-medium text-slate-400 md:block">⌘K</kbd>}
      </div>
      {open && q.trim() && (
        <div className="absolute inset-x-0 top-12 z-40 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl shadow-slate-900/10">
          {isLink ? (
            <button type="button" onClick={submit} className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-slate-50">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-blue-700"><Calculator size={17} /></span>
              <span className="min-w-0"><span className="block text-[14px] font-semibold text-slate-900">Analysér boligen</span><span className="block truncate text-[13px] text-slate-500">{q.trim()}</span></span>
            </button>
          ) : matches.length ? (
            <ul role="listbox" aria-label="Dine ejendomme">
              {matches.map((p, i) => (
                <li key={p.id} role="option" aria-selected={i === hi}>
                  <button type="button" onMouseEnter={() => setHi(i)} onClick={() => go(`/app/ejendomme/${p.id}`)} className={clsx("flex w-full items-center gap-3 px-4 py-2.5 text-left", i === hi && "bg-slate-50")}>
                    <Home size={16} className="shrink-0 text-slate-400" /><span className="truncate text-[14px] text-slate-900">{p.address}</span>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="px-4 py-3 text-[14px] text-slate-500">Ingen af dine ejendomme matcher. Indsæt et link fra Boligsiden, Home eller EDC for at analysere en ny.</p>
          )}
        </div>
      )}
    </div>
  );
}

function UserMenu({ user }: { user: ShellUser }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const onDoc = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);
  return (
    <div ref={ref} className="relative">
      <button type="button" data-tour="help" aria-expanded={open} aria-label="Konto" onClick={() => setOpen((v) => !v)} className="flex h-10 items-center gap-1.5 rounded-full pl-0.5 pr-1.5 hover:bg-slate-100">
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-600 text-[13px] font-semibold text-white">{initials(user.name, user.email)}</span>
        <ChevronDown size={15} className="hidden text-slate-500 sm:block" />
      </button>
      {open && (
        <div className="absolute right-0 top-12 z-40 w-64 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-xl shadow-slate-900/10">
          <div className="border-b border-slate-100 px-4 py-3">
            <p className="truncate text-[14px] font-semibold text-slate-900">{user.name || "Din konto"}</p>
            <p className="truncate text-[13px] text-slate-500">{user.email}</p>
          </div>
          <Link href="/app/konto" onClick={() => setOpen(false)} className="flex min-h-[44px] items-center gap-2.5 px-4 text-[14px] text-slate-700 hover:bg-slate-50"><Settings size={16} className="text-slate-400" /> Konto og indstillinger</Link>
          <button type="button" onClick={() => { setOpen(false); startTour(); }} className="flex min-h-[44px] w-full items-center gap-2.5 px-4 text-left text-[14px] text-slate-700 hover:bg-slate-50"><CircleHelp size={16} className="text-slate-400" /> Vis guiden igen</button>
          <a href={site.phoneHref} className="flex min-h-[44px] items-center gap-2.5 px-4 text-[14px] text-slate-700 hover:bg-slate-50"><Phone size={16} className="text-slate-400" /> Ring til Nikolaj</a>
          {user.admin && <Link href="/app/admin/medlemmer" onClick={() => setOpen(false)} className="flex min-h-[44px] items-center gap-2.5 px-4 text-[14px] text-slate-700 hover:bg-slate-50 lg:hidden"><Users size={16} className="text-slate-400" /> Medlemmer (admin)</Link>}
          {user.admin && <Link href="/app/admin/adgang" onClick={() => setOpen(false)} className="flex min-h-[44px] items-center gap-2.5 px-4 text-[14px] text-slate-700 hover:bg-slate-50 lg:hidden"><KeyRound size={16} className="text-slate-400" /> Anmodninger (admin)</Link>}
          <form action="/auth/signout" method="post" className="border-t border-slate-100">
            <button type="submit" className="flex min-h-[44px] w-full items-center gap-2.5 px-4 text-left text-[14px] text-rose-600 hover:bg-rose-50"><LogOut size={16} /> Log ud</button>
          </form>
        </div>
      )}
    </div>
  );
}
