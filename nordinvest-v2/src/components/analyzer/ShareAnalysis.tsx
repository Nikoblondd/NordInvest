"use client";

import { useState } from "react";
import { Check, Share2 } from "lucide-react";
import { captureEvent } from "@/lib/analytics-events";

/**
 * "Del analysen": a link that opens the same property with the numbers the
 * user has now (their rent, rate and down payment), so a partner or the bank
 * sees exactly this analysis. The phone's share sheet where there is one,
 * otherwise the link is copied.
 */
export function ShareAnalysis({ params, title, className }: { params: Record<string, string | number | null | undefined>; title: string; className: string }) {
  const [copied, setCopied] = useState(false);

  const share = async () => {
    const q = new URLSearchParams(window.location.search);
    q.delete("saved");
    for (const [k, v] of Object.entries(params)) {
      if (v === null || v === undefined || v === "") continue;
      q.set(k, String(v));
    }
    const url = `${window.location.origin}/analyseren?${q.toString()}`;
    captureEvent("analysis_shared", { native: typeof navigator.share === "function" });
    if (typeof navigator.share === "function") {
      try {
        await navigator.share({ title, text: `${title} · regnet igennem på NordInvest`, url });
        return;
      } catch {
        /* cancelled: fall through to copy */
      }
    }
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      window.prompt("Kopiér linket", url);
      return;
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2500);
  };

  return (
    <button type="button" onClick={share} className={className}>
      {copied ? <Check aria-hidden size={17} /> : <Share2 aria-hidden size={17} />}
      <span aria-live="polite">{copied ? "Link kopieret" : "Del analysen"}</span>
    </button>
  );
}
