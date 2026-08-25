"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowRight, Menu, X } from "lucide-react";
import { Logo } from "./Logo";

const links = [
  { href: "/analyseren", label: "Analyseren" },
  { href: "/#hvordan", label: "Sådan virker det" },
  { href: "/priser", label: "Priser" },
  { href: "/vaerktoejer", label: "Værktøjer" },
  { href: "/blog", label: "Blog" },
];

export function Nav() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-slate-200/60 bg-slate-50/80 backdrop-blur-lg">
      <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <Logo />

        <div className="hidden items-center gap-8 text-sm font-medium text-slate-600 md:flex">
          {links.map((l) => (
            <Link key={l.href} href={l.href} className="transition-colors hover:text-blue-600">
              {l.label}
            </Link>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/auth/login"
            className="hidden text-sm font-medium text-slate-600 transition-colors hover:text-slate-900 md:block"
          >
            Log ind
          </Link>
          <Link
            href="/auth/signup"
            className="flex items-center gap-2 rounded-full bg-slate-900 px-4 py-2 text-sm font-medium text-white transition-all hover:bg-slate-800"
          >
            Start gratis <ArrowRight size={16} />
          </Link>
          <button
            aria-label="Menu"
            className="text-slate-700 md:hidden"
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </nav>

      {open && (
        <div className="border-t border-slate-200 bg-slate-50 px-6 py-5 md:hidden">
          <div className="flex flex-col gap-4">
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="text-base font-medium text-slate-700"
                onClick={() => setOpen(false)}
              >
                {l.label}
              </Link>
            ))}
            <Link
              href="/auth/login"
              className="text-base font-medium text-slate-700"
              onClick={() => setOpen(false)}
            >
              Log ind
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
