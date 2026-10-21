"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, ArrowUpDown, Search } from "lucide-react";
import { clsx } from "@/lib/clsx";
import type { MemberSummary } from "@/lib/admin/members";
import { AccessBadge, Avatar, PipelineBar, Spark, ago, tourLabel } from "./bits";

/*
 * Admin: everyone with an account and what they do in NordInvest. Search,
 * filter by access and sort; a row opens the member's profile.
 */

type Seg = "medlemmer" | "fjernet" | "oevrige" | "alle";
type Sort = "aktiv" | "analyser" | "boliger" | "nyeste";
const SORTS: Record<Sort, string> = { aktiv: "Senest aktiv", analyser: "Flest analyser", boliger: "Flest boliger", nyeste: "Nyeste konto" };

const inSeg = (m: MemberSummary, s: Seg) =>
  s === "alle" || (s === "medlemmer" ? m.access === "member" || m.access === "broker" || m.access === "admin" : s === "fjernet" ? m.access === "revoked" : m.access === "none");

export function MembersBoard({ members, pending }: { members: MemberSummary[]; pending: number }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [seg, setSeg] = useState<Seg>("medlemmer");
  const [sort, setSort] = useState<Sort>("aktiv");

  const shown = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const list = members.filter((m) => inSeg(m, seg) && (!needle || `${m.name} ${m.email} ${m.phone}`.toLowerCase().includes(needle)));
    const key: Record<Sort, (m: MemberSummary) => string | number> = {
      aktiv: (m) => m.lastActive ?? "", analyser: (m) => m.analyses, boliger: (m) => m.saved, nyeste: (m) => m.createdAt,
    };
    return [...list].sort((a, b) => { const x = key[sort](a), y = key[sort](b); return x < y ? 1 : x > y ? -1 : 0; });
  }, [members, q, seg, sort]);

  const active = members.filter((m) => m.access === "member" || m.access === "broker" || m.access === "admin");
  const week = Date.now() - 7 * 24 * 3600 * 1000;
  const kpis: [string, number, string][] = [
    ["Medlemmer", active.length, `${active.filter((m) => m.onboarded).length} har logget ind`],
    ["Aktive de sidste 7 dage", active.filter((m) => m.lastActive && Date.parse(m.lastActive) > week).length, "logget ind eller arbejdet"],
    ["Analyser de sidste 30 dage", active.reduce((n, m) => n + m.analyses30, 0), `${active.reduce((n, m) => n + m.analyses, 0)} i alt`],
    ["Boliger i pipelines", active.reduce((n, m) => n + m.saved, 0), `${active.reduce((n, m) => n + m.offers, 0)} med bud`],
  ];

  return (
    <div className="mt-6">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        {kpis.map(([label, n, sub]) => (
          <div key={label} className="rounded-2xl border border-slate-200 bg-white p-4">
            <p className="text-[13px] font-medium text-slate-500">{label}</p>
            <p className="mt-1 text-[28px] font-semibold tabular-nums tracking-[-0.02em] text-slate-900">{n.toLocaleString("da-DK")}</p>
            <p className="text-[13px] text-slate-500">{sub}</p>
          </div>
        ))}
        <Link href="/app/admin/adgang" className={clsx("group col-span-2 flex flex-col justify-between rounded-2xl border p-4 lg:col-span-1", pending ? "border-amber-200 bg-amber-50" : "border-slate-200 bg-white")}>
          <p className={clsx("text-[13px] font-medium", pending ? "text-amber-900" : "text-slate-500")}>Anmodninger der venter</p>
          <p className={clsx("mt-1 text-[28px] font-semibold tabular-nums tracking-[-0.02em]", pending ? "text-amber-950" : "text-slate-900")}>{pending}</p>
          <span className={clsx("inline-flex items-center gap-1 text-[13px] font-semibold", pending ? "text-amber-900" : "text-blue-700")}>Godkend eller afvis <ArrowRight size={13} className="transition-transform group-hover:translate-x-0.5" /></span>
        </Link>
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-2">
        <label className="relative min-w-0 flex-1 basis-[240px]">
          <span className="sr-only">Søg efter medlem</span>
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Søg på navn, e-mail eller telefon" className="h-11 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-[15px] focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100" />
        </label>
        <div className="flex flex-wrap gap-1 rounded-lg bg-slate-100 p-1">
          {([["medlemmer", "Medlemmer"], ["fjernet", "Fjernet"], ["oevrige", "Uden adgang"], ["alle", "Alle"]] as const).map(([id, label]) => (
            <button key={id} type="button" onClick={() => setSeg(id)} aria-pressed={seg === id}
              className={clsx("min-h-[36px] rounded-md px-3 text-[13px] font-semibold", seg === id ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900")}>
              {label} <span className="tabular-nums opacity-50">{members.filter((m) => inSeg(m, id)).length}</span>
            </button>
          ))}
        </div>
        <label className="relative">
          <span className="sr-only">Sortér</span>
          <ArrowUpDown size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <select value={sort} onChange={(e) => setSort(e.target.value as Sort)} className="h-11 appearance-none rounded-lg border border-slate-200 bg-white pl-8 pr-4 text-[14px] font-medium text-slate-700 focus:border-blue-500 focus:outline-none">
            {Object.entries(SORTS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </label>
      </div>

      {shown.length === 0 ? (
        <div className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center">
          <p className="text-[16px] font-semibold text-slate-800">{q ? "Ingen matcher søgningen" : seg === "medlemmer" ? "Ingen medlemmer endnu" : "Ingen her"}</p>
          <p className="mt-1 text-[14px] text-slate-500">{seg === "medlemmer" && !q ? "Når du godkender en anmodning, dukker personen op her." : "Prøv et andet filter."}</p>
        </div>
      ) : (
        <>
          {/* Desktop: a table you can scan. */}
          <div className="mt-4 hidden overflow-hidden rounded-2xl border border-slate-200 bg-white md:block">
            <table className="w-full text-left text-[14px]">
              <thead className="border-b border-slate-200 bg-slate-50/70 text-[12px] font-semibold uppercase tracking-[0.04em] text-slate-500">
                <tr>
                  <th className="px-4 py-3 font-semibold">Medlem</th>
                  <th className="px-3 py-3 font-semibold">Senest aktiv</th>
                  <th className="px-3 py-3 font-semibold">Analyser</th>
                  <th className="px-3 py-3 font-semibold">Pipeline</th>
                  <th className="px-3 py-3 text-right font-semibold">Opgaver</th>
                  <th className="px-3 py-3 font-semibold">Guide</th>
                  <th className="w-10 px-3 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {shown.map((m) => (
                  <tr key={m.id} onClick={() => router.push(`/app/admin/medlemmer/${m.id}`)} className="group cursor-pointer hover:bg-slate-50">
                    <td className="max-w-[320px] px-4 py-3">
                      <Link href={`/app/admin/medlemmer/${m.id}`} onClick={(e) => e.stopPropagation()} className="flex min-w-0 items-center gap-3 focus:outline-none">
                        <Avatar m={m} size={36} />
                        <span className="min-w-0">
                          <span className="flex items-center gap-2"><span className="truncate font-semibold text-slate-900 group-hover:text-blue-700">{m.name || m.email.split("@")[0]}</span><AccessBadge access={m.access} alsoBroker={m.alsoBroker} /></span>
                          <span className="block truncate text-[13px] text-slate-500">{m.email}</span>
                        </span>
                      </Link>
                    </td>
                    <td className="whitespace-nowrap px-3 py-3 text-slate-600">{ago(m.lastActive)}</td>
                    <td className="px-3 py-3">
                      <span className="flex items-center gap-3"><span className="w-7 text-right font-semibold tabular-nums text-slate-900">{m.analyses}</span><Spark data={m.weekly} height={20} /></span>
                    </td>
                    <td className="px-3 py-3">
                      <span className="flex items-center gap-2.5"><span className="w-5 text-right font-semibold tabular-nums text-slate-900">{m.saved}</span><PipelineBar pipeline={m.pipeline} className="max-w-[120px]" /></span>
                    </td>
                    <td className="whitespace-nowrap px-3 py-3 text-right tabular-nums text-slate-600"><b className="font-semibold text-slate-900">{m.tasksOpen}</b> åbne · {m.tasksDone} løst</td>
                    <td className="whitespace-nowrap px-3 py-3 text-slate-600">{m.onboarded ? tourLabel(m.tour) : <span className="text-amber-700">Ikke logget ind</span>}</td>
                    <td className="px-3 py-3 text-slate-300 group-hover:text-blue-600"><ArrowRight size={16} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Phone: one card per member. */}
          <ul className="mt-4 space-y-2.5 md:hidden">
            {shown.map((m) => (
              <li key={m.id}>
                <Link href={`/app/admin/medlemmer/${m.id}`} className="block rounded-2xl border border-slate-200 bg-white p-4 active:bg-slate-50">
                  <span className="flex items-center gap-3">
                    <Avatar m={m} size={40} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[15px] font-semibold text-slate-900">{m.name || m.email.split("@")[0]}</span>
                      <span className="block truncate text-[13px] text-slate-500">{m.email}</span>
                    </span>
                    <AccessBadge access={m.access} alsoBroker={m.alsoBroker} />
                  </span>
                  <span className="mt-3 grid grid-cols-3 gap-2 border-t border-slate-100 pt-3 text-[13px]">
                    <span><span className="block text-slate-500">Analyser</span><b className="text-[16px] font-semibold tabular-nums">{m.analyses}</b></span>
                    <span><span className="block text-slate-500">Boliger</span><b className="text-[16px] font-semibold tabular-nums">{m.saved}</b></span>
                    <span><span className="block text-slate-500">Aktiv</span><b className="text-[14px] font-semibold">{ago(m.lastActive)}</b></span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
