"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight, Check, Copy, Loader2, Mail, Phone, RotateCcw, Send, X } from "lucide-react";
import { clsx } from "@/lib/clsx";
import { REQUEST_STATUS, type AccessRequest, type RequestStatus } from "@/lib/access/fields";
import { DEFAULT_INVITE_TEXT, INVITE_TEXT_MAX, type InviteCopyKind } from "@/lib/access/invite-copy";

/*
 * Admin: access requests from /adgang. One press approves (the person gets
 * the approval e-mail with their login) or rejects. The links in the request
 * e-mail open this page with that request and the chosen action ready to
 * confirm, so nothing happens just because a mail client follows a link.
 */

const TONE: Record<RequestStatus, string> = { ny: "bg-amber-50 text-amber-900 ring-amber-200", kontaktet: "bg-sky-50 text-sky-900 ring-sky-200", inviteret: "bg-emerald-50 text-emerald-800 ring-emerald-200", afvist: "bg-slate-100 text-slate-600 ring-slate-200" };
type Focus = { id: string; action: "godkend" | "afvis" } | null;
type Result = { ok: boolean; reason?: string; link?: string; sent?: boolean; userId?: string; mailId?: string | null; error?: string; status?: string };
type Filter = "afventer" | "godkendt" | "afvist" | "alle";

async function call(body: Record<string, unknown>): Promise<Result> {
  const r = await fetch("/api/admin/access", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  return (await r.json().catch(() => ({ ok: false, reason: "network" }))) as Result;
}

const isOpen = (s: RequestStatus) => s === "ny" || s === "kontaktet";
const inFilter = (r: AccessRequest, f: Filter) =>
  f === "alle" || (f === "afventer" ? isOpen(r.status) : f === "godkendt" ? r.status === "inviteret" : r.status === "afvist");

export function AccessAdmin({ requests: initial, focus }: { requests: AccessRequest[]; focus: Focus }) {
  const [tab, setTab] = useState<"anmodninger" | "inviter">("anmodninger");
  const [requests, setRequests] = useState(initial);
  const focused = focus ? initial.find((r) => r.id === focus.id) : undefined;
  const [filter, setFilter] = useState<Filter>(focused && !isOpen(focused.status) ? "alle" : "afventer");
  const [confirm, setConfirm] = useState<{ r: AccessRequest; action: "godkend" | "afvis" } | null>(focused && focus && isOpen(focused.status) ? { r: focused, action: focus.action } : null);
  const [toast, setToast] = useState<{ text: string; link?: string; tone?: "ok" | "info" } | null>(null);

  const shown = requests.filter((r) => inFilter(r, filter));
  const count = (f: Filter) => requests.filter((r) => inFilter(r, f)).length;
  const replace = (next: AccessRequest) => setRequests((all) => all.map((x) => (x.id === next.id ? next : x)));
  const say = (text: string, link?: string, tone: "ok" | "info" = "ok") => { setToast({ text, link, tone }); if (!link) setTimeout(() => setToast(null), 5000); };

  // After an approval: follow the mail at Resend until the recipient's mail server has taken it (or refused it).
  const poll = useRef(0);
  const report = async (res: { sent?: boolean; mailId?: string | null; link?: string; error?: string }, who: string, email: string) => {
    const run = ++poll.current;
    if (!res.sent || !res.mailId) {
      say(`${who} er godkendt, men mailen kunne ikke sendes${res.error ? ` (${res.error})` : ""}. Linket er også sendt til din egen mail. Send det selv:`, res.link, "info");
      return;
    }
    say(`${who} er godkendt. Mailen med login er sendt til ${email}. Venter på bekræftelse fra modtagerens mailserver …`, res.link);
    for (let i = 0; i < 20 && run === poll.current; i++) {
      await new Promise((ok) => setTimeout(ok, 3000));
      if (run !== poll.current) return;
      const st = await call({ action: "mailstatus", mailId: res.mailId });
      if (st.status === "leveret") return say(`${who} er godkendt, og mailen med login er leveret til ${email}.`, res.link);
      if (st.status === "afvist") return say(`Mailen til ${email} kom ikke frem: adressen afviste den. Tjek stavningen, eller send linket selv:`, res.link, "info");
      if (st.status === "spam") return say(`${email} har markeret mailen som spam. Send linket selv, fx på sms:`, res.link, "info");
    }
    if (run === poll.current) say(`${who} er godkendt, og mailen er sendt til ${email}, men modtagerens mailserver har ikke bekræftet den endnu. Hører de ikke noget, så send linket:`, res.link, "info");
  };

  // A request opened from the e-mail that was already handled: say so.
  useEffect(() => {
    if (focus && !focused) say("Anmodningen fra mailen findes ikke længere.", undefined, "info");
    else if (focused && !isOpen(focused.status)) say(`${focused.name} er allerede ${REQUEST_STATUS[focused.status].toLowerCase()}.`, undefined, "info");
    if (focus) window.history.replaceState(null, "", "/app/admin/adgang");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const approve = async (r: AccessRequest): Promise<boolean> => {
    const res = await call({ action: "invite", email: r.email, name: r.name, requestId: r.id, requestCreatedAt: r.createdAt });
    if (!res.ok) { say(res.reason === "email" ? "E-mailen i anmodningen er ugyldig." : "Godkendelsen mislykkedes. Prøv igen.", undefined, "info"); return false; }
    replace({ ...r, status: "inviteret", invitedUserId: res.userId, inviteMailId: res.mailId ?? undefined });
    void report(res, r.name, r.email);
    return true;
  };
  const setStatus = async (r: AccessRequest, status: RequestStatus): Promise<boolean> => {
    const res = await call({ action: "status", requestId: r.id, requestCreatedAt: r.createdAt, status });
    if (!res.ok) { say("Kunne ikke gemme. Prøv igen.", undefined, "info"); return false; }
    replace({ ...r, status });
    if (status === "afvist") say(`${r.name} er afvist. Der er ikke sendt nogen mail.`);
    return true;
  };

  return (
    <div>
      <div role="tablist" className="mt-6 flex gap-1 border-b border-slate-200">
        {([["anmodninger", "Anmodninger", count("afventer")], ["inviter", "Invitér direkte", 0]] as const).map(([id, label, n]) => (
          <button key={id} type="button" role="tab" aria-selected={tab === id} onClick={() => setTab(id)}
            className={clsx("-mb-px flex min-h-[46px] items-center gap-1.5 border-b-2 px-3 text-[14px] font-semibold", tab === id ? "border-slate-900 text-slate-900" : "border-transparent text-slate-500 hover:text-slate-800")}>
            {label}{n > 0 && <span className="rounded-full bg-amber-100 px-1.5 text-[12px] tabular-nums text-amber-900">{n}</span>}
          </button>
        ))}
      </div>

      {toast && (
        <div role="status" className={clsx("mt-4 flex flex-wrap items-center gap-3 rounded-xl border px-4 py-3 text-[15px]", toast.tone === "info" ? "border-slate-200 bg-white text-slate-700" : "border-emerald-200 bg-emerald-50 text-emerald-900")}>
          {toast.tone !== "info" && <Check size={17} />} <span className="flex-1">{toast.text}</span>
          {toast.link && <CopyLink link={toast.link} />}
          <button type="button" onClick={() => setToast(null)} className="text-[14px] font-medium underline">Luk</button>
        </div>
      )}

      {tab === "anmodninger" && (
        <>
          <div className="mt-5 flex flex-wrap gap-1.5">
            {([["afventer", "Afventer"], ["godkendt", "Godkendt"], ["afvist", "Afvist"], ["alle", "Alle"]] as const).map(([id, label]) => (
              <button key={id} type="button" onClick={() => setFilter(id)} className={clsx("min-h-[36px] rounded-full px-3.5 text-[13px] font-semibold", filter === id ? "bg-slate-900 text-white" : "bg-white text-slate-600 ring-1 ring-slate-200 hover:ring-slate-300")}>
                {label} <span className="ml-0.5 tabular-nums opacity-60">{count(id)}</span>
              </button>
            ))}
          </div>
          {shown.length === 0 ? (
            <div className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center">
              <p className="text-[16px] font-semibold text-slate-800">{filter === "afventer" ? "Ingen anmodninger venter" : "Intet her"}</p>
              <p className="mt-1 text-[14px] text-slate-500">Nye anmodninger fra nordinvest.io/adgang lander her og på contact@nordinvest.io.</p>
            </div>
          ) : (
            <ul className="mt-4 space-y-3">
              {shown.map((r) => (
                <RequestCard key={r.id} r={r} highlight={focus?.id === r.id}
                  onApprove={() => approve(r)} onReject={() => setStatus(r, "afvist")} onReopen={() => setStatus(r, "ny")} />
              ))}
            </ul>
          )}
        </>
      )}

      {tab === "inviter" && <><InviteForm onInvited={(email, res) => void report(res, email, email)} /><TestMail /></>}

      {confirm && (
        <ConfirmDialog r={confirm.r} action={confirm.action} onClose={() => setConfirm(null)}
          onConfirm={async () => { const ok = confirm.action === "godkend" ? await approve(confirm.r) : await setStatus(confirm.r, "afvist"); if (ok) setConfirm(null); }} />
      )}
    </div>
  );
}

function RequestCard({ r, highlight, onApprove, onReject, onReopen }: { r: AccessRequest; highlight: boolean; onApprove: () => Promise<boolean>; onReject: () => Promise<boolean>; onReopen: () => Promise<boolean> }) {
  const [busy, setBusy] = useState<"godkend" | "afvis" | "genaabn" | null>(null);
  const ref = useRef<HTMLLIElement>(null);
  useEffect(() => { if (highlight) ref.current?.scrollIntoView({ block: "center" }); }, [highlight]);
  const run = async (k: NonNullable<typeof busy>, fn: () => Promise<boolean>) => { setBusy(k); await fn(); setBusy(null); };
  const initials = r.name.trim().split(/\s+/).map((p) => p[0]).slice(0, 2).join("").toUpperCase();
  return (
    <li ref={ref} className={clsx("rounded-2xl border bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)] sm:p-5", highlight ? "border-blue-300 ring-4 ring-blue-50" : "border-slate-200")}>
      <div className="flex flex-wrap items-start gap-3.5">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#17213a] text-[14px] font-semibold text-white">{initials}</span>
        <div className="min-w-0 flex-1">
          <p className="flex flex-wrap items-center gap-2 text-[16px] font-semibold text-slate-900">
            {r.name}
            <span className={clsx("rounded-md px-1.5 py-0.5 text-[12px] font-semibold ring-1", TONE[r.status])}>{REQUEST_STATUS[r.status]}</span>
          </p>
          <p className="mt-0.5 text-[13px] text-slate-500">{new Date(r.createdAt).toLocaleString("da-DK", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Copenhagen" })}</p>
        </div>
        <div className="flex min-w-0 flex-wrap gap-2">
          <a href={`tel:${r.phone.replace(/\s/g, "")}`} className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg border border-slate-200 px-3 text-[14px] font-medium text-slate-700 hover:border-slate-300"><Phone size={14} /> {r.phone}</a>
          <a href={`mailto:${r.email}`} className="inline-flex min-h-[40px] min-w-0 max-w-full items-center gap-1.5 rounded-lg border border-slate-200 px-3 text-[14px] font-medium text-slate-700 hover:border-slate-300"><Mail size={14} className="shrink-0" /> <span className="truncate">{r.email}</span></a>
        </div>
      </div>

      <dl className="mt-4 grid gap-x-6 gap-y-2 border-t border-slate-100 pt-3 text-[14px] sm:grid-cols-2">
        <div className="flex gap-2"><dt className="text-slate-500">Ejer i dag</dt><dd className="font-medium text-slate-800">{r.portfolio}</dd></div>
        <div className="flex gap-2"><dt className="text-slate-500">Leder efter</dt><dd className="font-medium text-slate-800">{r.goals.join(", ") || "Ikke oplyst"}</dd></div>
      </dl>
      {r.message && <p className="mt-3 whitespace-pre-line rounded-lg bg-slate-50 p-3 text-[15px] leading-relaxed text-slate-700">{r.message}</p>}
      {r.adminNote && <p className="mt-2 text-[13px] text-slate-500">Din note: {r.adminNote}</p>}

      <div className="mt-4 flex flex-wrap items-center gap-2">
        {isOpen(r.status) ? (
          <>
            <button type="button" onClick={() => run("godkend", onApprove)} disabled={!!busy} className="inline-flex min-h-[44px] items-center gap-2 rounded-lg bg-emerald-600 px-5 text-[15px] font-semibold text-white shadow-sm hover:bg-emerald-500 active:translate-y-px disabled:opacity-60">
              {busy === "godkend" ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} strokeWidth={2.5} />} Godkend
            </button>
            <button type="button" onClick={() => run("afvis", onReject)} disabled={!!busy} className="inline-flex min-h-[44px] items-center gap-2 rounded-lg border border-slate-300 bg-white px-5 text-[15px] font-semibold text-slate-700 hover:border-rose-300 hover:text-rose-700 active:translate-y-px disabled:opacity-60">
              {busy === "afvis" ? <Loader2 size={16} className="animate-spin" /> : <X size={16} strokeWidth={2.5} />} Afvis
            </button>
            <span className="text-[13px] text-slate-500">Godkender du, får {r.name.split(" ")[0]} straks en mail med sit login.</span>
          </>
        ) : r.status === "inviteret" ? (
          <>
            <span className="inline-flex items-center gap-1.5 text-[14px] font-medium text-emerald-700"><Check size={15} /> Godkendt, og mailen med login er sendt</span>
            {r.invitedUserId && <Link href={`/app/admin/medlemmer/${r.invitedUserId}`} className="ml-auto inline-flex min-h-[40px] items-center gap-1 text-[14px] font-semibold text-blue-700 hover:underline">Se profil <ArrowRight size={14} /></Link>}
          </>
        ) : (
          <>
            <span className="text-[14px] text-slate-500">Afvist. Der er ikke sendt nogen mail.</span>
            <button type="button" onClick={() => run("genaabn", onReopen)} disabled={!!busy} className="ml-auto inline-flex min-h-[40px] items-center gap-1.5 rounded-lg px-3 text-[14px] font-semibold text-slate-600 hover:bg-slate-50">
              {busy === "genaabn" ? <Loader2 size={14} className="animate-spin" /> : <RotateCcw size={14} />} Fortryd
            </button>
          </>
        )}
      </div>
    </li>
  );
}

function ConfirmDialog({ r, action, onClose, onConfirm }: { r: AccessRequest; action: "godkend" | "afvis"; onClose: () => void; onConfirm: () => Promise<void> }) {
  const [busy, setBusy] = useState(false);
  const approve = action === "godkend";
  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.key === "Escape" && !busy) onClose(); };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [busy, onClose]);
  return (
    <div className="fixed inset-0 z-[900] flex items-end justify-center bg-slate-950/50 p-4 sm:items-center" onClick={() => !busy && onClose()}>
      <div role="dialog" aria-modal="true" aria-labelledby="confirm-title" onClick={(e) => e.stopPropagation()} className="w-full max-w-[440px] rounded-2xl bg-white p-6 shadow-[0_30px_80px_-20px_rgba(2,6,23,0.5)]">
        <span className={clsx("flex h-11 w-11 items-center justify-center rounded-full", approve ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600")}>{approve ? <Check size={20} strokeWidth={2.5} /> : <X size={20} strokeWidth={2.5} />}</span>
        <h2 id="confirm-title" className="mt-4 text-[20px] font-semibold tracking-[-0.01em] text-slate-900">{approve ? `Godkend ${r.name}?` : `Afvis ${r.name}?`}</h2>
        <p className="mt-1.5 text-[15px] leading-relaxed text-slate-600">
          {approve ? <>{r.email} får en mail om, at de er godkendt, med et personligt link til at logge ind første gang.</> : <>Anmodningen markeres som afvist. Der sendes ingen mail, og du kan fortryde bagefter.</>}
        </p>
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button type="button" onClick={onClose} disabled={busy} className="min-h-[46px] rounded-lg px-4 text-[15px] font-semibold text-slate-600 hover:bg-slate-50">Annullér</button>
          <button type="button" autoFocus disabled={busy} onClick={async () => { setBusy(true); await onConfirm(); setBusy(false); }}
            className={clsx("inline-flex min-h-[46px] items-center justify-center gap-2 rounded-lg px-5 text-[15px] font-semibold text-white disabled:opacity-60", approve ? "bg-emerald-600 hover:bg-emerald-500" : "bg-rose-600 hover:bg-rose-500")}>
            {busy && <Loader2 size={16} className="animate-spin" />}{approve ? "Ja, godkend" : "Ja, afvis"}
          </button>
        </div>
      </div>
    </div>
  );
}

function InviteForm({ onInvited }: { onInvited: (email: string, res: { sent?: boolean; mailId?: string | null; link?: string; error?: string }) => void }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [note, setNote] = useState("");
  const [kind, setKind] = useState<InviteCopyKind>("member");
  // The mail text starts as the default for the chosen access and follows the
  // choice until Nikolaj edits it; after that his text stays.
  const [text, setText] = useState(DEFAULT_INVITE_TEXT.member);
  const [edited, setEdited] = useState(false);
  const pick = (k: InviteCopyKind) => { setKind(k); if (!edited) setText(DEFAULT_INVITE_TEXT[k]); };
  const reset = () => { setText(DEFAULT_INVITE_TEXT[kind]); setEdited(false); };
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true); setErr(null);
    const res = await call({ action: "invite", email, name, note, kind, message: text });
    setBusy(false);
    if (res.ok) { onInvited(email, res); setName(""); setEmail(""); setNote(""); setText(DEFAULT_INVITE_TEXT[kind]); setEdited(false); }
    else setErr(res.reason === "email" ? "Skriv en gyldig e-mail." : "Invitationen mislykkedes. Prøv igen.");
  };
  const input = "mt-1.5 h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-[16px] focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-100";
  return (
    <form onSubmit={submit} className="mt-5 max-w-xl rounded-2xl border border-slate-200 bg-white p-5">
      <p className="text-[15px] text-slate-600">Giv adgang uden en anmodning. Personen får en mail med et personligt link, der ikke udløber.</p>
      <div className="mt-4 flex flex-wrap gap-2" role="radiogroup" aria-label="Type adgang">
        {([["member", "Medlem", "Hele platformen"], ["maegler", "Ejendomsmægler", "Kun mæglerværktøjet"], ["begge", "Begge", "Platformen og mæglerværktøjet"]] as const).map(([k, t, d]) => (
          <button key={k} type="button" role="radio" aria-checked={kind === k} onClick={() => pick(k)}
            className={`min-h-[44px] rounded-lg border px-3.5 py-1.5 text-left text-[14px] ${kind === k ? "border-blue-600 bg-blue-50 text-blue-900" : "border-slate-300 bg-white text-slate-700"}`}>
            <span className="block font-semibold">{t}</span><span className="block text-[12px] text-slate-500">{d}</span>
          </button>
        ))}
      </div>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div><label htmlFor="inv-name" className="text-[14px] font-medium text-slate-700">Navn</label><input id="inv-name" value={name} onChange={(e) => setName(e.target.value)} className={input} /></div>
        <div><label htmlFor="inv-mail" className="text-[14px] font-medium text-slate-700">E-mail</label><input id="inv-mail" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className={input} /></div>
      </div>
      <div className="mt-4"><label htmlFor="inv-note" className="text-[14px] font-medium text-slate-700">Intern note (pris, aftale)</label><input id="inv-note" value={note} onChange={(e) => setNote(e.target.value)} className={input} /><p className="mt-1 text-[12px] text-slate-500">Kun til dig. Modtageren ser den ikke.</p></div>
      <div className="mt-4">
        <div className="flex items-baseline justify-between gap-3">
          <label htmlFor="inv-text" className="text-[14px] font-medium text-slate-700">Tekst i mailen</label>
          {edited && <button type="button" onClick={reset} className="text-[13px] font-semibold text-blue-700 hover:underline">Brug standardteksten</button>}
        </div>
        <p className="mt-0.5 text-[12px] text-slate-500">Mailen starter med &quot;Hej {name.trim().split(/\s+/)[0] || "fornavn"},&quot; og slutter med knappen, linket og din hilsen. En tom linje giver et nyt afsnit.</p>
        <textarea id="inv-text" value={text} maxLength={INVITE_TEXT_MAX} rows={11} onChange={(e) => { setText(e.target.value); setEdited(true); }}
          className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-[16px] leading-relaxed focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-100" />
      </div>
      {err && <p role="alert" className="mt-3 text-[14px] font-medium text-rose-600">{err}</p>}
      <button type="submit" disabled={busy} className="mt-5 inline-flex min-h-[46px] items-center gap-2 rounded-lg bg-blue-600 px-5 text-[15px] font-semibold text-white hover:bg-blue-500 disabled:opacity-60">{busy ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />} Send invitation</button>
    </form>
  );
}

/** Sends the approval mail exactly as applicants get it, without creating an account, and follows its delivery. */
function TestMail() {
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true); setMsg("Sender …");
    const res = await call({ action: "testmail", email });
    if (!res.ok || !res.mailId) { setBusy(false); return setMsg(`Testmailen kunne ikke sendes${res.error ? ` (${res.error})` : ""}.`); }
    setMsg("Sendt. Venter på modtagerens mailserver …");
    for (let i = 0; i < 20; i++) {
      await new Promise((ok) => setTimeout(ok, 3000));
      const st = await call({ action: "mailstatus", mailId: res.mailId });
      if (st.status && st.status !== "sendt") { setBusy(false); return setMsg(st.status === "leveret" ? "Leveret. Tjek, om den ligger i indbakken eller i spam." : `Status: ${st.status}.`); }
    }
    setBusy(false); setMsg("Sendt, men endnu ikke bekræftet af modtagerens mailserver.");
  };
  return (
    <form onSubmit={send} className="mt-5 max-w-xl rounded-2xl border border-slate-200 bg-white p-5">
      <p className="text-[15px] font-semibold text-slate-900">Test godkendelsesmailen</p>
      <p className="mt-1 text-[14px] text-slate-600">Sender mailen præcis, som en ansøger får den, uden at oprette en konto. Brug fx din egen Gmail eller en adresse fra mail-tester.com.</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <label htmlFor="test-mail" className="sr-only">E-mail til testmailen</label>
        <input id="test-mail" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="din@mail.dk" className="h-11 min-w-0 flex-1 rounded-lg border border-slate-300 bg-white px-3 text-[16px] focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-100" />
        <button type="submit" disabled={busy} className="inline-flex min-h-[44px] items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 text-[15px] font-semibold text-slate-800 hover:bg-slate-50 disabled:opacity-60">{busy ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />} Send testmail</button>
      </div>
      {msg && <p role="status" className="mt-2 text-[14px] text-slate-700">{msg}</p>}
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
