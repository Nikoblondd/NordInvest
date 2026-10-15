"use client";

import { useState } from "react";

/*
 * Eases a page in when it arrives by navigation. The first page of a visit is
 * left alone (it paints at once, which keeps Core Web Vitals clean); every page
 * after it fades in, or fades and rises inside the app.
 */
let navigated = false;

export function PageTransition({ kind, children }: { kind: "page-in" | "page-rise"; children: React.ReactNode }) {
  const [cls] = useState(() => {
    if (typeof window === "undefined") return "";
    const c = navigated ? kind : "";
    navigated = true;
    return c;
  });
  return <div className={cls || undefined}>{children}</div>;
}
