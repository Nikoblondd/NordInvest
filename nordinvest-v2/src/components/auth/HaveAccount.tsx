"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { clsx } from "@/lib/clsx";

/*
 * "Har du en konto? Log ind" next to every "Anmod om adgang": members who are
 * logged out get back to the page they were on after signing in.
 */
export function HaveAccount({ dark, className }: { dark?: boolean; className?: string }) {
  const path = usePathname() ?? "/";
  const qs = useSearchParams()?.toString();
  const here = path.startsWith("/adgang") || path === "/" ? "/app" : `${path}${qs ? `?${qs}` : ""}`;
  return (
    <p className={clsx("text-[15px]", dark ? "text-white/70" : "text-slate-600", className)}>
      Har du allerede en konto?{" "}
      <Link href={`/auth/login?next=${encodeURIComponent(here)}`} prefetch={false} className={clsx("font-semibold underline underline-offset-2", dark ? "text-white hover:text-blue-200" : "text-blue-700 hover:text-blue-600")}>Log ind</Link>
    </p>
  );
}
