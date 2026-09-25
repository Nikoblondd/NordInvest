"use client";

import { useState, type FormEvent } from "react";
import { Check, Eye, EyeOff, Loader2, UserRound } from "lucide-react";
import type { GameAccount } from "./account";

/*
 * One-step profile form used inside the game: in the lobby ("Gem din
 * fremgang") and on the end screens ("Gem dine +67 XP"). Never a wall — the
 * game works without it, the form just sits where saving feels worth it.
 */

export function AccountForm({
  account,
  defaultName,
  tone = "light",
  onDone,
}: {
  account: GameAccount;
  defaultName: string;
  tone?: "light" | "dark";
  onDone?: (kind: "signup" | "login") => void;
}) {
  const [mode, setMode] = useState<"signup" | "login">("signup");
  const [username, setUsername] = useState(defaultName === "Spiller 1" ? "" : defaultName);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dark = tone === "dark";

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (mode === "signup" && username.trim().length < 2) return setError("Vælg et brugernavn på mindst 2 tegn.");
    if (password.length < 6) return setError("Adgangskoden skal være på mindst 6 tegn.");
    setBusy(true);
    const r = mode === "signup" ? await account.signUp(username, email, password) : await account.signIn(email, password);
    setBusy(false);
    if (r.ok) return onDone?.(mode);
    setError(r.error);
    if ("exists" in r && r.exists) setMode("login");
  }

  const field = `h-11 w-full rounded-xl px-3 text-sm font-medium outline-none ring-1 ring-inset transition ${
    dark
      ? "bg-white/10 text-white ring-white/20 placeholder:text-blue-100/60 focus:bg-white/15 focus:ring-2 focus:ring-white"
      : "bg-slate-50 text-slate-900 ring-slate-200 placeholder:text-slate-400 focus:bg-white focus:ring-2 focus:ring-blue-500"
  }`;

  return (
    <form onSubmit={submit} className="space-y-2" noValidate>
      {mode === "signup" && (
        <input
          className={field}
          value={username}
          onChange={(e) => setUsername(e.target.value.slice(0, 18))}
          placeholder="Brugernavn"
          autoComplete="username"
          aria-label="Brugernavn"
          required
        />
      )}
      <input
        className={field}
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="E-mail"
        autoComplete="email"
        inputMode="email"
        aria-label="E-mail"
        required
      />
      <div className="relative">
        <input
          className={`${field} pr-11`}
          type={show ? "text" : "password"}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder={mode === "signup" ? "Adgangskode (mindst 6 tegn)" : "Adgangskode"}
          autoComplete={mode === "signup" ? "new-password" : "current-password"}
          aria-label="Adgangskode"
          required
        />
        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          aria-label={show ? "Skjul adgangskode" : "Vis adgangskode"}
          className={`absolute right-2 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-lg ${dark ? "text-blue-100" : "text-slate-400 hover:text-slate-700"}`}
        >
          {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
      {error && (
        <p role="alert" className={`rounded-lg px-3 py-2 text-sm ${dark ? "bg-rose-500/20 text-rose-100" : "bg-rose-50 text-rose-700"}`}>
          {error}
        </p>
      )}
      <button
        type="submit"
        disabled={busy || !email || !password}
        className={`flex h-12 w-full items-center justify-center gap-2 rounded-xl text-sm font-extrabold shadow-btn transition active:translate-y-px disabled:opacity-60 ${
          dark ? "bg-white text-blue-700 hover:bg-blue-50" : "bg-blue-600 text-white hover:bg-blue-700"
        }`}
      >
        {busy && <Loader2 className="h-4 w-4 animate-spin" />}
        {mode === "signup" ? "Opret profil" : "Log ind"}
      </button>
      <p className={`text-center text-xs ${dark ? "text-blue-100" : "text-slate-500"}`}>
        {mode === "signup" ? "Har du allerede en NordInvest-konto?" : "Ny her?"}{" "}
        <button
          type="button"
          onClick={() => {
            setError(null);
            setMode(mode === "signup" ? "login" : "signup");
          }}
          className={`font-bold underline-offset-2 hover:underline ${dark ? "text-white" : "text-blue-700"}`}
        >
          {mode === "signup" ? "Log ind" : "Opret profil"}
        </button>
      </p>
    </form>
  );
}

/** Lobby strip: a quiet invitation, or who you're playing as. */
export function AccountStrip({
  account,
  defaultName,
  onDone,
}: {
  account: GameAccount;
  defaultName: string;
  onDone: (kind: "signup" | "login") => void;
}) {
  const [open, setOpen] = useState(false);
  if (!account.configured || !account.ready) return null;

  if (account.user) {
    return (
      <div className="flex flex-wrap items-center gap-2 rounded-2xl bg-white/10 px-3 py-2.5 text-sm text-blue-50 ring-1 ring-inset ring-white/15">
        <span className="grid h-7 w-7 place-items-center rounded-full bg-emerald-400 text-slate-900">
          <Check className="h-4 w-4" strokeWidth={3} />
        </span>
        Du spiller som <strong className="text-white">{account.username}</strong>. Din fremgang gemmes på din profil.
      </div>
    );
  }

  return (
    <div className="rounded-2xl bg-white/10 p-3 ring-1 ring-inset ring-white/15">
      <div className="flex flex-wrap items-center gap-3">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white/15 text-white">
          <UserRound className="h-5 w-5" />
        </span>
        <p className="min-w-0 flex-1 text-sm text-blue-50">
          <strong className="text-white">Gem din fremgang.</strong> Få dit eget navn på ranglisten, og behold XP, badges og
          stime på alle dine enheder.
        </p>
        {!open && (
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="rounded-xl bg-white px-4 py-2 text-sm font-extrabold text-blue-700 shadow-btn transition hover:bg-blue-50 active:translate-y-px"
          >
            Opret profil
          </button>
        )}
      </div>
      {open && (
        <div className="mt-3 max-w-md">
          <AccountForm account={account} defaultName={defaultName} tone="dark" onDone={onDone} />
        </div>
      )}
    </div>
  );
}

/** End-screen card: the moment people have something worth saving. */
export function SaveProgressCard({
  account,
  defaultName,
  xp,
  onDone,
}: {
  account: GameAccount;
  defaultName: string;
  xp: number;
  onDone: (kind: "signup" | "login") => void;
}) {
  if (!account.configured || !account.ready || account.user) return null;
  return (
    <section className="rounded-3xl bg-white p-5 shadow-card ring-2 ring-blue-200 sm:p-6">
      <h3 className="text-lg font-extrabold text-slate-900">Gem dine {xp > 0 ? `+${xp} XP` : "point"}</h3>
      <p className="mt-1 text-sm text-slate-600">
        Opret en profil på ti sekunder. Så er du logget ind næste gang, og din stime, dine badges og dit navn på ranglisten
        er dine.
      </p>
      <div className="mt-4">
        <AccountForm account={account} defaultName={defaultName} onDone={onDone} />
      </div>
    </section>
  );
}
