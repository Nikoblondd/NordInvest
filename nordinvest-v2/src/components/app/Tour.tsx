"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Image from "next/image";
import { ArrowLeft, ArrowRight, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

/*
 * The first-login guide. A welcome card offers "Begynd tutorial" (or skip in
 * the corner); the tour then moves a spotlight from element to element on the
 * overview, dimming everything else, with a card that explains each part and
 * places itself where there is room (a bottom sheet on phones). Steps whose
 * element is not on screen (desktop rail vs. phone tab bar) are skipped.
 * The choice is remembered on the account (user_metadata.tour).
 */

type Step = { target: string | null; title: string; text: string };

const STEPS: Step[] = [
  { target: null, title: "Velkommen til NordInvest", text: "En kort gennemgang af platformen, fra du finder en ejendom, til du afgiver bud." },
  { target: "nav", title: "Menuen", text: "Analyser, aftaler, bud og dokumenter gemmes på ejendommen, så tallene kun skal indtastes én gang." },
  { target: "quickfind", title: "Hurtigsøgning", text: "Indsæt et link fra Boligsiden, Home eller EDC for at analysere boligen, eller søg efter en adresse blandt dine ejendomme. På computer åbner ⌘K feltet." },
  { target: "kpis", title: "Status", text: "Ejendomme i pipelinen, dagens aftaler, aktive bud og nye fund fra søgeagenterne. Klik på et tal for at åbne det." },
  { target: "next-steps", title: "Dagens plan", text: "Aftaler i dag og de næste 7 dage. Markér dem som udført, når de er klaret. Du får en mail dagen før hver aftale." },
  { target: "opportunities", title: "Nyt fra dine agenter", text: "Søgeagenterne gennemgår markedet på de tidspunkter, du har valgt. Nye fund vises her og kan gemmes i pipelinen med ét klik." },
  { target: "pipeline", title: "Din pipeline", text: "Hver farve er en fase i købsprocessen: screening, fremvisning, papirer, bank og bud. Klik for at se ejendommene." },
  { target: "nav-ejendomme", title: "Ejendomme", text: "Pipelinen som tavle eller liste. Hver ejendom har en sag med aftaler, bud, dokumenter, tjekliste og mæglerens kontaktoplysninger." },
  { target: "nav-kalender", title: "Kalender", text: "Fremvisninger, bankmøder og svarfrister for alle dine boliger i én kalender, som måned, uge eller liste." },
  { target: "nav-find", title: "Find boliger", text: "Søg i hele markedet med dine egne filtre, eller opret en søgeagent, der giver besked på mail om nye fund." },
  { target: "nav-analyser", title: "Analysér", text: "Cash flow, afkast, rentefølsomhed og fremskrivning over 10 år. Gem analysen i pipelinen for at følge ejendommen videre." },
  { target: "help", title: "Hjælp", text: "Her kan du starte guiden igen eller skrive til os under Kontakt. Vi svarer typisk inden for en arbejdsdag." },
  { target: "add", title: "Kom i gang", text: "Klik på Tilføj bolig, indsæt et link i søgefeltet, eller opret din første søgeagent under Find boliger." },
];

const EVENT = "ni:tour";
const FLAG = "ni_tour_start";

/** Start the guide from anywhere in the app (menu, account page). */
export function startTour() {
  try { sessionStorage.setItem(FLAG, "1"); } catch {}
  window.dispatchEvent(new Event(EVENT));
}

const visible = (sel: string): HTMLElement | null => {
  const els = Array.from(document.querySelectorAll<HTMLElement>(`[data-tour="${sel}"]`));
  return els.find((e) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 && getComputedStyle(e).visibility !== "hidden"; }) ?? null;
};

type Rect = { top: number; left: number; width: number; height: number };
const PAD = 8;

export function Tour({ name, initial }: { name: string; initial: string | null }) {
  const path = usePathname();
  const router = useRouter();
  const [phase, setPhase] = useState<"off" | "prompt" | "touring">("off");
  const [steps, setSteps] = useState<Step[]>(STEPS);
  const [i, setI] = useState(0);
  const [rect, setRect] = useState<Rect | null>(null);
  const [vw, setVw] = useState(1280);
  const [vh, setVh] = useState(800);
  const card = useRef<HTMLDivElement>(null);
  const [cardH, setCardH] = useState(220);

  const remember = useCallback(async (state: "done" | "skipped") => {
    try { localStorage.setItem("ni_tour", state); } catch {}
    const supabase = createClient();
    await supabase?.auth.updateUser({ data: { tour: state } }).catch(() => null);
  }, []);

  // First visit to the overview: offer the guide.
  useEffect(() => {
    if (path !== "/app") return;
    let seen = initial;
    try { seen = seen ?? localStorage.getItem("ni_tour"); } catch {}
    let flagged = false;
    try { flagged = sessionStorage.getItem(FLAG) === "1"; } catch {}
    if (flagged) { try { sessionStorage.removeItem(FLAG); } catch {} begin(); return; }
    if (!seen) { const t = setTimeout(() => setPhase("prompt"), 600); return () => clearTimeout(t); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path]);

  // "Vis guiden igen" from any page: go to the overview, then start.
  useEffect(() => {
    const on = () => {
      if (window.location.pathname !== "/app") { router.push("/app"); return; }
      try { sessionStorage.removeItem(FLAG); } catch {}
      begin();
    };
    window.addEventListener(EVENT, on);
    return () => window.removeEventListener(EVENT, on);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  const begin = () => {
    // Only the steps that exist on this screen (rail on desktop, tab bar on phones).
    const avail = STEPS.filter((s) => !s.target || visible(s.target));
    setSteps(avail);
    setI(0);
    setPhase("touring");
  };

  const finish = useCallback((state: "done" | "skipped") => { setPhase("off"); setRect(null); void remember(state); }, [remember]);

  // Measure the current target; keep it measured while scrolling or resizing.
  const measure = useCallback(() => {
    setVw(window.innerWidth); setVh(window.innerHeight);
    const s = steps[i];
    const el = s?.target ? visible(s.target) : null;
    if (!el) { setRect(null); return; }
    const r = el.getBoundingClientRect();
    setRect({ top: r.top - PAD, left: r.left - PAD, width: r.width + PAD * 2, height: r.height + PAD * 2 });
  }, [steps, i]);

  useEffect(() => {
    if (phase !== "touring") return;
    const s = steps[i];
    const el = s?.target ? visible(s.target) : null;
    const fixed = el && getComputedStyle(el).position === "fixed" || el?.closest("aside, header, nav");
    if (el && !fixed) {
      const r = el.getBoundingClientRect();
      if (r.top < 80 || r.bottom > window.innerHeight - 120) el.scrollIntoView({ block: "center", behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
    }
    measure();
    const t1 = setTimeout(measure, 380);
    let raf = 0;
    const onMove = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(measure); };
    window.addEventListener("resize", onMove);
    window.addEventListener("scroll", onMove, { passive: true, capture: true });
    return () => { clearTimeout(t1); cancelAnimationFrame(raf); window.removeEventListener("resize", onMove); window.removeEventListener("scroll", onMove, { capture: true }); };
  }, [phase, i, steps, measure]);

  useLayoutEffect(() => { if (card.current) setCardH(card.current.offsetHeight); }, [i, phase, rect]);
  useEffect(() => { if (phase !== "off") card.current?.focus(); }, [phase, i]);
  // While the guide is open, nothing else floats on top (cookie bar, menus).
  useEffect(() => {
    document.documentElement.classList.toggle("tour-active", phase !== "off");
    return () => document.documentElement.classList.remove("tour-active");
  }, [phase]);

  // Keyboard: arrows to move, Escape to leave.
  useEffect(() => {
    if (phase === "off") return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") finish(phase === "prompt" ? "skipped" : "done");
      if (phase !== "touring") return;
      if (e.key === "ArrowRight") setI((x) => Math.min(x + 1, steps.length - 1));
      if (e.key === "ArrowLeft") setI((x) => Math.max(x - 1, 0));
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [phase, steps.length, finish]);

  if (phase === "off") return null;

  if (phase === "prompt") {
    return (
      <div className="fixed inset-0 z-[1000] flex items-end justify-center bg-[#0b1b33]/55 p-3 backdrop-blur-[2px] sm:items-center sm:p-6" role="dialog" aria-modal="true" aria-labelledby="tour-welcome">
        <div ref={card} tabIndex={-1} className="tour-pop relative w-full max-w-[460px] overflow-hidden rounded-2xl bg-white shadow-2xl outline-none">
          <div className="relative h-40 overflow-hidden bg-[#0b1b33] sm:h-44">
            <Image src="/app/nordhavn.jpg" alt="Nordhavn i København set fra luften" fill priority sizes="460px" className="tour-photo object-cover" />
            <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-[#0b1b33]/55 via-transparent to-transparent" />
            <span className="absolute bottom-3 left-4 rounded-md bg-black/30 px-2 py-0.5 text-[11px] font-medium text-white/90 backdrop-blur-sm">Nordhavn, København</span>
          </div>
          <div className="p-6 sm:p-7">
            <h2 id="tour-welcome" className="text-[24px] font-semibold leading-tight tracking-[-0.02em] text-slate-900">Velkommen til NordInvest{name ? `, ${name}` : ""}.</h2>
            <p className="mt-2 text-[16px] leading-relaxed text-slate-600">Få en kort gennemgang af, hvor du finder hvad, og hvordan delene hænger sammen.</p>
            <button type="button" onClick={begin} className="mt-6 inline-flex min-h-[50px] w-full items-center justify-center gap-2 rounded-xl bg-blue-600 text-[16px] font-semibold text-white transition-colors hover:bg-blue-500 active:translate-y-px">
              Begynd tutorial <ArrowRight size={17} />
            </button>
            <div className="mt-4 flex items-center justify-between text-[13px] text-slate-500">
              <span>Tager cirka 2 minutter</span>
              <button type="button" onClick={() => finish("skipped")} className="min-h-[40px] px-1 font-medium text-slate-500 underline-offset-4 hover:text-slate-800 hover:underline">Spring over</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const s = steps[i];
  const last = i === steps.length - 1;
  const phone = vw < 640;
  const CARD_W = Math.min(360, vw - 24);

  // Where the card goes: next to narrow targets (the rail), else below or above.
  let pos: React.CSSProperties = {};
  if (!rect) {
    pos = { left: (vw - CARD_W) / 2, top: Math.max(16, (vh - cardH) / 2) };
  } else if (phone) {
    const targetLow = rect.top + rect.height / 2 > vh * 0.5;
    pos = targetLow ? { left: 12, top: 76 } : { left: 12, top: vh - cardH - 12 - (rect.top + rect.height > vh - 80 ? 70 : 0) };
  } else if (rect.left + rect.width + CARD_W + 24 < vw && rect.width < vw * 0.35) {
    pos = { left: rect.left + rect.width + 16, top: Math.min(Math.max(16, rect.top), vh - cardH - 16) };
  } else if (rect.top + rect.height + cardH + 24 < vh) {
    pos = { left: Math.min(Math.max(16, rect.left), vw - CARD_W - 16), top: rect.top + rect.height + 14 };
  } else {
    pos = { left: Math.min(Math.max(16, rect.left), vw - CARD_W - 16), top: Math.max(16, rect.top - cardH - 14) };
  }

  return (
    <div className="fixed inset-0 z-[1000]" role="dialog" aria-modal="true" aria-labelledby="tour-title">
      {/* Dim everything; the spotlight is a hole made by a huge shadow. Clicks outside do nothing. */}
      {rect ? (
        <div aria-hidden className="tour-spot pointer-events-none fixed rounded-xl" style={{ top: rect.top, left: rect.left, width: rect.width, height: rect.height }} />
      ) : (
        <div aria-hidden className="fixed inset-0 bg-[#0b1b33]/60" />
      )}
      <div ref={card} tabIndex={-1} key={i}
        className={`tour-pop fixed rounded-2xl bg-white p-5 shadow-2xl outline-none ring-1 ring-slate-900/5 ${phone ? "" : ""}`}
        style={{ ...pos, width: phone ? vw - 24 : CARD_W }}>
        <div className="flex items-start justify-between gap-3">
          <p className="text-[13px] font-semibold text-blue-700">Trin {i + 1} af {steps.length}</p>
          <button type="button" aria-label="Afslut guiden" onClick={() => finish("done")} className="-m-2 flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700"><X size={17} /></button>
        </div>
        <h2 id="tour-title" className="mt-1 text-[19px] font-semibold leading-snug tracking-[-0.01em] text-slate-900">{s.title}</h2>
        <p className="mt-1.5 text-[15px] leading-relaxed text-slate-600">{s.text}</p>
        <div className="mt-4 flex h-1 gap-1" aria-hidden>
          {steps.map((_, k) => <span key={k} className={`h-1 flex-1 rounded-full transition-colors duration-300 ${k <= i ? "bg-blue-600" : "bg-slate-200"}`} />)}
        </div>
        <div className="mt-4 flex items-center justify-between gap-2">
          {i > 0
            ? <button type="button" onClick={() => setI(i - 1)} className="inline-flex min-h-[44px] items-center gap-1.5 rounded-lg px-2 text-[15px] font-medium text-slate-600 hover:text-slate-900"><ArrowLeft size={16} /> Tilbage</button>
            : <button type="button" onClick={() => finish("skipped")} className="min-h-[44px] px-2 text-[14px] font-medium text-slate-500 hover:text-slate-800">Spring over</button>}
          <button type="button" onClick={() => (last ? finish("done") : setI(i + 1))} className="inline-flex min-h-[44px] items-center gap-1.5 rounded-lg bg-blue-600 px-4 text-[15px] font-semibold text-white hover:bg-blue-500">
            {last ? "Kom i gang" : "Næste"} {!last && <ArrowRight size={16} />}
          </button>
        </div>
      </div>
    </div>
  );
}
