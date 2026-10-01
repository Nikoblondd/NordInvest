"use client";

import { useEffect, useState } from "react";
import { Mail } from "lucide-react";
import { loadSupabase } from "@/lib/supabase/lazy";
import { DEALS_OPTIN_TEXT, optInMetadata } from "@/lib/deals-optin";
import { captureEvent } from "@/lib/analytics-events";

/** The signed-in user's switch for the monthly deals email. */
export function DealsOptIn({ compact }: { compact?: boolean }) {
  const [on, setOn] = useState<boolean | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadSupabase().then((s) => s?.auth.getUser().then(({ data: { user } }) => setOn(user?.user_metadata?.deals_optin === true)));
  }, []);

  const toggle = async (next: boolean) => {
    const s = await loadSupabase();
    if (!s) return;
    setSaving(true);
    const { error } = await s.auth.updateUser({ data: optInMetadata(next) });
    setSaving(false);
    if (!error) {
      setOn(next);
      captureEvent(next ? "deals_optin" : "deals_optout", { from: compact ? "velkommen" : "dashboard" });
    }
  };

  if (on === null) return null;
  return (
    <label className={compact ? "flex items-start gap-3 text-[14px] leading-snug text-slate-600" : "flex items-start gap-4 rounded-2xl border border-slate-200 bg-white p-5"}>
      <input
        type="checkbox"
        checked={on}
        disabled={saving}
        onChange={(e) => toggle(e.target.checked)}
        className="mt-1 h-5 w-5 shrink-0 accent-blue-600"
      />
      <span>
        {!compact && (
          <span className="flex items-center gap-2 font-semibold text-slate-900">
            <Mail aria-hidden size={16} className="text-blue-600" /> Månedens deals på mail
          </span>
        )}
        <span className={compact ? "" : "mt-1 block text-[14px] leading-snug text-slate-600"}>{DEALS_OPTIN_TEXT}</span>
      </span>
    </label>
  );
}
