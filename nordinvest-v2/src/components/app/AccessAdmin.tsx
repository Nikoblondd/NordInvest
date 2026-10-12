"use client";

import { useState } from "react";
import { Check, Copy, Loader2, Mail, Phone, Send, UserMinus, UserPlus } from "lucide-react";
import { clsx } from "@/lib/clsx";
import { REQUEST_STATUS, type AccessRequest, type RequestStatus } from "@/lib/access/fields";

/*
 * Admin: who is in. Requests from /adgang with status and notes, members with
 * their last sign-in, and a direct invite. Approving sends the personal
 * invitation (or shows the link if e-mail could not be sent).
 */

export type MemberRow = { id: string; email: string; name: string; createdAt: string; lastSignIn: string | null; access: "member" | "revoked"; note?: string };

const date = (s: string | null) => (s ? new Date(s).toLocaleDateString("da-DK", { day: "numeric", month: "short", year: "numeric" }) : "Aldrig");
const TONE: Record<RequestStatus, string> = { ny: "bg-blue-50 text-blue-800", kontaktet: "bg-amber-50 text-amber-900", inviteret: "bg-emerald-50 text-emerald-800", afvist: "bg-slate-100 text-slate-600" };

async function call(body: Record<string, unknown>) {
  const r = await fetch("/api/admin/access", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  return (await r.json().catch(() => ({ ok: false, reason: "network" }))) as { ok: boolean; reason?: string; link?: string; sent?: boolean };
}

export function AccessAdmin({ requests: initialReq, members: initialMembers }: { requests: AccessRequest[]; members: MemberRow[] }) {
  const [tab, setTab] = useState<"anmodninger" | "medlemmer" | "inviter">("anmodninger");
  const [requests, setRequests] = useState(initialReq);
  const [members, setMembers] = useState(initialMembers);
  const [filter, setFilter] = useState<RequestStatus | "alle">("ny");
  const [toast, setToast] = useState<{ text: string; link?: string } | null>(null);
  const shown = requests.filter((r) => filter === "alle" || r.status === filter);
  const counts = (s: RequestStatus) => requests.filter((r) => r.status === s).length;

  const say = (text: string, link?: string) => { setToast({ text, link }); if (!link) setTimeout(() => setToast(null), 4000); };

  return (
    <div>
      <div role="tablist" className="mt-6 flex gap-1 border-b border-slate-200">
        {([["anmodninger", `Anmodninger`, counts("ny")], ["medlemmer", "Medlemmer", members.filter((m) => m.access === "member").length], ["inviter", "Invitér direkte", 0]] as const).map(([id, label, n]) => (
          <button key={id} type="button" role="tab" aria-selected={tab === id} onClick={() => setTab(id)}
            className={clsx("-mb-px flex min-h-[46px] items-center gap-1.5 border-b-2 px-3 text-[14px] font-semibold", tab === id ? "border-slate-900 text-slate-900" : "border-transparent text-slate-500 hover:text-slate-800")}>
            {label}{n > 0 && <span className="rounded-full bg-slate-100 px-1.5 text-[12px] tabular-nums text-slate-600">{n}</span>}
          </button>
        ))}
      </div>

      {toast && (
        <div role="status" className="mt-4 flex flex-wrap items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-[15px] text-emerald-900">
          <Check size={17} /> <span className="flex-1">{toast.text}</span>
          {toast.link && <CopyLink link={toast.link} />}
          <button type="button" onClick={() => setToast(null)} className="text-[14px] font-medium underline">Luk</button>
        </div>
      )}

      {tab === "anmodninger" && (
        <>
          <div className="mt-5 flex flex-wrap gap-1.5">
            {(["ny", "kontaktet", "inviteret", "afvist", "alle"] as const).map((s) => (
              <button key={s} type="button" onClick={() => setFilter(s)} className={clsx("min-h-[36px] rounded-full px-3 text-[13px] font-semibold", filter === s ? "bg-slate-900 text-white" : "bg-white text-slate-600 ring-1 ring-slate-200")}>
                {s === "alle" ? "Alle" : REQUEST_STATUS[s]} {s !== "alle" && <span className="opacity-60">{counts(s)}</span>}
              </button>
            ))}
          </div>
          {shown.length === 0 ? (
            <p className="mt-8 rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-10 text-center text-[15px] text-slate-500">Ingen anmodninger her.</p>
          ) : (
            <ul className="mt-4 space-y-3">
              {shown.map((r) => (
                <RequestCard key={r.id} r={r}
                  onChange={(next) => setRequests((all) => all.map((x) => (x.id === next.id ? next : x)))}
                  onInvited={(link) => say(link ? "Adgangen er givet, men mailen kunne ikke sendes. Send linket selv:" : `Invitation sendt til ${r.email}.`, link)} />
              ))}
            </ul>
          )}
        </>
      )}

      {tab === "medlemmer" && (
        <div className="mt-5 overflow-hidden rounded-2xl border border-slate-200 bg-white">
          {members.length === 0 ? <p className="px-6 py-10 text-center text-[15px] text-slate-500">Ingen medlemmer endnu.</p> : (
            <ul className="divide-y divide-slate-100">
              {members.map((m) => (
                <li key={m.id} className="flex flex-wrap items-center gap-3 px-4 py-3 sm:px-5">
                  <span className={clsx("flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[13px] font-semibold", m.access === "member" ? "bg-blue-600 text-white" : "bg-slate-200 text-slate-500")}>{(m.name || m.email).slice(0, 2).toUpperCase()}</span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[15px] font-semibold">{m.name || m.email}</p>
                    <p className="truncate text-[13px] text-slate-500">{m.email} · senest logget ind {date(m.lastSignIn)}{m.note ? ` · ${m.note}` : ""}</p>
                  </div>
                  <MemberToggle m={m} onDone={(access) => { setMembers((all) => all.map((x) => (x.id === m.id ? { ...x, access } : x))); say(access === "member" ? `${m.email} har adgang igen.` : `Adgangen for ${m.email} er fjernet.`); }} />
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {tab === "inviter" && <InviteForm onInvited={(email, link) => say(link ? "Adgangen er givet, men mailen kunne ikke sendes. Send linket selv:" : `Invitation sendt til ${email}.`, link)} />}
    </div>
  );
}

function RequestCard({ r, onChange, onInvited }: { r: AccessRequest; onChange: (r: AccessRequest) => void; onInvited: (link?: string) => void }) {
  const [note, setNote] = useState(r.adminNote ?? "");
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const setStatus = async (status: RequestStatus) => {
    setBusy(status); setErr(null);
    const res = await call({ action: "status", requestId: r.id, requestCreatedAt: r.createdAt, status, note });
    setBusy(null);
    if (res.ok) onChange({ ...r, status, adminNote: note }); else setErr("Kunne ikke gemme. Prøv igen.");
  };
  const invite = async () => {
    setBusy("invite"); setErr(null);
    const res = await call({ action: "invite", email: r.email, name: r.name, requestId: r.id, requestCreatedAt: r.createdAt, note });
    setBusy(null);
    if (res.ok) { onChange({ ...r, status: "inviteret", adminNote: note }); onInvited(res.link); }
    else setErr(res.reason === "email" ? "E-mailen er ugyldig." : "Invitationen mislykkedes. Prøv igen.");
  };
  return (
    <li className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="flex flex-wrap items-center gap-2 text-[16px] font-semibold">{r.name} <span className={clsx("rounded-md px-1.5 py-0.5 text-[12px] font-semibold", TONE[r.status])}>{REQUEST_STATUS[r.status]}</span></p>
          <p className="mt-0.5 text-[13px] text-slate-500">{new Date(r.createdAt).toLocaleString("da-DK", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })} · ejer {r.portfolio} · {r.goals.join(", ") || "intet valgt"}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <a href={`tel:${r.phone.replace(/\s/g, "")}`} className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg border border-slate-200 px-3 text-[14px] font-semibold hover:border-slate-300"><Phone size={14} /> {r.phone}</a>
          <a href={`mailto:${r.email}`} className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg border border-slate-200 px-3 text-[14px] font-semibold hover:border-slate-300"><Mail size={14} /> Skriv</a>
        </div>
      </div>
      {r.message && <p className="mt-3 whitespace-pre-line rounded-lg bg-slate-50 p-3 text-[15px] leading-relaxed text-slate-700">{r.message}</p>}
      <label htmlFor={`note-${r.id}`} className="mt-3 block text-[13px] font-medium text-slate-600">Dine noter (pris, aftale, næste skridt)</label>
      <textarea id={`note-${r.id}`} value={note} onChange={(e) => setNote(e.target.value)} rows={2} className="mt-1 w-full rounded-lg border border-slate-200 bg-white p-2.5 text-[15px] focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100" />
      {err && <p role="alert" className="mt-2 text-[14px] font-medium text-rose-600">{err}</p>}
      <div className="mt-3 flex flex-wrap gap-2">
        {r.status !== "inviteret" && (
          <button type="button" onClick={invite} disabled={!!busy} className="inline-flex min-h-[42px] items-center gap-1.5 rounded-lg bg-blue-600 px-4 text-[14px] font-semibold text-white hover:bg-blue-500 disabled:opacity-60">
            {busy === "invite" ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />} Godkend og invitér
          </button>
        )}
        {r.status === "ny" && <button type="button" onClick={() => setStatus("kontaktet")} disabled={!!busy} className="min-h-[42px] rounded-lg border border-slate-300 px-4 text-[14px] font-semibold hover:border-slate-400 disabled:opacity-60">{busy === "kontaktet" ? "Gemmer" : "Markér som kontaktet"}</button>}
        {r.status !== "afvist" && r.status !== "inviteret" && <button type="button" onClick={() => setStatus("afvist")} disabled={!!busy} className="min-h-[42px] rounded-lg px-3 text-[14px] font-medium text-slate-500 hover:text-slate-800 disabled:opacity-60">Ikke et match</button>}
        {(r.status === "afvist" || r.status === "kontaktet") && <button type="button" onClick={() => setStatus(r.status === "afvist" ? "ny" : "kontaktet")} disabled={!!busy} className="min-h-[42px] rounded-lg px-3 text-[14px] font-medium text-slate-500 hover:text-slate-800">{r.status === "afvist" ? "Genåbn" : "Gem note"}</button>}
      </div>
    </li>
  );
}

function MemberToggle({ m, onDone }: { m: MemberRow; onDone: (a: "member" | "revoked") => void }) {
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const go = async () => {
    setBusy(true);
    const res = await call({ action: m.access === "member" ? "revoke" : "restore", userId: m.id });
    setBusy(false); setConfirm(false);
    if (res.ok) onDone(m.access === "member" ? "revoked" : "member");
  };
  if (m.access === "revoked") return <button type="button" onClick={go} disabled={busy} className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg border border-slate-300 px-3 text-[14px] font-semibold hover:border-slate-400"><UserPlus size={15} /> Giv adgang igen</button>;
  return confirm ? (
    <span className="flex items-center gap-2 text-[14px]">
      <span className="text-slate-600">Fjern adgangen?</span>
      <button type="button" onClick={go} disabled={busy} className="min-h-[40px] rounded-lg bg-rose-600 px-3 font-semibold text-white">{busy ? "Fjerner" : "Ja, fjern"}</button>
      <button type="button" onClick={() => setConfirm(false)} className="min-h-[40px] px-2 font-medium text-slate-500">Annullér</button>
    </span>
  ) : <button type="button" onClick={() => setConfirm(true)} className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg px-3 text-[14px] font-medium text-slate-500 hover:text-rose-600"><UserMinus size={15} /> Fjern adgang</button>;
}

function InviteForm({ onInvited }: { onInvited: (email: string, link?: string) => void }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true); setErr(null);
    const res = await call({ action: "invite", email, name, note });
    setBusy(false);
    if (res.ok) { onInvited(email, res.link); setName(""); setEmail(""); setNote(""); }
    else setErr(res.reason === "email" ? "Skriv en gyldig e-mail." : "Invitationen mislykkedes. Prøv igen.");
  };
  const input = "mt-1.5 h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-[16px] focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-100";
  return (
    <form onSubmit={submit} className="mt-5 max-w-xl rounded-2xl border border-slate-200 bg-white p-5">
      <p className="text-[15px] text-slate-600">Personen får en mail med et personligt link. Første gang vælger de adgangskode, og så starter guiden.</p>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div><label htmlFor="inv-name" className="text-[14px] font-medium text-slate-700">Navn</label><input id="inv-name" value={name} onChange={(e) => setName(e.target.value)} className={input} /></div>
        <div><label htmlFor="inv-mail" className="text-[14px] font-medium text-slate-700">E-mail</label><input id="inv-mail" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className={input} /></div>
      </div>
      <div className="mt-4"><label htmlFor="inv-note" className="text-[14px] font-medium text-slate-700">Note (pris, aftale)</label><input id="inv-note" value={note} onChange={(e) => setNote(e.target.value)} className={input} /></div>
      {err && <p role="alert" className="mt-3 text-[14px] font-medium text-rose-600">{err}</p>}
      <button type="submit" disabled={busy} className="mt-5 inline-flex min-h-[46px] items-center gap-2 rounded-lg bg-blue-600 px-5 text-[15px] font-semibold text-white hover:bg-blue-500 disabled:opacity-60">{busy ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />} Send invitation</button>
    </form>
  );
}

function CopyLink({ link }: { link: string }) {
  const [ok, setOk] = useState(false);
  return (
    <button type="button" onClick={async () => { try { await navigator.clipboard.writeText(link); setOk(true); } catch { window.prompt("Kopiér linket", link); } }}
      className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg bg-white px-3 text-[14px] font-semibold text-emerald-900 ring-1 ring-emerald-300">
      {ok ? <><Check size={14} /> Kopieret</> : <><Copy size={14} /> Kopiér link</>}
    </button>
  );
}
