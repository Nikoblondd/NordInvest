"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Bell, Building2, Calculator, Check, FileText, Gavel, KeyRound, ListChecks, Loader2, Mail, Phone, Send, ShieldCheck, UserMinus, UserPlus } from "lucide-react";
import { clsx } from "@/lib/clsx";
import { STAGE_LABEL } from "@/lib/mappe/checklist";
import type { MemberDetail } from "@/lib/admin/members";
import { AccessBadge, Avatar, PipelineBar, STAGE_BAR, STAGE_ORDER, ago, dateDk, tourLabel } from "./bits";

/*
 * Admin: one member. Who they are, how they use NordInvest (analyses over
 * time, pipeline, tasks, documents, bids, watches) and the actions an admin
 * can take on the account.
 */

const kr = (n: number | null) => (n == null ? "–" : `${Math.round(n).toLocaleString("da-DK")} kr`);

async function call(body: Record<string, unknown>) {
  const r = await fetch("/api/admin/access", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  return (await r.json().catch(() => ({ ok: false }))) as { ok: boolean; reason?: string };
}

export function MemberProfile({ m, self }: { m: MemberDetail; self: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [ask, setAsk] = useState<null | "revoke" | "admin" | "unadmin">(null);
  const [msg, setMsg] = useState<{ text: string; bad?: boolean } | null>(null);
  const [all, setAll] = useState(false);

  const act = async (key: string, body: Record<string, unknown>, ok: string) => {
    setBusy(key); setMsg(null);
    const res = await call(body);
    setBusy(null); setAsk(null);
    if (res.ok) { setMsg({ text: ok }); router.refresh(); }
    else setMsg({ text: res.reason === "admin" ? "Ejerkontoen kan ikke ændres her." : res.reason === "self" ? "Du kan ikke fjerne din egen administratorrolle." : "Det lykkedes ikke. Prøv igen.", bad: true });
  };
  const sendLink = async () => {
    setBusy("link"); setMsg(null);
    await fetch("/api/auth/link", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: m.email }) }).catch(() => null);
    setBusy(null);
    setMsg({ text: `Et login-link er sendt til ${m.email}.` });
  };

  const saved = m.properties.filter((p) => p.saved);
  const loose = m.properties.length - saved.length;
  const maxWeek = Math.max(1, ...m.weekly);
  const tiles: [string, string | number, string, typeof Calculator][] = [
    ["Analyser", m.analyses, `${m.analyses30} de sidste 30 dage`, Calculator],
    ["Boliger i pipeline", m.saved, loose ? `+ ${loose} analyser, der ikke er gemt` : "alle analyser er gemt", Building2],
    ["Opgaver", m.tasksOpen + m.tasksDone, `${m.tasksOpen} åbne, ${m.tasksDone} løst`, ListChecks],
    ["Papirer gennemgået", m.docs, "med AI-gennemgang", FileText],
    ["Bud", m.offers, m.offers ? "boliger med bud" : "ingen bud endnu", Gavel],
    ["Deal-vagter", m.watches, m.watches ? "boliger overvåges" : "ingen vagter", Bell],
  ];

  return (
    <div className="mx-auto max-w-[1120px] px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
      <Link href="/app/admin/medlemmer" className="inline-flex min-h-[40px] items-center gap-1.5 text-[14px] font-medium text-slate-500 hover:text-slate-900"><ArrowLeft size={15} /> Alle medlemmer</Link>

      <div className="mt-2 flex flex-wrap items-start gap-4">
        <Avatar m={m} size={56} />
        <div className="min-w-0 flex-1 basis-[220px]">
          <h1 className="flex flex-wrap items-center gap-2.5 text-[26px] font-semibold leading-tight tracking-[-0.025em] text-slate-900 sm:text-[30px]">
            {m.name || m.email.split("@")[0]} <AccessBadge access={m.access} alsoBroker={m.alsoBroker} />
          </h1>
          <p className="mt-1 text-[15px] text-slate-500">{m.access === "member" || m.access === "broker" || m.access === "admin" ? `Medlem siden ${dateDk(m.invitedAt ?? m.createdAt)}` : `Konto siden ${dateDk(m.createdAt)}`} · senest aktiv {ago(m.lastActive).toLowerCase()}</p>
        </div>
        <div className="flex w-full flex-wrap gap-2 sm:w-auto">
          {m.phone && <a href={`tel:${m.phone.replace(/\s/g, "")}`} className="inline-flex min-h-[42px] items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 text-[14px] font-semibold text-slate-700 hover:border-slate-300"><Phone size={15} /> Ring</a>}
          <a href={`mailto:${m.email}`} className="inline-flex min-h-[42px] items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 text-[14px] font-semibold text-slate-700 hover:border-slate-300"><Mail size={15} /> Skriv</a>
        </div>
      </div>

      {msg && <p role="status" className={clsx("mt-4 flex items-center gap-2 rounded-xl border px-4 py-3 text-[15px]", msg.bad ? "border-rose-200 bg-rose-50 text-rose-800" : "border-emerald-200 bg-emerald-50 text-emerald-900")}>{!msg.bad && <Check size={16} />}{msg.text}</p>}

      <div className="mt-6 grid grid-cols-1 gap-5 lg:grid-cols-[1fr_320px]">
        <div className="min-w-0 space-y-5">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {tiles.map(([label, n, sub, Icon]) => (
              <div key={label} className="rounded-2xl border border-slate-200 bg-white p-4">
                <p className="flex items-center gap-1.5 text-[13px] font-medium text-slate-500"><Icon size={14} className="text-slate-400" /> {label}</p>
                <p className="mt-1 text-[26px] font-semibold tabular-nums tracking-[-0.02em] text-slate-900">{n}</p>
                <p className="text-[13px] text-slate-500">{sub}</p>
              </div>
            ))}
          </div>

          <section className="rounded-2xl border border-slate-200 bg-white p-5">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="text-[16px] font-semibold text-slate-900">Analyser pr. uge</h2>
              <span className="text-[13px] text-slate-500">De sidste 12 uger</span>
            </div>
            <div className="mt-5 flex h-[120px] items-end gap-1.5 sm:gap-2.5">
              {m.weekly.map((v, i) => (
                <div key={i} className="flex h-full flex-1 flex-col items-center justify-end gap-1.5">
                  {v > 0 && <span className="text-[12px] font-semibold tabular-nums text-slate-700">{v}</span>}
                  <span className={clsx("w-full max-w-[34px] rounded-t-md", v ? (i === 11 ? "bg-blue-600" : "bg-blue-400") : "bg-slate-100")} style={{ height: v ? `${Math.max(6, (v / maxWeek) * 92)}%` : 4 }} />
                </div>
              ))}
            </div>
            <div className="mt-2 flex justify-between text-[12px] text-slate-400"><span>For 12 uger siden</span><span>Denne uge</span></div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
              <h2 className="text-[16px] font-semibold text-slate-900">Boliger</h2>
              <div className="flex w-full max-w-[280px] items-center gap-3"><PipelineBar pipeline={m.pipeline} /></div>
            </div>
            {saved.length > 0 && (
              <div className="flex flex-wrap gap-x-4 gap-y-1.5 border-b border-slate-100 px-5 py-3 text-[13px] text-slate-600">
                {STAGE_ORDER.filter((s) => m.pipeline[s]).map((s) => <span key={s} className="flex items-center gap-1.5"><span className={clsx("h-2.5 w-2.5 rounded-full", STAGE_BAR[s])} />{STAGE_LABEL[s]} <b className="font-semibold tabular-nums text-slate-900">{m.pipeline[s]}</b></span>)}
              </div>
            )}
            {m.properties.length === 0 ? (
              <p className="px-5 py-10 text-center text-[15px] text-slate-500">Ingen analyser eller boliger endnu.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[620px] text-left text-[14px]">
                  <thead className="text-[12px] font-semibold uppercase tracking-[0.04em] text-slate-500">
                    <tr><th className="px-5 py-2.5 font-semibold">Adresse</th><th className="px-3 py-2.5 font-semibold">Fase</th><th className="px-3 py-2.5 text-right font-semibold">Pris</th><th className="px-3 py-2.5 text-right font-semibold">Score</th><th className="px-3 py-2.5 text-right font-semibold">Opgaver</th><th className="px-5 py-2.5 text-right font-semibold">Oprettet</th></tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {(all ? m.properties : m.properties.slice(0, 15)).map((p) => (
                      <tr key={p.id}>
                        <td className="max-w-[260px] truncate px-5 py-3 font-medium text-slate-900" title={p.address}>{p.address}</td>
                        <td className="whitespace-nowrap px-3 py-3">{p.saved ? <span className="inline-flex items-center gap-1.5"><span className={clsx("h-2 w-2 rounded-full", STAGE_BAR[p.stage])} />{STAGE_LABEL[p.stage]}{p.offer != null && <span className="text-slate-500">· bud {kr(p.offer)}</span>}</span> : <span className="text-slate-400">Ikke gemt</span>}</td>
                        <td className="whitespace-nowrap px-3 py-3 text-right tabular-nums text-slate-700">{kr(p.price)}</td>
                        <td className="px-3 py-3 text-right tabular-nums text-slate-700">{p.score ?? "–"}</td>
                        <td className="whitespace-nowrap px-3 py-3 text-right tabular-nums text-slate-600">{p.tasksOpen + p.tasksDone ? `${p.tasksDone}/${p.tasksOpen + p.tasksDone}` : "–"}</td>
                        <td className="whitespace-nowrap px-5 py-3 text-right text-slate-500">{dateDk(p.createdAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {!all && m.properties.length > 15 && (
                  <button type="button" onClick={() => setAll(true)} className="min-h-[46px] w-full border-t border-slate-100 text-[14px] font-semibold text-blue-700 hover:bg-slate-50">Vis alle {m.properties.length}</button>
                )}
              </div>
            )}
          </section>

          {(m.watchList.length > 0 || m.feedbackList.length > 0) && (
            <div className="grid gap-5 md:grid-cols-2">
              {m.watchList.length > 0 && (
                <section className="rounded-2xl border border-slate-200 bg-white p-5">
                  <h2 className="text-[16px] font-semibold text-slate-900">Deal-vagter</h2>
                  <ul className="mt-3 divide-y divide-slate-100 text-[14px]">
                    {m.watchList.map((w) => <li key={w.id} className="flex items-center justify-between gap-3 py-2.5"><span className="min-w-0 truncate text-slate-800">{w.address}</span><span className="shrink-0 text-[13px] text-slate-500">{w.alert ? "Ny ændring" : w.status}</span></li>)}
                  </ul>
                </section>
              )}
              {m.feedbackList.length > 0 && (
                <section className="rounded-2xl border border-slate-200 bg-white p-5">
                  <h2 className="text-[16px] font-semibold text-slate-900">Feedback på analyser</h2>
                  <ul className="mt-3 divide-y divide-slate-100 text-[14px]">
                    {m.feedbackList.map((f) => <li key={f.id} className="py-2.5"><span className="font-semibold text-slate-900">{f.rating ?? "–"}/5</span> <span className="text-slate-500">· {dateDk(f.createdAt)}</span>{f.comment && <p className="mt-0.5 text-slate-700">{f.comment}</p>}</li>)}
                  </ul>
                </section>
              )}
            </div>
          )}
        </div>

        <aside className="space-y-5">
          <section className="rounded-2xl border border-slate-200 bg-white p-5">
            <h2 className="text-[16px] font-semibold text-slate-900">Profil</h2>
            <dl className="mt-3 space-y-2.5 text-[14px]">
              {([
                ["E-mail", m.email],
                ["Telefon", m.phone || "Ikke oplyst"],
                ["Login med", m.provider],
                ["Konto oprettet", dateDk(m.createdAt)],
                ["Godkendt", m.invitedAt ? dateDk(m.invitedAt) : m.access === "admin" ? "Administrator" : "–"],
                ["Første login", m.onboarded ? "Gennemført" : "Ikke endnu"],
                ["Senest logget ind", ago(m.lastSignIn)],
                ["Guiden", tourLabel(m.tour)],
                ...(m.plan ? [["Gammelt abonnement", m.plan] as [string, string]] : []),
                ...(m.note ? [["Note", m.note] as [string, string]] : []),
              ] as [string, string][]).map(([k, v]) => (
                <div key={k} className="flex justify-between gap-3"><dt className="shrink-0 text-slate-500">{k}</dt><dd className="min-w-0 break-words text-right font-medium text-slate-800">{v}</dd></div>
              ))}
            </dl>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5">
            <h2 className="text-[16px] font-semibold text-slate-900">Handlinger</h2>
            <div className="mt-3 space-y-2">
              {(m.access === "member" || m.access === "broker" || m.access === "admin") && (
                <button type="button" onClick={sendLink} disabled={!!busy} className="flex min-h-[44px] w-full items-center gap-2.5 rounded-lg border border-slate-200 px-3.5 text-[14px] font-semibold text-slate-700 hover:border-slate-300 disabled:opacity-60">
                  {busy === "link" ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} className="text-slate-400" />} Send login-link
                </button>
              )}
              {m.access === "member" && (ask === "admin" ? (
                <Confirm text="Giv fuld administratoradgang? De kan godkende anmodninger og se alle medlemmer." yes="Ja, gør til administrator" busy={busy === "admin"} onYes={() => act("admin", { action: "role", userId: m.id, role: "admin" }, "Er nu administrator.")} onNo={() => setAsk(null)} />
              ) : (
                <button type="button" onClick={() => setAsk("admin")} disabled={!!busy} className="flex min-h-[44px] w-full items-center gap-2.5 rounded-lg border border-slate-200 px-3.5 text-[14px] font-semibold text-slate-700 hover:border-slate-300"><ShieldCheck size={16} className="text-slate-400" /> Gør til administrator</button>
              ))}
              {m.access === "admin" && !m.ownerAdmin && !self && (ask === "unadmin" ? (
                <Confirm text="Fjern administratorrollen? Personen beholder sin adgang som medlem." yes="Ja, fjern rollen" busy={busy === "unadmin"} onYes={() => act("unadmin", { action: "role", userId: m.id, role: "member" }, "Er nu medlem uden administratoradgang.")} onNo={() => setAsk(null)} danger />
              ) : (
                <button type="button" onClick={() => setAsk("unadmin")} disabled={!!busy} className="flex min-h-[44px] w-full items-center gap-2.5 rounded-lg border border-slate-200 px-3.5 text-[14px] font-semibold text-slate-700 hover:border-slate-300"><KeyRound size={16} className="text-slate-400" /> Fjern administratorrolle</button>
              ))}
              {(m.access === "member" || m.access === "broker") && (ask === "revoke" ? (
                <Confirm text="Fjern adgangen? Personen kan ikke længere logge ind i NordInvest. Data bevares." yes="Ja, fjern adgang" busy={busy === "revoke"} onYes={() => act("revoke", { action: "revoke", userId: m.id }, "Adgangen er fjernet.")} onNo={() => setAsk(null)} danger />
              ) : (
                <button type="button" onClick={() => setAsk("revoke")} disabled={!!busy} className="flex min-h-[44px] w-full items-center gap-2.5 rounded-lg px-3.5 text-[14px] font-semibold text-rose-700 hover:bg-rose-50"><UserMinus size={16} /> Fjern adgang</button>
              ))}
              {(m.access === "revoked" || m.access === "none") && (
                <button type="button" onClick={() => act("restore", { action: "restore", userId: m.id }, "Har nu adgang.")} disabled={!!busy} className="flex min-h-[44px] w-full items-center gap-2.5 rounded-lg bg-emerald-600 px-3.5 text-[14px] font-semibold text-white hover:bg-emerald-500 disabled:opacity-60">
                  {busy === "restore" ? <Loader2 size={16} className="animate-spin" /> : <UserPlus size={16} />} Giv adgang
                </button>
              )}
              {m.ownerAdmin && <p className="pt-1 text-[13px] text-slate-500">Ejerkonto. Rollen styres i opsætningen og kan ikke ændres her.</p>}
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}

function Confirm({ text, yes, busy, onYes, onNo, danger }: { text: string; yes: string; busy: boolean; onYes: () => void; onNo: () => void; danger?: boolean }) {
  return (
    <div className={clsx("rounded-lg border p-3", danger ? "border-rose-200 bg-rose-50" : "border-slate-200 bg-slate-50")}>
      <p className="text-[14px] text-slate-700">{text}</p>
      <div className="mt-2.5 flex flex-wrap gap-2">
        <button type="button" onClick={onYes} disabled={busy} className={clsx("inline-flex min-h-[40px] items-center gap-1.5 rounded-lg px-3 text-[14px] font-semibold text-white disabled:opacity-60", danger ? "bg-rose-600 hover:bg-rose-500" : "bg-slate-900 hover:bg-slate-800")}>{busy && <Loader2 size={14} className="animate-spin" />}{yes}</button>
        <button type="button" onClick={onNo} disabled={busy} className="min-h-[40px] px-2 text-[14px] font-medium text-slate-600">Annullér</button>
      </div>
    </div>
  );
}
