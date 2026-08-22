"use client";

import Link from "next/link";
import { useState } from "react";
import { Button } from "./ui/Button";
import { clsx } from "@/lib/clsx";

const links = [
  { href: "/analyseren", label: "Analyseren" },
  { href: "/priser", label: "Priser" },
  { href: "/vaerktoejer", label: "Værktøjer" },
  { href: "/blog", label: "Blog" },
  { href: "/om", label: "Om" },
];

export function Nav({ theme = "light" }: { theme?: "light" | "dark" }) {
  const [open, setOpen] = useState(false);
  const onDark = theme === "dark";
  const text = onDark ? "text-cream-100" : "text-stone-900";
  const muted = onDark ? "text-cream-100/70" : "text-stone-600";

  return (
    <header
      className={clsx(
        "absolute inset-x-0 top-0 z-50",
        onDark ? "text-cream-100" : "text-stone-900",
      )}
    >
      <nav className="container-x flex h-20 items-center justify-between">
        <Link
          href="/"
          className={clsx("font-serif text-xl tracking-tight", text)}
        >
          NordInvest
        </Link>

        <div className="hidden items-center gap-8 md:flex">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={clsx(
                "text-sm transition-colors hover:opacity-70",
                muted,
              )}
            >
              {l.label}
            </Link>
          ))}
          <Button href="/auth/login" variant="secondary" size="md">
            Log ind
          </Button>
          <Button href="/auth/signup" size="md">
            Prøv gratis
          </Button>
        </div>

        <button
          aria-label="Menu"
          className={clsx("md:hidden", text)}
          onClick={() => setOpen((v) => !v)}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            {open ? (
              <path
                d="M6 6l12 12M18 6L6 18"
                stroke="currentColor"
                strokeWidth="1.6"
              />
            ) : (
              <path
                d="M4 7h16M4 12h16M4 17h16"
                stroke="currentColor"
                strokeWidth="1.6"
              />
            )}
          </svg>
        </button>
      </nav>

      {open && (
        <div className="border-t border-stone-200/20 bg-navy-900 px-6 py-6 md:hidden">
          <div className="flex flex-col gap-4">
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="text-cream-100 text-lg"
                onClick={() => setOpen(false)}
              >
                {l.label}
              </Link>
            ))}
            <div className="mt-2 flex flex-col gap-3">
              <Button href="/auth/login" variant="secondary" className="text-cream-100">
                Log ind
              </Button>
              <Button href="/auth/signup">Prøv gratis</Button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
