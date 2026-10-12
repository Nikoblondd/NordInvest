/*
 * Access requests ("Anmod om adgang"). Each request is validated here, kept as
 * a private JSON file in the Supabase Storage bucket `access-requests` (no
 * table needed until access control lands in phase 2) and e-mailed to
 * Nikolaj, so nothing depends on one channel.
 */

export { GOALS, PORTFOLIO, validate, type FieldErrors } from "./fields";
import type { AccessRequest } from "./fields";
export type { AccessRequest };



const bucketUrl = () => `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/access-requests`;
const headers = () => ({ Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`, apikey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? "" });

export async function storeRequest(r: AccessRequest): Promise<boolean> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) return false;
  const res = await fetch(`${bucketUrl()}/${r.createdAt.slice(0, 10)}/${r.id}.json`, {
    method: "POST",
    headers: { ...headers(), "Content-Type": "application/json", "x-upsert": "false" },
    body: JSON.stringify(r),
  }).catch(() => null);
  return !!res?.ok;
}

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

export function notifyEmail(r: AccessRequest): { subject: string; html: string } {
  const rows: [string, string][] = [
    ["Navn", r.name],
    ["Telefon", `<a href="tel:${r.phone.replace(/\s/g, "")}">${esc(r.phone)}</a>`],
    ["E-mail", `<a href="mailto:${esc(r.email)}">${esc(r.email)}</a>`],
    ["Ejer i dag", r.portfolio],
    ["Leder efter", r.goals.join(", ") || "Ikke oplyst"],
    ["Bolig til samtalen", r.propertyLink ? `<a href="${esc(r.propertyLink)}">${esc(r.propertyLink)}</a>` : "Ingen"],
    ["Besked", r.message ? esc(r.message).replace(/\n/g, "<br>") : "Ingen"],
  ];
  return {
    subject: `Ny anmodning om adgang: ${r.name} (${r.portfolio})`,
    html: `<div style="font-family:-apple-system,Segoe UI,sans-serif;max-width:560px;color:#0f172a">
<h2 style="margin:0 0 4px;font-size:20px">Ny anmodning om adgang</h2>
<p style="margin:0 0 16px;color:#64748b;font-size:14px">${new Date(r.createdAt).toLocaleString("da-DK", { timeZone: "Europe/Copenhagen" })}. Svar på denne mail for at skrive direkte til ${esc(r.name.split(" ")[0])}.</p>
<table style="width:100%;border-collapse:collapse;font-size:15px">${rows.map(([k, v]) => `<tr><td style="padding:8px 12px 8px 0;color:#64748b;vertical-align:top;white-space:nowrap;border-top:1px solid #eef2f7">${k}</td><td style="padding:8px 0;border-top:1px solid #eef2f7">${k === "Navn" || k === "Ejer i dag" || k === "Leder efter" ? esc(v) : v}</td></tr>`).join("")}</table>
<p style="margin:16px 0 0;font-size:12px;color:#94a3b8">Id ${r.id}</p></div>`,
  };
}

export function confirmationEmail(r: AccessRequest): { subject: string; html: string } {
  const first = esc(r.name.split(" ")[0]);
  return {
    subject: "Tak for din anmodning til NordInvest",
    html: `<div style="font-family:-apple-system,Segoe UI,sans-serif;max-width:520px;color:#0f172a;font-size:15px;line-height:1.6">
<p>Hej ${first},</p>
<p>Tak for din anmodning om adgang til NordInvest. Jeg ringer dig op på ${esc(r.phone)} inden for en arbejdsdag, så vi kan tage en kort snak om dine boliger${r.propertyLink ? " og kigge på den bolig, du sendte med" : ""}.</p>
<p>Passer det dårligt, så svar bare på denne mail med et tidspunkt, der passer dig bedre.</p>
<p>Venlig hilsen<br>Nikolaj Blond<br>NordInvest · +45 20 99 37 97</p>
<p style="font-size:12px;color:#94a3b8">Du får denne mail, fordi du har anmodet om adgang på nordinvest.io. Vi bruger kun dine oplysninger til at kontakte dig om adgang.</p></div>`,
  };
}
