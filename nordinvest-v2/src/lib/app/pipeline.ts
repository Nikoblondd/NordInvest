"use client";

import { createClient } from "@/lib/supabase/client";
import { EMPTY_MAPPE, type Mappe, type Stage } from "@/lib/mappe/checklist";
import type { Hit } from "./agents";

/*
 * Puts a listing from the Deal-motor or a search agent straight into the
 * member's pipeline, with the numbers it was found with, so it can be opened
 * as a case (and its analysis) at once. Returns the new property's id.
 */
export async function saveHitToPipeline(h: Hit, stage: Stage = "screening", from?: string): Promise<string | null> {
  const supabase = createClient();
  if (!supabase) return null;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const opex = h.area ? Math.round((h.area * 35) / 50) * 50 : 0;
  const mappe: Mappe = {
    ...EMPTY_MAPPE,
    stage,
    log: [{ at: new Date().toISOString(), text: from ? `Gemt fra søgeagenten "${from}"` : "Gemt fra Deal-motoren", kind: "oprettet" }],
  };
  const { data, error } = await supabase.from("analyses").insert({
    user_id: user.id,
    property_url: h.address || h.road,
    strategy: "cashflow",
    investment_score: h.score,
    verdict: null,
    saved_to_portfolio: true,
    property_data: {
      address: h.address || `${h.road}, ${h.zip} ${h.city}`,
      price: h.price,
      monthlyRent: h.rent ?? undefined,
      monthlyOpex: opex || undefined,
      downPaymentPct: 20,
      interestRate: 5,
      area: h.area ?? undefined,
      rooms: h.rooms ?? undefined,
      zip: h.zip,
      image: h.image ?? undefined,
      listingUrl: h.url || undefined,
      strategy: "cashflow",
      mappe,
    },
    analysis_result: { cashFlow: h.cashFlow, capRate: h.capRate },
  }).select("id").single();
  return error ? null : (data?.id as string);
}

/** Adds an appointment to a saved property, on top of what is stored now (never an old copy). */
export async function addTaskToRow(rowId: string, task: import("@/lib/mappe/checklist").Task, logText: string): Promise<boolean> {
  const supabase = createClient();
  if (!supabase) return false;
  const { data } = await supabase.from("analyses").select("property_data").eq("id", rowId).single();
  if (!data) return false;
  const pd = (data.property_data ?? {}) as Record<string, unknown>;
  const m: Mappe = { ...EMPTY_MAPPE, ...((pd.mappe as Mappe | undefined) ?? {}) };
  const next: Mappe = { ...m, tasks: [...(m.tasks ?? []), task], log: [{ at: new Date().toISOString(), text: logText, kind: "aftale" as const }, ...(m.log ?? [])].slice(0, 200), updatedAt: new Date().toISOString() };
  const { error } = await supabase.from("analyses").update({ property_data: { ...pd, mappe: next } }).eq("id", rowId);
  return !error;
}
