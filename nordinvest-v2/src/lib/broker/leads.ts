import { randomUUID } from "node:crypto";
import { getJson, putJson } from "@/lib/broker/links";

/*
 * Buyers who write to the agent from a shared analysis (/e/<slug>). The
 * message is mailed to the agent who owns the link (or to NordInvest, which
 * forwards it, for the hand-made links), and kept here so the agent can see
 * their leads in /maegler. Stored in the private bucket, server only.
 */

export type Lead = { id: string; at: string; name: string; email: string; phone: string; message: string };

export const LEAD_MESSAGE_MAX = 1500;
const MAX_KEPT = 200;

export type LeadInput = { name?: unknown; email?: unknown; phone?: unknown; message?: unknown; consent?: unknown };

/** Danish error messages per field, or the cleaned lead. */
export function validateLead(b: LeadInput): { ok: true; lead: Omit<Lead, "id" | "at"> } | { ok: false; errors: Record<string, string> } {
  const name = String(b.name ?? "").trim().slice(0, 120);
  const email = String(b.email ?? "").trim().toLowerCase().slice(0, 200);
  const phone = String(b.phone ?? "").trim().slice(0, 40);
  const message = String(b.message ?? "").trim().slice(0, LEAD_MESSAGE_MAX);
  const errors: Record<string, string> = {};
  if (name.length < 2) errors.name = "Skriv dit navn.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) errors.email = "Skriv en gyldig e-mail.";
  if (phone && !/^[+\d][\d\s-]{5,}$/.test(phone)) errors.phone = "Skriv et gyldigt telefonnummer, eller lad feltet stå tomt.";
  if (message.length < 5) errors.message = "Skriv en kort besked til mægleren.";
  if (b.consent !== true) errors.consent = "Sæt flueben, så vi må sende din besked videre.";
  return Object.keys(errors).length ? { ok: false, errors } : { ok: true, lead: { name, email, phone, message } };
}

export async function listLeads(slug: string): Promise<Lead[]> {
  return (await getJson<Lead[]>(`leads/${slug}.json`)) ?? [];
}

/** Adds a lead, newest first. Returns false if storage failed or the same e-mail wrote within the last 10 minutes. */
export async function addLead(slug: string, lead: Omit<Lead, "id" | "at">): Promise<{ ok: boolean; duplicate?: boolean; today?: number }> {
  const list = await listLeads(slug);
  const now = Date.now();
  if (list.some((l) => l.email === lead.email && now - Date.parse(l.at) < 10 * 60_000)) return { ok: false, duplicate: true };
  const today = list.filter((l) => now - Date.parse(l.at) < 24 * 3600_000).length;
  if (today >= 30) return { ok: false, today };
  const next: Lead[] = [{ id: randomUUID(), at: new Date(now).toISOString(), ...lead }, ...list].slice(0, MAX_KEPT);
  return { ok: await putJson(`leads/${slug}.json`, next) };
}
