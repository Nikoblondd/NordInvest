"use client";

import { useEffect, useState } from "react";
import { hasAuthCookie } from "@/lib/supabase/lazy";
import { limits } from "@/lib/pricing";

/*
 * What the current visitor may do, as the client needs it for upgrade
 * prompts: signed in or not, on a paid plan or not, and this month's usage.
 * Anyone above the free limit (a paid tier or an admin) counts as paid.
 */
export type Plan = {
  loaded: boolean;
  authenticated: boolean;
  paid: boolean;
  used: number;
  max: number;
  unlimited: boolean;
};

export const FREE_LIMIT = limits.free;
const ANON: Plan = { loaded: true, authenticated: false, paid: false, used: 0, max: FREE_LIMIT, unlimited: false };

let pending: Promise<Plan> | null = null;

export function fetchPlan(fresh = false): Promise<Plan> {
  if (typeof window === "undefined" || !hasAuthCookie()) return Promise.resolve(ANON);
  if (!pending || fresh) {
    pending = fetch("/api/usage", { cache: "no-store" })
      .then((r) => r.json())
      .then((d): Plan =>
        d?.authenticated
          ? { loaded: true, authenticated: true, paid: !!d.unlimited || Number(d.max) > FREE_LIMIT, used: Number(d.used) || 0, max: Number(d.max) || FREE_LIMIT, unlimited: !!d.unlimited }
          : ANON,
      )
      .catch(() => ANON);
  }
  return pending;
}

export function usePlan(): Plan {
  const [plan, setPlan] = useState<Plan>({ ...ANON, loaded: false });
  useEffect(() => {
    let live = true;
    fetchPlan().then((p) => live && setPlan(p));
    return () => { live = false; };
  }, []);
  return plan;
}

/*
 * Analyses without an account. Three are free, with no prompts to pay or sign
 * up while they are used, so the product proves itself first; the fourth asks
 * for a free account (which comes with 3 a month). Counted per
 * distinct property on this device; a soft wall, not a security boundary.
 */
export const ANON_FREE = 3;
const ANON_KEY = "ni_anon_analyses";

export function countAnonAnalysis(sig: string): number {
  try {
    const seen: string[] = JSON.parse(localStorage.getItem(ANON_KEY) || "[]");
    if (!seen.includes(sig)) {
      seen.push(sig);
      localStorage.setItem(ANON_KEY, JSON.stringify(seen.slice(-50)));
    }
    return seen.indexOf(sig) + 1; // this property's position: re-opening an early one stays free
  } catch {
    return 1;
  }
}
