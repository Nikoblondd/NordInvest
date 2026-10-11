"use client";

import { createClient } from "@/lib/supabase/client";
import type { Mappe } from "./checklist";

/** Saves a mappe on the user's own analysis row, keeping the rest of property_data. */
export async function saveMappe(rowId: string, propertyData: Record<string, unknown>, mappe: Mappe): Promise<boolean> {
  const supabase = createClient();
  if (!supabase) return false;
  const { error } = await supabase
    .from("analyses")
    .update({ property_data: { ...propertyData, mappe: { ...mappe, updatedAt: new Date().toISOString() } } })
    .eq("id", rowId);
  return !error;
}
