"use client";

import { zipFromAddress } from "@/lib/zip";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowLeft, ArrowRight, Check, Hammer, Home, KeyRound, Link2, Loader2, Repeat, Users, X } from "lucide-react";
import { clsx } from "@/lib/clsx";
import { captureEvent } from "@/lib/analytics-events";
import { flipAnswers, goalOf, listingType, questionsFor, rentalParams, type Answers, type Goal, type Question } from "@/lib/journey/flow";

/*
 * The start of every analysis: paste a link, see the home, say what you want
 * to do with it, and answer the questions that decide the numbers. Each answer
 * picks the next question (lib/journey/flow.ts). The listing is fetched while
 * the user answers, so nothing waits on the network. Used as a pop-up on the
 * front page and the blog, and as its own page at /analyseren/start.
 */

type Listing = {
  url: string;
  address: string | null;
  zip: string | null;
  price: number | null;
  area: number | null;
  rooms: number | null;
  yearBuilt: number | null;
  monthlyExpenses: number | null;
  monthlyRent: number | null;
  type: string | null;
  images: string[];
};

const STORE = "ni_journey";
const kr = (n: number) => `${Math.round(n).toLocaleString("da-DK")} kr.`;
const EASE = [0.2, 0.7, 0.2, 1] as const;

const GOALS: { id: Goal; title: string; sub: string; icon: typeof Home }[] = [
  { id: "cashflow", title: "Udlejning", sub: "Køb og lej ud. Kan lejen betale lånet hver måned?", icon: KeyRound },
  { id: "flip", title: "Flip", sub: "Køb, renovér og sælg. Hvad tjener du efter skat?", icon: Hammer },
  { id: "live_flip", title: "Bo og flip", sub: "Bo i den, mens du renoverer, og sælg skattefrit.", icon: Repeat },
  { id: "parents", title: "Forældrekøb", sub: "Køb en bolig, dit barn lejer, mens det studerer.", icon: Users },
];

function readListing(u: string, d: Record<string, unknown>): Listing {
  const f = (d?.fields ?? {}) as Record<string, string | number>;
  const address = f.address ? String(f.address) : null;
  return {
    url: u,
    address,
    zip: zipFromAddress(address),
    price: Number(f.price) || null,
    area: Number(f.area) || null,
    rooms: Number(f.rooms) || null,
    yearBuilt: Number(f.yearBuilt) || null,
    monthlyExpenses: Number(f.monthlyExpenses) || null,
    monthlyRent: Number(f.monthlyRent) || null,
    type: listingType(f.propertyType ? String(f.propertyType) : null),
    images: Array.isArray(d?.images) ? (d.images as string[]).slice(0, 12) : [],
  };
}

const b64 = (o: unknown) => btoa(unescape(encodeURIComponent(JSON.stringify(o))));

export function JourneyFlow({ initialUrl, variant, onClose }: { initialUrl?: string; variant: "page" | "modal"; onClose?: () => void }) {
  const router = useRouter();
  const [url, setUrl] = useState(initialUrl ?? "");
  const [listing, setListing] = useState<Listing | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [step, setStep] = useState<"link" | "goal" | "questions" | "building">(initialUrl ? "goal" : "link");
  const [answers, setAnswers] = useState<Answers>({});
  const [qi, setQi] = useState(0);
  const [num, setNum] = useState("");
  const fetched = useRef<string | null>(null);

  const fetchListing = useCallback((u: string) => {
    if (fetched.current === u) return;
    fetched.current = u;
    setLoading(true);
    setErr(null);
    fetch(`/api/extract?url=${encodeURIComponent(u)}`)
      .then((r) => r.json())
      .then((d) => {
        const l = readListing(u, d);
        setListing(l);
        if (!d?.ok) setErr("Vi kunne ikke læse alle tal fra annoncen. Du kan rette dem i analysen.");
      })
      .catch(() => setErr("Vi kunne ikke hente annoncen. Du kan stadig fortsætte og indtaste tallene selv."))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { if (initialUrl) fetchListing(initialUrl); }, [initialUrl, fetchListing]);

  const ctx = useMemo(() => ({ area: listing?.area ?? null, rent: listing?.monthlyRent ?? null, address: listing?.address ?? null, zip: listing?.zip ?? null, type: listing?.type ?? null }), [listing]);
  const path = useMemo(() => questionsFor(answers, ctx), [answers, ctx]);
  const q: Question | undefined = path[qi];
  const linkStep = initialUrl ? 0 : 1;
  const total = linkStep + 1 + Math.max(path.length, 6);
  const progress = step === "link" ? 0 : step === "goal" ? linkStep : step === "questions" ? linkStep + 1 + qi : total;

  // Prefill number questions with our estimate.
  useEffect(() => {
    if (q?.kind === "number") setNum(answers[q.key] ?? (q.suggest ? String(q.suggest) : ""));
  }, [q, answers]);

  const finish = (a: Answers) => {
    setStep("building");
    const l = listing;
    const goal = goalOf(a);
    captureEvent("journey_done", { goal: goal ?? "unknown" });
    try { sessionStorage.setItem(STORE, JSON.stringify({ listing: l })); } catch { /* the analysis refetches */ }
    const u = l?.url ?? url;
    if (goal === "flip" || goal === "live_flip") {
      const p = new URLSearchParams({ url: u, a: b64(flipAnswers({ ...(l?.type ? { type: l.type } : {}), ...a })) });
      setTimeout(() => router.push(`/analyseren/flip?${p.toString()}`), 900);
      return;
    }
    const { down, j } = rentalParams(a);
    const p = new URLSearchParams({ url: u });
    if (l?.price) {
      p.set("price", String(l.price));
      if (l.area) p.set("area", String(l.area));
      if (l.rooms) p.set("rooms", String(l.rooms));
      if (l.monthlyExpenses) p.set("opex", String(l.monthlyExpenses));
      if (l.address) p.set("addr", l.address);
      if (j.monthlyRent) p.set("rent", String(j.monthlyRent));
    }
    p.set("downPaymentPct", String(down));
    p.set("interestRate", String(j.interestRate));
    p.set("j", b64(j));
    setTimeout(() => router.push(`/analyseren?${p.toString()}`), 900);
  };

  // Answer the current question; answers that belonged to a branch no longer
  // on the path are dropped so they can never leak into the result.
  const answer = (key: string, value: string) => {
    const keep: Answers = { goal: answers.goal };
    for (const pq of path.slice(0, qi)) if (answers[pq.key] != null) keep[pq.key] = answers[pq.key];
    const next = { ...keep, [key]: value };
    setAnswers(next);
    const nextPath = questionsFor(next, ctx);
    if (qi + 1 >= nextPath.length) finish(next);
    else setTimeout(() => setQi(qi + 1), 150);
  };

  const pickGoal = (g: Goal) => {
    captureEvent("journey_strategy", { strategy: g });
    setAnswers({ goal: g });
    setQi(0);
    setStep("questions");
  };

  const back = () => {
    if (step === "questions" && qi > 0) setQi(qi - 1);
    else if (step === "questions") setStep("goal");
    else if (step === "goal" && !initialUrl) setStep("link");
  };

  const submitLink = (e: React.FormEvent) => {
    e.preventDefault();
    const u = url.trim();
    if (!/^https?:\/\//i.test(u)) return setErr("Indsæt hele linket fra boligsiden. Det starter med https://");
    captureEvent("journey_link", {});
    fetchListing(u);
    setStep("goal");
  };

  // Keys 1 to 4 pick an answer; Escape closes the pop-up.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && onClose) onClose();
      if ((e.target as HTMLElement)?.tagName === "INPUT") return;
      const n = Number(e.key);
      if (!Number.isInteger(n) || n < 1) return;
      if (step === "goal" && GOALS[n - 1]) pickGoal(GOALS[n - 1].id);
      if (step === "questions" && q?.kind === "choice" && q.options[n - 1]) answer(q.key, q.options[n - 1].value);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const modal = variant === "modal";
  const h1 = modal ? "text-[26px] sm:text-[32px]" : "text-[30px] sm:text-[42px]";

  return (
    <div className={clsx("w-full", modal ? "px-5 pb-8 pt-5 sm:px-8 sm:pb-9" : "mx-auto max-w-[880px] px-4 pb-24 pt-8 sm:px-6 sm:pt-14")}>
      <div className="flex items-center gap-3">
        {(step === "questions" || (step === "goal" && !initialUrl)) && (
          <button type="button" onClick={back} aria-label="Tilbage" className="-ml-2 flex h-10 w-10 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100 hover:text-slate-900">
            <ArrowLeft size={18} strokeWidth={1.8} />
          </button>
        )}
        <div className="h-1 flex-1 overflow-hidden rounded-full bg-slate-100" role="progressbar" aria-valuemin={0} aria-valuemax={total} aria-valuenow={progress}>
          <motion.div className="h-full rounded-full bg-blue-600" animate={{ width: `${Math.max(4, (progress / total) * 100)}%` }} transition={{ duration: 0.5, ease: EASE }} />
        </div>
        {onClose && (
          <button type="button" onClick={onClose} aria-label="Luk" className="-mr-2 flex h-10 w-10 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100 hover:text-slate-900">
            <X size={18} strokeWidth={1.8} />
          </button>
        )}
      </div>

      {step !== "link" && <PropertyCard listing={listing} loading={loading} />}
      {err && <p className="mt-3 rounded-xl bg-amber-50 px-4 py-2.5 text-sm text-amber-900">{err}</p>}

      {step === "link" && (
        <motion.form key="link" onSubmit={submitLink} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, ease: EASE }} className="mt-12">
          <h1 className="text-[36px] font-semibold leading-[1.05] tracking-[-0.035em] [text-wrap:balance] sm:text-[52px]">Hvilken bolig kigger du på?</h1>
          <p className="mt-4 max-w-xl text-[17px] leading-relaxed text-slate-600">Indsæt linket fra Boligsiden, EDC, home, Nybolig eller en anden mægler. Så viser vi, hvad den kan, alt efter hvad du vil med den.</p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <label className="relative flex-1">
              <span className="sr-only">Link til boligen</span>
              <Link2 aria-hidden size={18} strokeWidth={1.8} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
              <input value={url} onChange={(e) => setUrl(e.target.value)} inputMode="url" placeholder="https://www.boligsiden.dk/adresse/…" className="h-14 w-full rounded-2xl border border-slate-200 bg-white pl-11 pr-4 text-base shadow-card outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10" />
            </label>
            <button type="submit" className="flex h-14 items-center justify-center gap-2 rounded-2xl bg-blue-600 px-7 text-[15px] font-semibold text-white shadow-btn ring-1 ring-inset ring-white/10 transition-colors hover:bg-blue-700 active:translate-y-px">
              Fortsæt <ArrowRight size={16} />
            </button>
          </div>
          <p className="mt-4 text-sm text-slate-500">Intet link? <a href="/analyseren" className="font-medium text-slate-700 underline underline-offset-2 hover:text-slate-900">Indtast tallene selv</a></p>
        </motion.form>
      )}

      {step === "goal" && (
        <motion.div key="goal" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, ease: EASE }} className="mt-8">
          <h2 className={clsx("font-semibold leading-[1.08] tracking-[-0.03em] [text-wrap:balance]", h1)}>Hvad vil du med boligen?</h2>
          <p className="mt-2.5 text-[15px] text-slate-600">Hvert valg stiller sine egne spørgsmål og giver sin egen analyse.</p>
          <div className="mt-6 grid gap-2.5 sm:grid-cols-2">
            {GOALS.map((s, i) => {
              const Icon = s.icon;
              return (
                <motion.button
                  key={s.id}
                  type="button"
                  onClick={() => pickGoal(s.id)}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.05 * i, ease: EASE }}
                  className="group relative flex items-center gap-3.5 rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-card transition-[transform,border-color,box-shadow] hover:-translate-y-[1px] hover:border-blue-300 hover:shadow-card-lift focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 sm:min-h-[118px] sm:flex-col sm:items-start sm:gap-0 sm:p-5"
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-100 sm:h-9 sm:w-9"><Icon size={18} strokeWidth={1.8} /></span>
                  <span className="flex min-w-0 flex-col sm:mt-3">
                    <span className="text-[16px] font-semibold tracking-[-0.01em] text-slate-900 sm:text-[17px]">{s.title}</span>
                    <span className="mt-0.5 text-[13.5px] leading-snug text-slate-600 sm:text-[14px]">{s.sub}</span>
                  </span>
                  <span className="absolute right-4 top-4 hidden h-6 w-6 items-center justify-center rounded-md border border-slate-200 text-[11px] font-semibold text-slate-400 sm:flex">{i + 1}</span>
                </motion.button>
              );
            })}
          </div>
        </motion.div>
      )}

      {step === "questions" && q && (
        <motion.div key={`q-${answers.goal}-${q.key}`} initial={{ opacity: 0, x: 28 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.32, ease: EASE }} className="mt-8">
          <p className="text-sm font-medium text-blue-700">Spørgsmål {qi + 1} af {path.length}</p>
          <h2 className={clsx("mt-1.5 font-semibold leading-[1.1] tracking-[-0.03em] [text-wrap:balance]", h1)}>{q.title}</h2>
          {q.hint && <p className="mt-2.5 max-w-xl text-[15px] leading-relaxed text-slate-600">{q.hint}</p>}

          {q.kind === "choice" ? (
            <div className="mt-6 grid gap-2.5">
              {q.options.map((o, i) => {
                const on = answers[q.key] === o.value;
                return (
                  <motion.button
                    key={o.value}
                    type="button"
                    onClick={() => answer(q.key, o.value)}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: 0.04 * i, ease: EASE }}
                    className={clsx(
                      "flex min-h-[58px] items-center justify-between gap-4 rounded-2xl border px-4 py-3 text-left transition-[border-color,background-color,transform] active:translate-y-px sm:px-5",
                      on ? "border-blue-500 bg-blue-50/60" : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50",
                    )}
                  >
                    <span className="flex min-w-0 items-center gap-3">
                      <span className="hidden h-6 w-6 shrink-0 items-center justify-center rounded-md border border-slate-200 text-[11px] font-semibold text-slate-400 sm:flex">{i + 1}</span>
                      <span className="min-w-0">
                        <span className="block text-[16px] font-semibold text-slate-900">{o.label}</span>
                        {o.sub && <span className="block text-[13px] text-slate-500">{o.sub}</span>}
                      </span>
                    </span>
                    <span className={clsx("flex h-6 w-6 shrink-0 items-center justify-center rounded-full border", on ? "border-blue-600 bg-blue-600 text-white" : "border-slate-300")}>
                      {on && <Check size={14} strokeWidth={2.4} />}
                    </span>
                  </motion.button>
                );
              })}
            </div>
          ) : (
            <form
              className="mt-6"
              onSubmit={(e) => {
                e.preventDefault();
                const v = Math.round(Number(num.replace(/\./g, "").replace(",", ".")));
                if (!Number.isFinite(v) || v < q.min || v > q.max) return;
                answer(q.key, String(v));
              }}
            >
              <label className="relative block">
                <span className="sr-only">{q.title}</span>
                <input
                  value={num ? Number(num.replace(/\./g, "")).toLocaleString("da-DK") : ""}
                  onChange={(e) => setNum(e.target.value.replace(/[^\d]/g, ""))}
                  inputMode="numeric"
                  className="h-16 w-full rounded-2xl border border-slate-200 bg-white pl-5 pr-24 text-[24px] font-semibold tabular-nums shadow-card outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                />
                <span className="pointer-events-none absolute right-5 top-1/2 -translate-y-1/2 text-[15px] text-slate-500">{q.unit}</span>
              </label>
              {q.suggest ? <p className="mt-2 text-[13px] text-slate-500">Vores skøn ud fra boligens størrelse og område: {kr(q.suggest)} om måneden.</p> : null}
              <button type="submit" className="mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 text-[15px] font-semibold text-white shadow-btn ring-1 ring-inset ring-white/10 hover:bg-blue-700 active:translate-y-px sm:w-auto sm:px-7">
                Fortsæt <ArrowRight size={16} />
              </button>
            </form>
          )}
        </motion.div>
      )}

      {step === "building" && (
        <motion.div key="building" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-14 flex flex-col items-center pb-6 text-center">
          <Loader2 className="animate-spin text-blue-600" size={28} />
          <p className="mt-5 text-[20px] font-semibold tracking-[-0.02em]">Bygger din analyse</p>
          <p className="mt-2 text-[15px] text-slate-500">
            {goalOf(answers) === "flip" || goalOf(answers) === "live_flip" ? "Henter boligpriser i postnummeret og priser på materialer" : "Regner leje, lån og udgifter igennem med dine svar"}
          </p>
        </motion.div>
      )}
    </div>
  );
}

/** The page at /analyseren/start. */
export function Journey() {
  const sp = useSearchParams();
  return <JourneyFlow initialUrl={sp.get("url") ?? undefined} variant="page" />;
}

/** The pop-up opened from a link field: full screen on phones, a dialog on larger screens. */
export function JourneyModal({ url, onClose }: { url: string; onClose: () => void }) {
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    // Take focus off the link field behind the pop-up so the number keys
    // answer questions instead of typing into it (and the phone keyboard closes).
    (document.activeElement as HTMLElement | null)?.blur?.();
    return () => { document.body.style.overflow = prev; };
  }, []);
  // Portalled to <body> so no transformed ancestor can trap the fixed overlay.
  return createPortal(
    <div className="fixed inset-0 z-[90] flex items-end justify-center sm:items-center sm:p-6" role="presentation">
      <motion.button type="button" aria-label="Luk" tabIndex={-1} onClick={onClose} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.25 }} className="absolute inset-0 bg-slate-950/55 backdrop-blur-[3px]" />
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-label="Analysér boligen"
        initial={{ opacity: 0, y: 40, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.42, ease: EASE }}
        className="relative max-h-[100dvh] w-full overflow-y-auto overscroll-contain rounded-t-3xl bg-white pb-[env(safe-area-inset-bottom)] text-slate-900 shadow-[0_30px_100px_-20px_rgba(2,6,23,0.55)] sm:max-h-[90vh] sm:max-w-[680px] sm:rounded-3xl"
      >
        <JourneyFlow initialUrl={url} variant="modal" onClose={onClose} />
      </motion.div>
    </div>,
    document.body,
  );
}

function PropertyCard({ listing, loading }: { listing: Listing | null; loading: boolean }) {
  if (loading && !listing) {
    return (
      <div className="mt-5 flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-3 shadow-card">
        <div className="h-14 w-20 shrink-0 animate-pulse rounded-xl bg-slate-100" />
        <div className="flex-1 space-y-2">
          <div className="h-4 w-2/3 animate-pulse rounded bg-slate-100" />
          <div className="h-3 w-1/3 animate-pulse rounded bg-slate-100" />
        </div>
      </div>
    );
  }
  if (!listing) return null;
  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="mt-5 flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-3 shadow-card">
      {listing.images[0] ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={listing.images[0]} alt="" className="h-14 w-20 shrink-0 rounded-xl object-cover" />
      ) : (
        <div className="flex h-14 w-20 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-300"><Home size={20} /></div>
      )}
      <div className="min-w-0 flex-1">
        <div className="truncate text-[15px] font-semibold text-slate-900">{listing.address ?? "Boligen fra dit link"}</div>
        <div className="mt-0.5 flex flex-wrap gap-x-3 text-[13px] tabular-nums text-slate-500">
          {listing.price && <span className="font-medium text-slate-700">{kr(listing.price)}</span>}
          {listing.area && <span>{listing.area} m²</span>}
          {listing.rooms && <span>{listing.rooms} vær.</span>}
          {listing.yearBuilt && <span>Opført {listing.yearBuilt}</span>}
        </div>
      </div>
    </motion.div>
  );
}
