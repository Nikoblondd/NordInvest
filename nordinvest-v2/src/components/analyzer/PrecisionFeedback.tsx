"use client";

import { useState } from "react";
import { Star, Check } from "lucide-react";
import { loadSupabase } from "@/lib/supabase/lazy";

// 1–5 star rating on how accurate the analysis felt. Every rating feeds the
// model's quality signal. Requires login (so it's attributable, spam-resistant).
export function PrecisionFeedback({
  region,
  strategy,
  onSaved,
}: {
  region: string | null;
  strategy: string;
  onSaved?: () => void;
}) {
  const [hover, setHover] = useState(0);
  const [rating, setRating] = useState(0);
  const [state, setState] = useState<"idle" | "saving" | "done" | "login">("idle");

  const submit = async (value: number) => {
    setRating(value);
    setState("saving");
    const supabase = await loadSupabase();
    if (!supabase) return setState("login");
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return setState("login");
    const { error } = await supabase.from("analysis_feedback").insert({
      user_id: user.id,
      rating: value,
      region: region ?? null,
      property_type: strategy,
    });
    if (error) setState("idle");
    else {
      setState("done");
      onSaved?.();
    }
  };

  if (state === "done") {
    return (
      <div className="flex items-center gap-2 text-sm font-medium text-emerald-700">
        <Check size={16} /> Tak! Din vurdering gør modellen skarpere.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <div className="text-sm text-slate-600">
        Hvor præcis føltes denne analyse? <span className="text-slate-400">Din feedback træner hjernen.</span>
      </div>
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            onMouseEnter={() => setHover(n)}
            onMouseLeave={() => setHover(0)}
            onClick={() => submit(n)}
            disabled={state === "saving"}
            aria-label={`${n} stjerner`}
            className="p-0.5 transition-transform hover:scale-110"
          >
            <Star
              size={22}
              className={(hover || rating) >= n ? "fill-amber-400 text-amber-400" : "text-slate-300"}
            />
          </button>
        ))}
        {state === "login" && (
          <a href="/auth/signup" className="ml-2 text-xs font-semibold text-blue-600 underline">
            Log ind for at bidrage
          </a>
        )}
      </div>
    </div>
  );
}
