/*
 * Access requests ("Anmod om adgang"). Each request is validated here, kept as
 * a private JSON file in the Supabase Storage bucket `access-requests` (no
 * table needed until access control lands in phase 2) and e-mailed to
 * Nikolaj, so nothing depends on one channel.
 */

export { GOALS, PORTFOLIO, REQUEST_STATUS, validate, type FieldErrors, type RequestStatus } from "./fields";
import type { AccessRequest } from "./fields";
export type { AccessRequest };



const bucketUrl = () => `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/access-requests`;
const headers = () => ({ Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`, apikey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? "" });

const objectPath = (r: Pick<AccessRequest, "createdAt" | "id">) => `${r.createdAt.slice(0, 10)}/${r.id}.json`;

/** All requests, newest first. Folders are dates (YYYY-MM-DD). */
export async function listRequests(): Promise<AccessRequest[]> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) return [];
  const list = async (prefix: string) => {
    const r = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/list/access-requests`, {
      method: "POST", headers: { ...headers(), "Content-Type": "application/json" },
      body: JSON.stringify({ prefix, limit: 1000, sortBy: { column: "name", order: "desc" } }), cache: "no-store",
    }).catch(() => null);
    return r?.ok ? ((await r.json()) as { name: string; id: string | null }[]) : [];
  };
  const days = (await list("")).filter((o) => /^\d{4}-\d{2}-\d{2}$/.test(o.name)).map((o) => o.name).slice(0, 120);
  const files = (await Promise.all(days.map(async (d) => (await list(`${d}/`)).filter((o) => o.name.endsWith(".json")).map((o) => `${d}/${o.name}`)))).flat();
  const rows = await Promise.all(files.map(async (f) => {
    const r = await fetch(`${bucketUrl()}/${f}`, { headers: headers(), cache: "no-store" }).catch(() => null);
    return r?.ok ? ((await r.json().catch(() => null)) as AccessRequest | null) : null;
  }));
  return rows.filter((x): x is AccessRequest => !!x && !!x.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function getRequest(id: string, createdAt: string): Promise<AccessRequest | null> {
  const r = await fetch(`${bucketUrl()}/${objectPath({ id, createdAt })}`, { headers: headers(), cache: "no-store" }).catch(() => null);
  return r?.ok ? ((await r.json().catch(() => null)) as AccessRequest | null) : null;
}

export async function updateRequest(r: AccessRequest): Promise<boolean> {
  const res = await fetch(`${bucketUrl()}/${objectPath(r)}`, {
    method: "PUT",
    headers: { ...headers(), "Content-Type": "application/json", "x-upsert": "true" },
    body: JSON.stringify({ ...r, updatedAt: new Date().toISOString() }),
  }).catch(() => null);
  return !!res?.ok;
}

export async function storeRequest(r: AccessRequest): Promise<boolean> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) return false;
  const res = await fetch(`${bucketUrl()}/${objectPath(r)}`, {
    method: "POST",
    headers: { ...headers(), "Content-Type": "application/json", "x-upsert": "false" },
    body: JSON.stringify(r),
  }).catch(() => null);
  return !!res?.ok;
}

/** Where new access requests land. */
export const ACCESS_INBOX = "contact@nordinvest.io";
const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://nordinvest.io";

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

export function notifyEmail(r: AccessRequest): { subject: string; html: string } {
  const rows: [string, string][] = [
    ["Navn", r.name],
    ["Telefon", `<a href="tel:${r.phone.replace(/\s/g, "")}">${esc(r.phone)}</a>`],
    ["E-mail", `<a href="mailto:${esc(r.email)}">${esc(r.email)}</a>`],
    ["Ejer i dag", r.portfolio],
    ["Leder efter", r.goals.join(", ") || "Ikke oplyst"],
    ["Besked", r.message ? esc(r.message).replace(/\n/g, "<br>") : "Ingen"],
  ];
  return {
    subject: `Ny anmodning om adgang: ${r.name} (${r.portfolio})`,
    html: `<div style="font-family:-apple-system,Segoe UI,sans-serif;max-width:560px;color:#0f172a">
<h2 style="margin:0 0 4px;font-size:20px">Ny anmodning om adgang</h2>
<p style="margin:0 0 16px;color:#64748b;font-size:14px">${new Date(r.createdAt).toLocaleString("da-DK", { timeZone: "Europe/Copenhagen" })}. Svar på denne mail for at skrive direkte til ${esc(r.name.split(" ")[0])}.</p>
<table style="width:100%;border-collapse:collapse;font-size:15px">${rows.map(([k, v]) => `<tr><td style="padding:8px 12px 8px 0;color:#64748b;vertical-align:top;white-space:nowrap;border-top:1px solid #eef2f7">${k}</td><td style="padding:8px 0;border-top:1px solid #eef2f7">${k === "Navn" || k === "Ejer i dag" || k === "Leder efter" ? esc(v) : v}</td></tr>`).join("")}</table>
<table role="presentation" style="margin:24px 0 8px;border-collapse:collapse"><tr>
<td style="padding-right:10px"><a href="${SITE}/app/admin/adgang?anmodning=${r.id}&handling=godkend" style="display:inline-block;background:#059669;color:#fff;text-decoration:none;font-weight:600;font-size:15px;padding:12px 22px;border-radius:8px">Godkend</a></td>
<td><a href="${SITE}/app/admin/adgang?anmodning=${r.id}&handling=afvis" style="display:inline-block;background:#fff;color:#0f172a;text-decoration:none;font-weight:600;font-size:15px;padding:11px 22px;border-radius:8px;border:1px solid #cbd5e1">Afvis</a></td>
</tr></table>
<p style="margin:0;font-size:13px;color:#64748b">Knapperne åbner anmodningen i NordInvest, hvor du bekræfter med ét tryk. Godkender du, får ${esc(r.name.split(" ")[0])} straks en mail med sit login.</p>
<p style="margin:16px 0 0;font-size:12px;color:#94a3b8">Id ${r.id}</p></div>`,
  };
}

export function confirmationEmail(r: AccessRequest): { subject: string; html: string } {
  const first = esc(r.name.split(" ")[0]);
  return {
    subject: "Tak for din anmodning til NordInvest",
    html: `<div style="font-family:-apple-system,Segoe UI,sans-serif;max-width:520px;color:#0f172a;font-size:15px;line-height:1.6">
<p>Hej ${first},</p>
<p>Tak for din anmodning om adgang til NordInvest. Du hører fra os inden for en arbejdsdag, så vi kan aftale en kort samtale om, hvordan du investerer, og hvad du har brug for.</p>
<p>Har du spørgsmål inden da, kan du svare på denne mail.</p>
<p>Venlig hilsen<br>Nikolaj Blond<br>NordInvest · contact@nordinvest.io</p>
<p style="font-size:12px;color:#94a3b8">Du får denne mail, fordi du har anmodet om adgang på nordinvest.io. Vi bruger kun dine oplysninger til at kontakte dig om adgang.</p></div>`,
  };
}

export function brokerInvitationEmail(name: string, link: string): { subject: string; html: string } {
  const first = esc(name.split(" ")[0] || "der");
  return {
    subject: "Jeres adgang til NordInvest for mæglere",
    html: `<div style="font-family:-apple-system,Segoe UI,sans-serif;max-width:520px;color:#0f172a;font-size:15px;line-height:1.6">
<p>Hej ${first},</p>
<p>Som aftalt har du nu adgang til NordInvest for mæglere. Her laver du investoranalyser af jeres sager og sætter en NordInvest-knap på sagen på jeres hjemmeside. Det tager et par minutter pr. sag og er gratis.</p>
<p style="margin:28px 0"><a href="${link}" style="display:inline-block;background:#2563eb;color:#fff;text-decoration:none;font-weight:600;padding:13px 22px;border-radius:8px">Åbn mæglerværktøjet</a></p>
<p style="font-size:13px;color:#64748b">Linket er personligt og udløber ikke. Første gang vælger du en adgangskode, og derefter logger du ind på nordinvest.io/maegler.</p>
<p>Venlig hilsen<br>Nikolaj Blond<br>NordInvest · contact@nordinvest.io</p></div>`,
  };
}

export function invitationEmail(name: string, link: string, broker = false): { subject: string; html: string } {
  const first = esc(name.split(" ")[0] || "der");
  return {
    subject: "Du er godkendt til NordInvest",
    html: `<div style="font-family:-apple-system,Segoe UI,sans-serif;max-width:520px;color:#0f172a;font-size:15px;line-height:1.6">
<p>Hej ${first},</p>
<p>Din anmodning om adgang til NordInvest er godkendt, og din konto er klar. Tryk på knappen for at logge ind første gang. Du vælger selv en adgangskode, og bagefter viser en kort guide dig rundt.</p>
<p style="margin:28px 0"><a href="${link}" style="display:inline-block;background:#2563eb;color:#fff;text-decoration:none;font-weight:600;padding:13px 22px;border-radius:8px">Åbn NordInvest</a></p>
${broker ? `<p>Du har også adgang til mæglerværktøjet, hvor du laver investoranalyser af dine sager og sætter en NordInvest-knap på dem. Du finder det i menuen under Mæglerværktøj.</p>` : ""}
<p style="font-size:13px;color:#64748b">Linket er personligt og udløber ikke. Første gang vælger du en adgangskode, og derefter logger du ind på nordinvest.io.</p>
<p>Har du spørgsmål undervejs, kan du skrive til os under Kontakt i NordInvest eller svare på denne mail.</p>
<p>Venlig hilsen<br>Nikolaj Blond<br>NordInvest · contact@nordinvest.io</p></div>`,
  };
}
