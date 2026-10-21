"use client";

import { useEffect, useState } from "react";
import { ExternalLink, X } from "lucide-react";

/*
 * Proof that the map is live. The market agent checks every home for sale
 * about every 20 minutes; this shows when it last finished, what moved, and
 * which estate agents the homes come from, so a new visitor can see it is real
 * data and not a demo. One fetch shared by the whole page, refreshed each minute.
 */

export type Pulse = { checkedAt: string; everyMin: number; total: number; new24h: number; cut24h: number; brokers: { name: string; n: number }[]; otherBrokers: number; otherHomes: number };

let current: Pulse | null = null;
let started = false;
const subs = new Set<(p: Pulse) => void>();
async function refresh() {
  const p = await fetch("/api/boligkoeb/pulse").then((r) => r.json()).then((j) => (j.ok ? (j as Pulse) : null)).catch(() => null);
  if (p) { current = p; subs.forEach((f) => f(p)); }
}
function start() {
  if (started) return;
  started = true;
  void refresh();
  setInterval(() => { if (document.visibilityState === "visible") void refresh(); }, 60_000);
  document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible") void refresh(); });
}

export function usePulse(): Pulse | null {
  const [p, setP] = useState<Pulse | null>(current);
  useEffect(() => { start(); subs.add(setP); if (current) setP(current); return () => { subs.delete(setP); }; }, []);
  return p;
}

/** Re-renders every 15 s so "for 3 min. siden" keeps counting. */
export function useNow(ms = 15_000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), ms); return () => clearInterval(t); }, [ms]);
  return now;
}

const time = (d: Date) => d.toLocaleTimeString("da-DK", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Copenhagen" });
export function ago(iso: string, now: number): string {
  const d = new Date(iso), s = Math.max(0, (now - d.getTime()) / 1000);
  if (s < 60) return "lige nu";
  if (s < 3600) return `for ${Math.floor(s / 60)} min. siden`;
  if (s < 3 * 3600) { const h = Math.floor(s / 3600); return `for ${h} ${h === 1 ? "time" : "timer"} siden`; }
  const day = (x: Date) => x.toLocaleDateString("da-DK", { timeZone: "Europe/Copenhagen" });
  if (day(d) === day(new Date(now))) return `i dag kl. ${time(d)}`;
  if (day(d) === day(new Date(now - 86400_000))) return `i går kl. ${time(d)}`;
  return `${d.toLocaleDateString("da-DK", { day: "numeric", month: "short", timeZone: "Europe/Copenhagen" })} kl. ${time(d)}`;
}
/** Live while the last check is within two rounds of the agent. */
export const isLive = (iso: string, now: number, everyMin = 20) => now - Date.parse(iso) < everyMin * 2.5 * 60_000;

export function LiveDot({ live = true, size = 8 }: { live?: boolean; size?: number }) {
  return (
    <span className="relative inline-flex shrink-0" style={{ width: size, height: size }} aria-hidden>
      {live && <span className="absolute inset-0 animate-ping rounded-full bg-emerald-500 opacity-60" />}
      <span className={`relative inline-block rounded-full ${live ? "bg-emerald-500" : "bg-slate-400"}`} style={{ width: size, height: size }} />
    </span>
  );
}

/** "● Opdateret for 4 min. siden" with an optional tail, as one tappable line. */
export function PulseLine({ pulse, onOpen, tail, className = "", dark = false }: { pulse: Pulse | null; onOpen?: () => void; tail?: React.ReactNode; className?: string; dark?: boolean }) {
  const now = useNow();
  const ink = dark ? "text-white/70" : "text-slate-600";
  if (!pulse) return <p className={`flex items-center gap-1.5 text-[12px] ${dark ? "text-white/50" : "text-slate-400"} ${className}`}><LiveDot live={false} size={7} /> Tjekker markedet …</p>;
  const live = isLive(pulse.checkedAt, now, pulse.everyMin);
  const body = <><LiveDot live={live} size={7} /><span className="truncate">Opdateret {ago(pulse.checkedAt, now)}{tail}</span></>;
  return onOpen ? (
    <button type="button" onClick={onOpen} className={`flex min-w-0 items-center gap-1.5 text-left text-[12px] font-medium underline-offset-2 hover:underline ${ink} ${className}`}>{body}<span className={`shrink-0 ${dark ? "text-sky-300" : "text-blue-700"}`}>· Kilder</span></button>
  ) : <p className={`flex min-w-0 items-center gap-1.5 text-[12px] font-medium ${ink} ${className}`}>{body}</p>;
}

const n = (x: number) => x.toLocaleString("da-DK");

/** Where the homes come from and how fresh they are. A bottom sheet on the phone, a dialog on the computer. */
export function TrustSheet({ onClose }: { onClose: () => void }) {
  const pulse = usePulse();
  const now = useNow();
  useEffect(() => { const k = (e: KeyboardEvent) => e.key === "Escape" && onClose(); addEventListener("keydown", k); return () => removeEventListener("keydown", k); }, [onClose]);
  const max = pulse?.brokers[0]?.n ?? 1;
  const live = pulse ? isLive(pulse.checkedAt, now, pulse.everyMin) : false;
  return (
    <div className="fixed inset-0 z-[75] flex items-end justify-center bg-slate-900/40 lg:items-center lg:p-6" onClick={onClose}>
      <div role="dialog" aria-modal aria-label="Hvor kommer boligerne fra?" onClick={(e) => e.stopPropagation()}
        className="flex max-h-[90dvh] w-full flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl animate-[bk-up_.32s_cubic-bezier(.22,1,.36,1)] lg:max-w-[520px] lg:rounded-3xl">
        <div className="flex items-center justify-between px-5 pb-1 pt-4">
          <h2 className="text-[18px] font-semibold tracking-[-0.01em]">Hvor kommer boligerne fra?</h2>
          <button type="button" onClick={onClose} aria-label="Luk" className="flex h-10 w-10 items-center justify-center rounded-full text-slate-600 hover:bg-slate-100"><X size={20} /></button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-[calc(20px+env(safe-area-inset-bottom))]">
          {!pulse ? <div className="space-y-3 py-4">{[0, 1, 2].map((x) => <div key={x} className="h-14 animate-pulse rounded-2xl bg-slate-100" />)}</div> : (
            <>
              <div className="mt-2 rounded-2xl bg-slate-50 p-4">
                <p className="text-[28px] font-semibold leading-none tabular-nums tracking-[-0.02em]">{n(pulse.total)}</p>
                <p className="mt-1 text-[15px] text-slate-600">boliger til salg i hele Danmark</p>
                <p className="mt-3 flex items-center gap-2 text-[14px] font-medium text-slate-800"><LiveDot live={live} />Hele markedet tjekket {ago(pulse.checkedAt, now)}</p>
                <p className="mt-0.5 pl-4 text-[13px] text-slate-500">Vi tjekker alle boliger igen cirka hvert {pulse.everyMin}. minut.</p>
              </div>
              <div className="mt-2 grid grid-cols-2 gap-2">
                <div className="rounded-2xl bg-blue-50 px-4 py-3"><p className="text-[22px] font-semibold tabular-nums text-blue-800">{n(pulse.new24h)}</p><p className="text-[13px] text-blue-900/80">nye det seneste døgn</p></div>
                <div className="rounded-2xl bg-emerald-50 px-4 py-3"><p className="text-[22px] font-semibold tabular-nums text-emerald-800">{n(pulse.cut24h)}</p><p className="text-[13px] text-emerald-900/80">sat ned i pris siden i går</p></div>
              </div>

              <h3 className="mt-6 text-[13px] font-semibold uppercase tracking-[0.07em] text-slate-400">Fra alle mæglere</h3>
              <ul className="mt-2.5 space-y-1.5">
                {pulse.brokers.map((b) => (
                  <li key={b.name} className="flex items-center gap-3 text-[14px]">
                    <span className="w-[108px] shrink-0 truncate font-semibold">{b.name}</span>
                    <span className="min-w-0 flex-1"><span className="block h-2 min-w-[4px] rounded-full bg-blue-500/80" style={{ width: `${(b.n / max) * 100}%` }} /></span>
                    <span className="w-[52px] shrink-0 text-right tabular-nums text-slate-500">{n(b.n)}</span>
                  </li>
                ))}
              </ul>
              {pulse.otherBrokers > 0 && <p className="mt-2 text-[13px] text-slate-500">Plus {n(pulse.otherHomes)} boliger fra {n(pulse.otherBrokers)} mindre mæglere.</p>}

              <h3 className="mt-6 text-[13px] font-semibold uppercase tracking-[0.07em] text-slate-400">Sådan gør vi</h3>
              <ul className="mt-2 space-y-2.5 text-[14px] leading-snug text-slate-700">
                <li>Vi henter annoncerne fra Boligsiden, der samler dem fra mæglerne. Hver bolig linker til mæglerens egen annonce.</li>
                <li>Solgte og fjernede boliger forsvinder fra kortet, når de ikke længere er til salg.</li>
                <li>Prisen sammenlignes med mindst 8 lignende boliger til salg i nærheden: samme type og cirka samme størrelse.</li>
                <li>Fakta om boligen kommer fra BBR, Vurderingsstyrelsen, Danmarks Statistik, Nationalbanken og Plandata.</li>
              </ul>
              <p className="mt-5 rounded-2xl bg-amber-50 px-4 py-3 text-[13px] text-amber-900">Boligkryds er ikke en mægler. Læs altid salgsopstillingen og tilstandsrapporten, før du byder.</p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/** At the bottom of a home: which agent sells it, since when, and when we last checked. */
export function HomeSource({ broker, url, since }: { broker: string | null; url: string | null; since: string | null }) {
  const pulse = usePulse();
  const now = useNow();
  const live = pulse ? isLive(pulse.checkedAt, now, pulse.everyMin) : false;
  const day = since ? new Date(since).toLocaleDateString("da-DK", { day: "numeric", month: "short", year: new Date(since).getFullYear() === new Date(now).getFullYear() ? undefined : "numeric" }) : null;
  return (
    <div className="rounded-2xl ring-1 ring-slate-200">
      <div className="flex items-start gap-3 px-4 py-3">
        <span className="mt-1.5"><LiveDot live={live} /></span>
        <div className="min-w-0 flex-1">
          <p className="text-[14px] font-semibold">{broker ? `Til salg hos ${broker}` : "Til salg"}</p>
          <p className="text-[13px] text-slate-500">{day ? `På markedet siden ${day}` : "Annonce fra Boligsiden"}{pulse ? ` · tjekket ${ago(pulse.checkedAt, now)}` : ""}</p>
        </div>
      </div>
      {url && (
        <a href={url} target="_blank" rel="noopener" className="flex min-h-[46px] items-center justify-center gap-1.5 border-t border-slate-100 text-[14px] font-semibold text-emerald-700 hover:bg-slate-50">
          Se annoncen hos {broker ?? "mægleren"} <ExternalLink size={14} />
        </a>
      )}
    </div>
  );
}
