"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Bell, BellOff, Clock, Loader2, Mail, MailX, Pause, Pencil, Play, Plus, Radar, RefreshCw, Trash2 } from "lucide-react";
import { clsx } from "@/lib/clsx";
import { MAX_AGENTS, STRATEGIES, criteriaChips, perRunOf, scheduleLabel, strategyOf, whenLabel, type Agent, type Hit, type HitStatus } from "@/lib/app/agents";
import { saveHitToPipeline } from "@/lib/app/pipeline";
import { AgentEditor, type AgentInput } from "./AgentEditor";
import { HitCard } from "./HitCard";
import { Card, Empty, Segmented, Toast, Toggle, btn } from "../ui";

/*
 * Søgeagenter: the member's own agents on the market. The list shows each
 * agent with its criteria, when it runs next and what is new; an agent opens
 * to everything it has found, where a listing goes into the pipeline with one
 * press. Changes are saved at once.
 */

async function call(method: "POST" | "PATCH" | "DELETE", body?: unknown, id?: string) {
  const r = await fetch(`/api/app/agents${id ? `?id=${encodeURIComponent(id)}` : ""}`, { method, headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined }).catch(() => null);
  return (r ? await r.json().catch(() => null) : null) as { ok: boolean; agent?: Agent; reason?: string } | null;
}

/** Saves a found listing to the pipeline and marks it on the agent. */
export function useHitActions(agentFor: (h: Hit) => Agent | undefined, update: (a: Agent) => void) {
  const [busy, setBusy] = useState<string | null>(null);
  const [toast, setToast] = useState<{ text: string; tone?: "bad"; href?: string } | null>(null);
  const mark = async (a: Agent, h: Hit, status: HitStatus, savedId?: string) => {
    update({ ...a, hits: a.hits.map((x) => (x.id === h.id ? { ...x, status, ...(savedId ? { savedId } : {}) } : x)) });
    const res = await call("PATCH", { id: a.id, hit: { id: h.id, status, savedId } });
    if (!res?.ok) setToast({ text: "Kunne ikke gemme ændringen.", tone: "bad" });
  };
  const save = async (h: Hit) => {
    const a = agentFor(h);
    if (!a) return;
    setBusy(h.id);
    const id = await saveHitToPipeline(h, "screening", a.name);
    setBusy(null);
    if (!id) return setToast({ text: "Boligen kunne ikke gemmes. Prøv igen.", tone: "bad" });
    await mark(a, h, "gemt", id);
    setToast({ text: `${h.road} er gemt i din pipeline.`, href: `/app/ejendomme/${id}` });
  };
  return { busy, toast, setToast, save, mark };
}

export function AgentsHome({ initial, prefill }: { initial: Agent[]; prefill: Partial<AgentInput> | null }) {
  const router = useRouter();
  const [agents, setAgents] = useState(initial);
  const [editor, setEditor] = useState<{ agent?: Agent; prefill?: Partial<AgentInput> } | null>(prefill ? { prefill } : null);
  const update = (a: Agent) => setAgents((all) => all.map((x) => (x.id === a.id ? a : x)));
  const hits = useMemo(() => agents.flatMap((a) => a.hits.filter((h) => h.status === "ny").map((h) => ({ a, h }))).sort((x, y) => y.h.foundAt.localeCompare(x.h.foundAt)), [agents]);
  const actions = useHitActions((h) => agents.find((a) => a.hits.some((x) => x.id === h.id)), update);

  // The prefilled form came from the Deal-motor: drop it from the address.
  useEffect(() => { if (prefill) window.history.replaceState(null, "", "/app/find/agenter"); }, [prefill]);

  const create = async (input: AgentInput): Promise<string | null> => {
    const res = await call("POST", input);
    if (!res?.ok || !res.agent) return res?.reason === "max" ? `Du kan have op til ${MAX_AGENTS} agenter. Slet en, du ikke bruger.` : "Agenten kunne ikke oprettes. Prøv igen.";
    setAgents((all) => [res.agent!, ...all]);
    router.push(`/app/find/agenter/${res.agent.id}`);
    return null;
  };

  return (
    <div className="mt-6">
      {agents.length === 0 ? (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
          <div className="grid grid-cols-1 gap-6 p-6 sm:p-8 lg:grid-cols-[1fr_1fr] lg:items-center">
            <div className="order-2 lg:order-1">
              <h2 className="text-[24px] font-semibold tracking-[-0.02em] text-slate-900">Søgeagenter</h2>
              <p className="mt-2 max-w-md text-[15px] leading-relaxed text-slate-600">En søgeagent gennemgår hele markedet efter dine kriterier på de tidspunkter, du vælger, og sender en mail, når en ny bolig matcher.</p>
              <button type="button" onClick={() => setEditor({})} className={clsx(btn.primary, "mt-5")}><Plus size={16} /> Opret din første agent</button>
            <ol className="mt-6 space-y-2.5">
              {[["Kriterier", "Område, type, pris og minimumskrav til nøgletallene."], ["Tidspunkt", "Hver morgen kl. 7, på hverdage eller en gang om ugen."], ["Besked", "Mail ved nye fund, som kan gemmes i pipelinen med ét klik."]].map(([t, d], i) => (
                <li key={t} className="flex gap-3 rounded-xl bg-slate-50 p-3.5">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white text-[13px] font-bold text-blue-700 ring-1 ring-blue-100">{i + 1}</span>
                  <span><span className="block text-[14px] font-semibold text-slate-900">{t}</span><span className="block text-[13px] text-slate-500">{d}</span></span>
                </li>
              ))}
            </ol>
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/app/il-agent.jpg" alt="Illustration af en søgeagent, der scanner byens boliger" className="order-1 mx-auto w-full max-w-[460px] lg:order-2" />
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_400px]">
          <div className="min-w-0">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-[16px] font-semibold text-slate-900">Dine agenter <span className="font-medium text-slate-400">{agents.length}</span></h2>
              <button type="button" onClick={() => setEditor({})} className={btn.primary} disabled={agents.length >= MAX_AGENTS}><Plus size={16} /> Ny agent</button>
            </div>
            <ul className="mt-3 space-y-3">
              {agents.map((a) => <AgentRow key={a.id} a={a} onChange={update} />)}
            </ul>
          </div>
          <Card title={<span className="flex items-center gap-2">Nyt fra dine agenter {hits.length > 0 && <span className="rounded-full bg-blue-600 px-1.5 text-[12px] font-bold text-white">{hits.length}</span>}</span>} pad={false} className="h-fit xl:sticky xl:top-20">
            {hits.length === 0 ? (
              <Empty icon={<Bell size={20} />} title="Ingen nye fund" text="Nye fund fra dine agenter vises her og sendes på mail." />
            ) : (
              <div className="max-h-[70vh] space-y-2 overflow-y-auto p-3">
                {hits.slice(0, 20).map(({ a, h }) => (
                  <div key={`${a.id}:${h.id}`}>
                    <p className="mb-1 px-1 text-[12px] font-medium text-slate-500">{a.name}</p>
                    <HitCard h={h} compact busy={actions.busy === h.id} onSave={() => actions.save(h)} onDismiss={() => actions.mark(a, h, "afvist")} />
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      )}
      <AgentEditor open={!!editor} onClose={() => setEditor(null)} initial={editor?.prefill ?? null} onSave={create} title="Ny søgeagent" />
      {actions.toast && <Toast text={actions.toast.text} tone={actions.toast.tone} onClose={() => actions.setToast(null)} action={actions.toast.href ? <Link href={actions.toast.href} className="shrink-0 font-semibold text-blue-300 hover:underline">Åbn</Link> : undefined} />}
    </div>
  );
}

function AgentRow({ a, onChange }: { a: Agent; onChange: (a: Agent) => void }) {
  const fresh = a.hits.filter((h) => h.status === "ny").length;
  const [busy, setBusy] = useState(false);
  const toggle = async (active: boolean) => {
    setBusy(true);
    const res = await call("PATCH", { id: a.id, active });
    setBusy(false);
    if (res?.ok && res.agent) onChange(res.agent);
  };
  return (
    <li className={clsx("rounded-2xl border bg-white p-4 transition-shadow hover:shadow-[0_8px_24px_-14px_rgba(15,23,42,0.25)] sm:p-5", a.active ? "border-slate-200" : "border-dashed border-slate-300")}>
      <div className="flex items-start gap-3">
        <span className={clsx("relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl", a.active ? "bg-blue-50 text-blue-700" : "bg-slate-100 text-slate-400")}>
          <Radar size={19} />
          {a.active && <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-white" aria-hidden />}
        </span>
        <Link href={`/app/find/agenter/${a.id}`} className="min-w-0 flex-1">
          <p className="flex flex-wrap items-center gap-2 text-[16px] font-semibold text-slate-900 hover:text-blue-700">
            {a.name}
            {fresh > 0 && <span className="rounded-full bg-blue-600 px-2 py-0.5 text-[12px] font-bold text-white">{fresh} {fresh === 1 ? "ny" : "nye"}</span>}
            {!a.active && <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[12px] font-semibold text-slate-600">På pause</span>}
          </p>
          <p className="mt-1 flex flex-wrap gap-1.5">
            {criteriaChips(a.criteria).map((c) => <span key={c} className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[12px] font-medium text-slate-600">{c}</span>)}
          </p>
          <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-slate-500">
            <span className="inline-flex items-center gap-1"><Clock size={13} /> {scheduleLabel(a.schedule)}</span>
            {a.active && <span>Næste: {whenLabel(a.nextRunAt)}</span>}
            <span className="inline-flex items-center gap-1">{a.email ? <><Mail size={13} /> Mail slået til</> : <><MailX size={13} /> Ingen mail</>}</span>
            <span>{a.hits.filter((h) => h.status !== "afvist").length} fundet</span>
          </p>
        </Link>
        <Toggle on={a.active} onChange={toggle} disabled={busy} label={a.active ? `Sæt ${a.name} på pause` : `Start ${a.name}`} />
      </div>
    </li>
  );
}

type Filter = "nye" | "alle" | "gemt" | "afvist";

export function AgentDetail({ initial }: { initial: Agent }) {
  const router = useRouter();
  const [a, setA] = useState(initial);
  const [filter, setFilter] = useState<Filter>(initial.hits.some((h) => h.status === "ny") ? "nye" : "alle");
  const [editing, setEditing] = useState(false);
  const [running, setRunning] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const actions = useHitActions(() => a, setA);

  const counts = {
    nye: a.hits.filter((h) => h.status === "ny").length,
    alle: a.hits.filter((h) => h.status !== "afvist").length,
    gemt: a.hits.filter((h) => h.status === "gemt").length,
    afvist: a.hits.filter((h) => h.status === "afvist").length,
  };
  const [order, setOrder] = useState<"match" | "nyeste">("match");
  const shown = a.hits.filter((h) => (filter === "nye" ? h.status === "ny" : filter === "alle" ? h.status !== "afvist" : h.status === filter))
    .sort((x, y) => (order === "match" ? (y.fit ?? y.score) - (x.fit ?? x.score) : y.foundAt.localeCompare(x.foundAt)));

  const patch = async (body: Record<string, unknown>) => {
    const res = await call("PATCH", { id: a.id, ...body });
    if (res?.ok && res.agent) { setA(res.agent); return null; }
    return "Kunne ikke gemme. Prøv igen.";
  };
  const runNow = async () => {
    setRunning(true);
    const r = await fetch("/api/app/agents/run", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: a.id }) }).then((x) => x.json()).catch(() => null);
    setRunning(false);
    if (r?.agent) setA(r.agent);
    actions.setToast(r?.ok ? { text: r.fresh ? `${r.fresh} ${r.fresh === 1 ? "ny bolig" : "nye boliger"} fundet.` : "Ingen nye boliger siden sidst." } : { text: "Agenten kunne ikke køre lige nu.", tone: "bad" });
    if (r?.fresh) setFilter("nye");
  };
  const remove = async () => {
    const res = await call("DELETE", undefined, a.id);
    if (res?.ok) router.push("/app/find/agenter"); else actions.setToast({ text: "Kunne ikke slette agenten.", tone: "bad" });
  };

  return (
    <div className="mx-auto max-w-[1240px] px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
      <Link href="/app/find/agenter" className="inline-flex min-h-[40px] items-center gap-1.5 text-[14px] font-medium text-slate-500 hover:text-slate-900"><ArrowLeft size={15} /> Søgeagenter</Link>
      <div className="mt-2 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="flex flex-wrap items-center gap-2.5 text-[24px] font-semibold leading-tight tracking-[-0.025em] text-slate-900 sm:text-[28px]">
            {a.name}
            <span className={clsx("inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[12px] font-semibold", a.active ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600")}>
              <span className={clsx("h-1.5 w-1.5 rounded-full", a.active ? "bg-emerald-500" : "bg-slate-400")} />{a.active ? "Aktiv" : "På pause"}
            </span>
          </h1>
          <p className="mt-2 flex flex-wrap gap-1.5"><span className="rounded-md bg-blue-50 px-2 py-0.5 text-[13px] font-semibold text-blue-800 ring-1 ring-blue-200">{STRATEGIES.find((x) => x.id === strategyOf(a))?.label}</span>{criteriaChips(a.criteria).map((c) => <span key={c} className="rounded-md bg-white px-2 py-0.5 text-[13px] font-medium text-slate-600 ring-1 ring-slate-200">{c}</span>)}</p>
          {a.brief && <p className="mt-2 max-w-2xl text-[14px] italic text-slate-500">&ldquo;{a.brief}&rdquo;</p>}
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={runNow} disabled={running} className={btn.secondary}>{running ? <Loader2 size={15} className="animate-spin" /> : <RefreshCw size={15} />} Kør nu</button>
          <button type="button" onClick={() => setEditing(true)} className={btn.secondary}><Pencil size={15} /> Ret</button>
          <button type="button" onClick={() => patch({ active: !a.active })} className={btn.secondary}>{a.active ? <><Pause size={15} /> Sæt på pause</> : <><Play size={15} /> Start igen</>}</button>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Segmented label="Vis" value={filter} onChange={setFilter} size="sm" options={([["nye", "Nye"], ["alle", "Alle"], ["gemt", "Gemt"], ["afvist", "Afvist"]] as const).map(([id, l]) => ({ id, label: <>{l} <span className="tabular-nums opacity-50">{counts[id]}</span></> }))} />
            <div className="flex flex-wrap items-center gap-2">
              <Segmented label="Sortér" value={order} onChange={setOrder} size="sm" options={[{ id: "match", label: "Bedste match" }, { id: "nyeste", label: "Nyeste" }]} />
              {counts.nye > 0 && <button type="button" onClick={async () => { await patch({ readAll: true }); setFilter("alle"); }} className={btn.ghost}>Markér alle som set</button>}
            </div>
          </div>
          {shown.length === 0 ? (
            <div className="mt-3 rounded-2xl border border-dashed border-slate-300 bg-white">
              <Empty icon={<Radar size={20} />} title={filter === "nye" ? "Intet nyt siden sidst" : filter === "gemt" ? "Intet gemt fra denne agent" : filter === "afvist" ? "Intet afvist" : "Ingen boliger matcher lige nu"}
                text={filter === "nye" ? `Agenten kigger igen ${whenLabel(a.nextRunAt)}.` : filter === "alle" ? "Agenten giver besked ved nye fund. Færre krav giver flere fund." : undefined}
                action={filter === "alle" ? <button type="button" onClick={() => setEditing(true)} className={btn.secondary}><Pencil size={15} /> Ret kravene</button> : undefined} />
            </div>
          ) : (
            <div className="mt-3 space-y-2.5">
              {shown.map((h) => <HitCard key={h.id} h={h} busy={actions.busy === h.id} onSave={() => actions.save(h)} onDismiss={() => actions.mark(a, h, "afvist")} onRestore={() => actions.mark(a, h, "set")} />)}
            </div>
          )}
        </div>

        <aside className="space-y-4">
          <Card title="Indstillinger">
            <dl className="space-y-3 text-[14px]">
              <div className="flex justify-between gap-3"><dt className="text-slate-500">Kører</dt><dd className="text-right font-medium text-slate-800 first-letter:uppercase">{scheduleLabel(a.schedule)}</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-slate-500">Pr. kørsel</dt><dd className="text-right font-medium text-slate-800">Højst {perRunOf(a)} nye</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-slate-500">Næste gang</dt><dd className="text-right font-medium text-slate-800 first-letter:uppercase">{a.active ? whenLabel(a.nextRunAt) : "På pause"}</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-slate-500">Sidst</dt><dd className="text-right font-medium text-slate-800 first-letter:uppercase">{whenLabel(a.lastRunAt)}</dd></div>
              <div className="flex items-center justify-between gap-3">
                <dt className="flex items-center gap-1.5 text-slate-500">{a.email ? <Bell size={14} /> : <BellOff size={14} />} Mail om nye</dt>
                <dd><Toggle on={a.email} onChange={(email) => patch({ email })} label="Mail om nye boliger" /></dd>
              </div>
            </dl>
          </Card>
          <Card title="Seneste kørsler" pad={false}>
            {a.runs.length === 0 ? <p className="px-5 py-4 text-[14px] text-slate-500">Ingen kørsler endnu.</p> : (
              <ul className="divide-y divide-slate-100 text-[13px]">
                {a.runs.slice(0, 8).map((r) => (
                  <li key={r.at} className="flex items-center justify-between gap-3 px-5 py-2.5">
                    <span className="text-slate-600 first-letter:uppercase">{whenLabel(r.at)}</span>
                    <span className={clsx("tabular-nums", !r.ok ? "text-rose-600" : r.fresh ? "font-semibold text-blue-700" : "text-slate-500")}>
                      {!r.ok ? "Fejlede" : r.fresh ? `${r.fresh} nye${r.emailed ? ", mail sendt" : ""}` : `${r.matches} matcher, intet nyt`}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
          <div className="px-1">
            {confirmDelete ? (
              <div className="rounded-xl border border-rose-200 bg-rose-50 p-3">
                <p className="text-[14px] text-rose-900">Slet agenten? Gemte boliger bliver i din pipeline.</p>
                <div className="mt-2 flex gap-2">
                  <button type="button" onClick={remove} className="inline-flex min-h-[40px] items-center rounded-lg bg-rose-600 px-3 text-[14px] font-semibold text-white hover:bg-rose-500">Ja, slet</button>
                  <button type="button" onClick={() => setConfirmDelete(false)} className={btn.ghost}>Annullér</button>
                </div>
              </div>
            ) : (
              <button type="button" onClick={() => setConfirmDelete(true)} className={btn.danger}><Trash2 size={15} /> Slet agent</button>
            )}
          </div>
        </aside>
      </div>

      <AgentEditor open={editing} onClose={() => setEditing(false)} initial={a} title="Ret søgeagent"
        onSave={async (input) => patch({ name: input.name, schedule: input.schedule, email: input.email, maxPerRun: input.maxPerRun, strategy: input.strategy, brief: input.brief ?? "", ...(JSON.stringify(input.criteria) !== JSON.stringify(a.criteria) ? { criteria: input.criteria } : {}) })} />
      {actions.toast && <Toast text={actions.toast.text} tone={actions.toast.tone} onClose={() => actions.setToast(null)} action={actions.toast.href ? <Link href={actions.toast.href} className="shrink-0 font-semibold text-blue-300 hover:underline">Åbn</Link> : undefined} />}
    </div>
  );
}
