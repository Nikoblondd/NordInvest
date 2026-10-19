"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Logo } from "@/components/Logo";
import { hasAuthCookie } from "@/lib/supabase/lazy";

/*
 * Hallmark N9 · edge-aligned minimal (design.md): wordmark hard left, sign-in
 * and the one action hard right, nothing between. Not sticky; the page reads
 * like a document. Every other destination lives in the colophon index.
 */
export function LandingNav() {
  const [member, setMember] = useState(false);
  useEffect(() => setMember(hasAuthCookie()), []);

  return (
    <header className="border-b border-[var(--color-rule)] bg-[var(--color-paper)]">
      <nav aria-label="Hovedmenu" className="mx-auto flex h-16 max-w-[1120px] items-center justify-between gap-4 px-4 sm:px-8">
        <Logo />
        <div className="flex items-center gap-2 sm:gap-5">
          <Link href={member ? "/app" : "/auth/login"} prefetch={false} className="hidden min-h-[44px] items-center whitespace-nowrap px-1 text-[15px] font-medium sm:inline-flex text-[var(--color-ink-2)] underline-offset-4 hover:text-[var(--color-ink)] hover:underline">{member ? "Åbn NordInvest" : "Log ind"}</Link>
          <Link href="/adgang" className="inline-flex min-h-[40px] items-center whitespace-nowrap rounded-lg bg-[var(--color-ink)] px-3.5 text-[14px] font-semibold text-white transition-colors hover:bg-[var(--color-ink-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] focus-visible:ring-offset-2 sm:px-4 sm:text-[15px]">Anmod om adgang</Link>
        </div>
      </nav>
    </header>
  );
}
