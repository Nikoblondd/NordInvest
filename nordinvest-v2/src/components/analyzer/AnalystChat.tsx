"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { MessageSquare, Send, X, Loader2 } from "lucide-react";
import { clsx } from "@/lib/clsx";

type Msg = { role: "user" | "assistant"; content: string };

// Light, safe rendering so the assistant reads clean: **bold** becomes real bold,
// "- " lines become tidy bullets, blank lines become breathing room. No raw
// markdown symbols ever show.
function inline(s: string): ReactNode[] {
  return s.split(/(\*\*[^*]+\*\*)/g).map((p, i) =>
    /^\*\*[^*]+\*\*$/.test(p)
      ? <strong key={i} className="font-semibold text-slate-900">{p.slice(2, -2)}</strong>
      : <span key={i}>{p}</span>,
  );
}
function renderRich(text: string): ReactNode[] {
  const out: ReactNode[] = [];
  let bullets: ReactNode[] = [];
  const flush = () => {
    if (bullets.length) {
      out.push(<ul key={`u${out.length}`} className="space-y-1">{bullets}</ul>);
      bullets = [];
    }
  };
  text.split("\n").forEach((raw, i) => {
    const line = raw.replace(/\s+$/, "");
    if (/^\s*[-•]\s+/.test(line)) {
      bullets.push(
        <li key={i} className="flex gap-2">
          <span className="mt-[3px] text-slate-300">•</span>
          <span>{inline(line.replace(/^\s*[-•]\s+/, ""))}</span>
        </li>,
      );
      return;
    }
    flush();
    if (line.trim()) out.push(<p key={i}>{inline(line)}</p>);
  });
  flush();
  return out;
}

const GREETING =
  "Jeg er Analytikeren og kender tallene i din analyse. Spørg om et nøgletal, et begreb, datagrundlaget eller min vurdering af investeringen.";

export function AnalystChat({ context }: { context: Record<string, unknown> }) {
  const [open, setOpen] = useState(false);
  const [nudge, setNudge] = useState(false);
  const [nudgeDone, setNudgeDone] = useState(false);
  // Phones: the bubble waits until the reader has scrolled past the verdict;
  // on first load it sat on top of the chapter bar's "Justér" button.
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 240);
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);
  const [messages, setMessages] = useState<Msg[]>([{ role: "assistant", content: GREETING }]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const ctxRef = useRef(context);
  useEffect(() => { ctxRef.current = context; }, [context]);

  // Proactive nudge: once the user has scrolled ~30% down the analysis.
  useEffect(() => {
    if (nudgeDone) return;
    const onScroll = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const pct = max > 0 ? window.scrollY / max : 0;
      if (pct >= 0.3) {
        // Once per device, and only for a few seconds: it must never sit on top of the numbers.
        let seen = false;
        try { seen = localStorage.getItem("ni_analyst_nudge") === "1"; localStorage.setItem("ni_analyst_nudge", "1"); } catch { /* storage blocked */ }
        if (!seen) { setNudge(true); setTimeout(() => setNudge(false), 9000); }
        setNudgeDone(true);
        window.removeEventListener("scroll", onScroll);
      }
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [nudgeDone]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, open]);

  const openChat = () => { setOpen(true); setNudge(false); };

  async function send() {
    const q = input.trim();
    if (!q || streaming) return;
    setInput("");
    const next: Msg[] = [...messages, { role: "user", content: q }, { role: "assistant", content: "" }];
    setMessages(next);
    setStreaming(true);

    // Send the real conversation (drop the display-only greeting: start at first user turn).
    const convo = next.filter((m) => !(m.role === "assistant" && m.content === "")); // exclude placeholder
    const firstUser = convo.findIndex((m) => m.role === "user");
    const payload = firstUser >= 0 ? convo.slice(firstUser) : convo;

    try {
      const res = await fetch("/api/analyst/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ context: ctxRef.current, messages: payload, lang: document.documentElement.getAttribute("data-lang") === "en" ? "en" : "da" }),
      });
      if (!res.body) throw new Error("no stream");
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let acc = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        acc += dec.decode(value, { stream: true });
        setMessages((cur) => {
          const copy = cur.slice();
          copy[copy.length - 1] = { role: "assistant", content: acc };
          return copy;
        });
      }
    } catch {
      setMessages((cur) => {
        const copy = cur.slice();
        copy[copy.length - 1] = {
          role: "assistant",
          content: document.documentElement.getAttribute("data-lang") === "en" ? "Sorry, something went wrong. Please try again." : "Beklager, der opstod en fejl. Prøv igen.",
        };
        return copy;
      });
    } finally {
      setStreaming(false);
    }
  }

  return (
    <>
      {/* proactive nudge */}
      {nudge && !open && (
        // Desktop only: on a phone this card would sit on top of the analysis.
        // There the bubble's dot is the nudge.
        <div className="fixed bottom-24 right-5 z-40 hidden max-w-[260px] animate-[fadeIn_.3s_ease] rounded-2xl rounded-br-md border border-slate-200 bg-white p-4 shadow-xl sm:block">
          <button
            onClick={() => setNudge(false)}
            className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-400 shadow hover:text-slate-700"
            aria-label="Luk"
          >
            <X size={13} />
          </button>
          <div className="text-[13px] font-semibold text-slate-900">Analytikeren</div>
          <p className="mt-1 text-[13px] leading-snug text-slate-600">
            Spørgsmål til tallene eller beregningen? Spørg Analytikeren.
          </p>
          <button
            onClick={openChat}
            className="mt-3 w-full rounded-lg bg-slate-900 px-3 py-2 text-[13px] font-semibold text-white transition-colors hover:bg-slate-800"
          >
            Spørg Analytikeren
          </button>
        </div>
      )}

      {/* chat panel */}
      {open && (
        <div className="fixed bottom-5 right-5 z-50 flex h-[min(560px,80vh)] w-[min(384px,calc(100vw-2.5rem))] flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl">
          {/* header */}
          <div className="flex items-center justify-between gap-3 bg-gradient-to-br from-[#0F1F3D] to-[#25345a] px-4 py-3.5 text-white">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/15 ring-1 ring-white/25">
                <MessageSquare size={18} />
              </div>
              <div>
                <div className="text-sm font-bold leading-tight">Analytikeren</div>
                <div className="text-[11px] text-blue-100">Din ekspert i denne analyse</div>
              </div>
            </div>
            <button onClick={() => setOpen(false)} className="rounded-full p-1.5 text-blue-100 transition-colors hover:bg-white/10 hover:text-white" aria-label="Luk">
              <X size={18} />
            </button>
          </div>

          {/* messages */}
          <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto bg-slate-50 px-4 py-4">
            {messages.map((m, i) => (
              <div key={i} className={clsx("flex", m.role === "user" ? "justify-end" : "justify-start")} {...(i > 0 ? { "data-no-i18n": "" } : {})}>
                <div
                  className={clsx(
                    "max-w-[88%] rounded-2xl px-3.5 py-2.5 text-[13.5px] leading-relaxed",
                    m.role === "user"
                      ? "whitespace-pre-wrap rounded-br-md bg-blue-600 text-white"
                      : "space-y-2 rounded-bl-md border border-slate-200 bg-white text-slate-700",
                  )}
                >
                  {m.role === "user"
                    ? m.content
                    : m.content
                    ? renderRich(m.content)
                    : (streaming && i === messages.length - 1 ? <Loader2 size={15} className="animate-spin text-slate-400" /> : "")}
                </div>
              </div>
            ))}
          </div>

          {/* input */}
          <div className="border-t border-slate-200 bg-white p-3">
            <div className="flex items-end gap-2">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
                rows={1}
                placeholder="Spørg om et nøgletal, et begreb eller vurderingen…"
                className="max-h-28 flex-1 resize-none rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-blue-500 focus:bg-white"
              />
              <button
                onClick={send}
                disabled={streaming || !input.trim()}
                className="flex h-10 w-10 flex-none items-center justify-center rounded-xl bg-slate-900 text-white transition-colors hover:bg-slate-800 disabled:opacity-40"
                aria-label="Send"
              >
                {streaming ? <Loader2 size={17} className="animate-spin" /> : <Send size={16} />}
              </button>
            </div>
            <p className="mt-1.5 px-1 text-[10px] text-slate-400">Analytikeren forklarer og vurderer. Det er ikke finansiel rådgivning.</p>
          </div>
        </div>
      )}

      {/* floating bubble */}
      {!open && (
        <button
          onClick={openChat}
          className={`group fixed bottom-[max(1rem,env(safe-area-inset-bottom))] right-4 z-40 ${scrolled ? "flex" : "hidden sm:flex"} h-12 w-12 items-center justify-center rounded-full sm:bottom-5 sm:right-5 sm:h-14 sm:w-14 bg-slate-900 text-white shadow-[0_10px_30px_-8px_rgba(15,23,42,0.45)] ring-1 ring-black/5 transition-transform hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2`}
          aria-label="Åbn Analytikeren"
        >
          <MessageSquare size={22} />
          {nudge && <span className="absolute -right-0.5 -top-0.5 h-3.5 w-3.5 rounded-full border-2 border-white bg-emerald-400" />}
        </button>
      )}

      <style jsx>{`@keyframes fadeIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }`}</style>
    </>
  );
}
