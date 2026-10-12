"use client";

import { useState } from "react";
import Link from "next/link";
import { Search, Trash2, Loader2, ArrowUpRight } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { clsx } from "@/lib/clsx";

export type SavedSearch = {
  id: string;
  label: string | null;
  market: string;
  municipality: string | null;
  type: string | null;
  price_max: number | null;
  min_score: number | null;
  sort: string | null;
  new_count: number | null;
  last_match: { address?: string; price?: number; score?: number } | null;
  last_checked_at: string | null;
};

function href(s: SavedSearch): string {
  const q = new URLSearchParams();
  q.set("market", s.market);
  if (s.municipality) q.set("municipality", s.municipality);
  if (s.type) q.set("type", s.type);
  if (s.price_max) q.set("priceMax", String(s.price_max));
  if (s.sort) q.set("sort", s.sort);
  q.set("run", "1");
  return `/app/find?${q.toString()}`;
}

function Card({ s, onRemove }: { s: SavedSearch; onRemove: (id: string) => void }) {
  const [removing, setRemoving] = useState(false);
  const remove = async () => {
    const supabase = createClient();
    if (!supabase) return;
    setRemoving(true);
    const { error } = await supabase.from("saved_searches").delete().eq("id", s.id);
    if (!error) onRemove(s.id);
    else setRemoving(false);
  };
  const hasNew = (s.new_count ?? 0) > 0;
  const checked = s.last_checked_at
    ? new Date(s.last_checked_at).toLocaleDateString("da-DK", { day: "numeric", month: "short" })
    : "endnu ikke tjekket";

  return (
    <div
      className={clsx(
        "flex min-w-0 flex-col rounded-2xl border bg-white p-4 transition-all duration-300 hover:-translate-y-[1px] hover:shadow-card-lift sm:p-5",
        hasNew ? "border-emerald-300/70 ring-1 ring-emerald-100" : "border-slate-200/80",
      )}
      style={{
        boxShadow:
          "0 1px 2px rgba(15,23,42,0.04), 0 1px 3px rgba(15,23,42,0.05), inset 0 1px 0 rgba(255,255,255,0.9)",
      }}
    >
      <div className="flex items-start justify-between gap-2 min-w-0">
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold text-slate-900">{s.label || "Gemt søgning"}</div>
          <div className="mt-0.5 truncate text-xs text-slate-500">
            {s.market === "investering" ? "Erhvervsejendomme" : "Boliger"} · score ≥ {s.min_score ?? 60} · tjekket {checked}
          </div>
        </div>
        {hasNew && (
          <span className="shrink-0 rounded-md bg-emerald-50 px-1.5 py-0.5 text-xs font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-100">
            {s.new_count} {s.new_count === 1 ? "ny" : "nye"}
          </span>
        )}
      </div>

      {hasNew && s.last_match?.address && (
        <div className="mt-3 truncate rounded-lg bg-emerald-50 px-2.5 py-2 text-xs leading-snug text-emerald-800 ring-1 ring-inset ring-emerald-100 sm:text-xs">
          Nyeste match: <b>{s.last_match.address}</b>
          {s.last_match.score != null && <> · score {s.last_match.score}/100</>}
        </div>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-1.5 border-t border-slate-100 pt-3">
        <Link
          href={href(s)}
          className="inline-flex items-center gap-1 rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white shadow-btn ring-1 ring-inset ring-white/10 transition-colors hover:bg-slate-800 sm:text-xs"
        >
          Kør søgning <ArrowUpRight size={11} />
        </Link>
        <button
          onClick={remove}
          disabled={removing}
          aria-label="Fjern søgning"
          title="Fjern"
          className="ml-auto inline-flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-600 disabled:opacity-50"
        >
          {removing ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
        </button>
      </div>
    </div>
  );
}

export function SavedSearches({ initial }: { initial: SavedSearch[] }) {
  const [searches, setSearches] = useState<SavedSearch[]>(initial);
  const remove = (id: string) => setSearches((xs) => xs.filter((x) => x.id !== id));
  if (searches.length === 0) return null; // only show the section once the user has one

  const totalNew = searches.reduce((n, s) => n + (s.new_count ?? 0), 0);
  return (
    <section className="mt-8 sm:mt-10">
      <div className="flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-lg font-bold sm:text-xl">
          <Search size={17} className="text-blue-600" /> Gemte søgninger
          {totalNew > 0 && (
            <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700">
              {totalNew} nye
            </span>
          )}
        </h2>
        <Link href="/app/find" className="shrink-0 text-xs font-medium text-slate-500 hover:text-slate-900 sm:text-sm">
          Ny søgning
        </Link>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
        {searches.map((s) => <Card key={s.id} s={s} onRemove={remove} />)}
      </div>
    </section>
  );
}
