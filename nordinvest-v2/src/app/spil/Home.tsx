"use client";

import { useEffect, useState } from "react";
import { ArrowRight, Check, Crown, Flame, Lock, Minus, Plus, Share2, Timer, Trophy, Users } from "lucide-react";
import { LEVELS, TURN_SECONDS, levelFor } from "./gameLogic";
import { BADGES, liveStreak, msToNextDaily, todayDK, type Profile } from "./progress";
import { playerColor, useTicker } from "./ui";

export const REGIONS: { key: string; label: string; group: string }[] = [
  { key: "hele-dk", label: "Hele Danmark", group: "Landsdele" },
  { key: "sjaelland", label: "Sjælland", group: "Landsdele" },
  { key: "fyn", label: "Fyn", group: "Landsdele" },
  { key: "jylland", label: "Jylland", group: "Landsdele" },
  { key: "kbh", label: "Storkøbenhavn", group: "Byer" },
  { key: "aarhus", label: "Aarhus", group: "Byer" },
  { key: "odense", label: "Odense", group: "Byer" },
  { key: "aalborg", label: "Aalborg", group: "Byer" },
  { key: "esbjerg", label: "Esbjerg", group: "Byer" },
  { key: "vejle", label: "Vejle", group: "Byer" },
  { key: "randers", label: "Randers", group: "Byer" },
  { key: "kolding", label: "Kolding", group: "Byer" },
  { key: "horsens", label: "Horsens", group: "Byer" },
  { key: "roskilde", label: "Roskilde", group: "Byer" },
  { key: "helsingoer", label: "Helsingør", group: "Byer" },
  { key: "fredensborg", label: "Fredensborg", group: "Byer" },
  { key: "hilleroed", label: "Hillerød", group: "Byer" },
  { key: "koege", label: "Køge", group: "Byer" },
  { key: "naestved", label: "Næstved", group: "Byer" },
  { key: "slagelse", label: "Slagelse", group: "Byer" },
  { key: "holbaek", label: "Holbæk", group: "Byer" },
  { key: "frederikshavn", label: "Frederikshavn", group: "Byer" },
  { key: "silkeborg", label: "Silkeborg", group: "Byer" },
  { key: "viborg", label: "Viborg", group: "Byer" },
  { key: "herning", label: "Herning", group: "Byer" },
];

export const ROUND_OPTIONS = [5, 10, 15];

export type Board = { total: number; top: { name: string; score: number; me?: boolean }[]; me: { score: number; rank: number } | null } | null;

export type FreeSettings = {
  players: { id: number; name: string }[];
  region: string;
  rounds: number;
  timed: boolean;
};

/* ---------- profile strip ---------- */

export function ProfileStrip({ profile, seen }: { profile: Profile; seen: number }) {
  const lvl = levelFor(profile.xp);
  const streak = liveStreak(profile);
  const badges = Object.keys(profile.badges).length;
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      <div className="col-span-2 rounded-2xl bg-white/10 p-3 ring-1 ring-inset ring-white/15 sm:col-span-2">
        <div className="flex items-center justify-between text-xs text-blue-100">
          <span>Niveau {lvl.level}</span>
          <span className="tabular-nums">{profile.xp.toLocaleString("da-DK")} XP</span>
        </div>
        <div className="mt-0.5 text-lg font-bold text-white">{lvl.title}</div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/15">
          <div className="h-full rounded-full bg-gradient-to-r from-amber-300 to-amber-500 transition-all duration-700" style={{ width: `${lvl.progress * 100}%` }} />
        </div>
        <div className="mt-1 text-[11px] text-blue-100/80">
          {lvl.next ? `${(lvl.next.xp - profile.xp).toLocaleString("da-DK")} XP til ${lvl.next.title}` : "Højeste niveau"}
        </div>
      </div>
      <Stat icon={<Flame className="h-4 w-4" />} label="Dage i træk" value={streak} hot={streak > 0} />
      <Stat icon={<Trophy className="h-4 w-4" />} label="Badges" value={`${badges}/${BADGES.length}`} sub={`${seen.toLocaleString("da-DK")} boliger set`} />
    </div>
  );
}

function Stat({ icon, label, value, sub, hot }: { icon: React.ReactNode; label: string; value: React.ReactNode; sub?: string; hot?: boolean }) {
  return (
    <div className="rounded-2xl bg-white/10 p-3 ring-1 ring-inset ring-white/15">
      <div className={`flex items-center gap-1.5 text-xs ${hot ? "text-amber-300" : "text-blue-100"}`}>
        {icon}
        {label}
      </div>
      <div className={`mt-1 text-2xl font-bold tabular-nums ${hot ? "text-amber-300" : "text-white"}`}>{value}</div>
      {sub && <div className="text-[11px] text-blue-100/80">{sub}</div>}
    </div>
  );
}

/* ---------- daily card ---------- */

export function DailyCard({
  profile,
  board,
  onPlay,
  onShare,
  onName,
  available,
  accountName,
}: {
  profile: Profile;
  board: Board;
  onPlay: () => void;
  onShare: () => void;
  onName: (n: string) => void;
  available: boolean | null;
  accountName: string | null;
}) {
  const today = todayDK();
  const done = profile.daily[today];
  useTicker(!!done, 1000);
  const ms = msToNextDaily();
  const hh = String(Math.floor(ms / 3_600_000)).padStart(2, "0");
  const mm = String(Math.floor((ms % 3_600_000) / 60_000)).padStart(2, "0");
  const ss = String(Math.floor((ms % 60_000) / 1000)).padStart(2, "0");
  const rank = board?.me?.rank ?? done?.rank;
  const total = board?.total ?? done?.total;

  return (
    <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-blue-700 to-[#0b1b33] p-5 text-white shadow-card-lift sm:p-6">
      <div aria-hidden className="daily-sheen absolute inset-0" />
      <div className="relative">
        <div className="flex items-center justify-between gap-3">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold">
            <Crown className="h-3.5 w-3.5" /> Dagens 5
          </span>
          <span className="text-xs text-blue-100">
            {new Date().toLocaleDateString("da-DK", { weekday: "long", day: "numeric", month: "long" })}
          </span>
        </div>

        {done ? (
          <>
            <div className="mt-4 flex items-end gap-3">
              <div className="text-5xl font-extrabold tabular-nums leading-none">{done.score}</div>
              <div className="pb-1 text-blue-100">/ 500 point</div>
            </div>
            <div className="mt-2 text-2xl tracking-[0.15em]" aria-label="Dine resultater pr. bolig">
              {done.squares}
            </div>
            {rank && total ? (
              <p className="mt-2 text-sm text-blue-50">
                Nr. <strong>{rank}</strong> af {total} i dag
                {total > 1 && ` · bedre end ${Math.round(((total - rank) / (total - 1)) * 100)} %`}
              </p>
            ) : null}
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <button type="button" onClick={onShare} className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-bold text-blue-700 shadow-btn transition hover:bg-blue-50 active:translate-y-px">
                <Share2 className="h-4 w-4" /> Del resultat
              </button>
              <span className="text-sm text-blue-100">
                Nye boliger om <span className="font-bold tabular-nums text-white">{hh}:{mm}:{ss}</span>
              </span>
            </div>
          </>
        ) : (
          <>
            <h2 className="mt-4 text-2xl font-extrabold leading-tight sm:text-3xl">5 boliger. Hele Danmark gætter de samme.</h2>
            <p className="mt-2 max-w-md text-sm text-blue-100">
              Én chance om dagen. Se hvor du lander på ranglisten, og hold din stime i live.
            </p>
            {accountName ? (
              <p className="mt-4 text-sm text-blue-100">
                Du er på ranglisten som <strong className="text-white">{accountName}</strong>.
              </p>
            ) : (
              <label className="mt-4 block max-w-xs">
                <span className="text-xs text-blue-100">Dit navn på ranglisten</span>
                <input
                  value={profile.name}
                  onChange={(e) => onName(e.target.value.slice(0, 18))}
                  placeholder="Skriv dit navn"
                  maxLength={18}
                  className="mt-1 h-11 w-full rounded-xl bg-white/15 px-3 text-sm font-semibold text-white outline-none ring-1 ring-inset ring-white/25 placeholder:text-blue-100/70 focus:bg-white/20 focus:ring-2 focus:ring-white"
                />
              </label>
            )}
            <button
              type="button"
              onClick={onPlay}
              disabled={!available}
              className="mt-4 inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-bold text-blue-700 shadow-btn transition hover:bg-blue-50 active:translate-y-px disabled:opacity-60"
            >
              {available ? "Spil dagens 5" : available === null ? "Henter dagens boliger …" : "Ikke klar lige nu, prøv igen om lidt"}{" "}
              {available && <ArrowRight className="h-4 w-4" />}
            </button>
          </>
        )}
      </div>
    </section>
  );
}

/* ---------- free play card ---------- */

export function FreePlayCard({
  settings,
  setSettings,
  onStart,
}: {
  settings: FreeSettings;
  setSettings: (s: FreeSettings) => void;
  onStart: () => void;
}) {
  const { players } = settings;
  const setPlayers = (p: FreeSettings["players"]) => setSettings({ ...settings, players: p });
  return (
    <section className="rounded-3xl bg-white p-5 shadow-card ring-1 ring-slate-200 sm:p-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-extrabold text-slate-900">Fri leg</h2>
        <span className="text-xs text-slate-500">Altid nye boliger</span>
      </div>

      <div className="mt-4">
        <div className="mb-2 flex items-center justify-between">
          <span className="flex items-center gap-1.5 text-sm font-semibold text-slate-900">
            <Users className="h-4 w-4 text-slate-500" /> Spillere
          </span>
          <span className="text-xs text-slate-500">1 til 8</span>
        </div>
        <div className="space-y-2">
          {players.map((p, i) => (
            <div key={p.id} className="flex items-center gap-2">
              <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-xs font-bold text-white" style={{ background: playerColor(i) }}>
                {i + 1}
              </span>
              <input
                value={p.name}
                maxLength={18}
                onChange={(e) => setPlayers(players.map((x) => (x.id === p.id ? { ...x, name: e.target.value.slice(0, 18) } : x)))}
                className="h-10 min-w-0 flex-1 rounded-xl bg-slate-50 px-3 text-sm font-medium text-slate-900 outline-none ring-1 ring-inset ring-slate-200 focus:bg-white focus:ring-2 focus:ring-blue-500"
                placeholder={`Spiller ${i + 1}`}
              />
              {players.length > 1 && (
                <button
                  type="button"
                  aria-label={`Fjern ${p.name}`}
                  onClick={() => setPlayers(players.filter((x) => x.id !== p.id))}
                  className="grid h-10 w-10 shrink-0 place-items-center rounded-xl text-slate-400 ring-1 ring-inset ring-slate-200 hover:text-rose-600"
                >
                  <Minus className="h-4 w-4" />
                </button>
              )}
            </div>
          ))}
          {players.length < 8 && (
            <button
              type="button"
              onClick={() => {
                const id = Math.max(0, ...players.map((p) => p.id)) + 1;
                setPlayers([...players, { id, name: `Spiller ${players.length + 1}` }]);
              }}
              className="flex h-10 w-full items-center justify-center gap-1.5 rounded-xl text-sm font-semibold text-blue-700 ring-1 ring-inset ring-dashed ring-blue-200 hover:bg-blue-50"
            >
              <Plus className="h-4 w-4" /> Tilføj spiller
            </button>
          )}
        </div>
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="text-sm font-semibold text-slate-900">Område</span>
          <select
            value={settings.region}
            onChange={(e) => setSettings({ ...settings, region: e.target.value })}
            className="mt-2 h-11 w-full rounded-xl bg-slate-50 px-3 text-sm font-medium text-slate-900 outline-none ring-1 ring-inset ring-slate-200 focus:ring-2 focus:ring-blue-500"
          >
            {["Landsdele", "Byer"].map((g) => (
              <optgroup key={g} label={g}>
                {REGIONS.filter((r) => r.group === g).map((r) => (
                  <option key={r.key} value={r.key}>
                    {r.label}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </label>
        <div>
          <span className="text-sm font-semibold text-slate-900">Runder</span>
          <div className="mt-2 grid grid-cols-3 gap-2">
            {ROUND_OPTIONS.map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setSettings({ ...settings, rounds: n })}
                className={`h-11 rounded-xl text-sm font-bold ring-1 ring-inset transition ${
                  settings.rounds === n ? "bg-slate-900 text-white ring-slate-900" : "bg-white text-slate-700 ring-slate-200 hover:ring-slate-300"
                }`}
              >
                {n}
              </button>
            ))}
          </div>
        </div>
      </div>

      <button
        type="button"
        role="switch"
        aria-checked={settings.timed}
        onClick={() => setSettings({ ...settings, timed: !settings.timed })}
        className={`mt-5 flex w-full items-center gap-3 rounded-2xl p-3 text-left ring-1 ring-inset transition ${
          settings.timed ? "bg-amber-50 ring-amber-300" : "bg-slate-50 ring-slate-200"
        }`}
      >
        <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${settings.timed ? "bg-amber-400 text-slate-900" : "bg-white text-slate-500 ring-1 ring-slate-200"}`}>
          <Timer className="h-5 w-5" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-bold text-slate-900">Tidspres</span>
          <span className="block text-xs text-slate-600">
            {TURN_SECONDS} sek. pr. spiller, når I har set boligen. −10 point for hver 5 sek. over tid.
          </span>
        </span>
        <span className={`relative h-6 w-11 shrink-0 rounded-full transition ${settings.timed ? "bg-amber-500" : "bg-slate-300"}`}>
          <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${settings.timed ? "left-[22px]" : "left-0.5"}`} />
        </span>
      </button>

      <button
        type="button"
        onClick={onStart}
        className="mt-5 flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-slate-900 text-base font-bold text-white shadow-btn transition hover:bg-slate-800 active:translate-y-px"
      >
        Start spil <ArrowRight className="h-5 w-5" />
      </button>
    </section>
  );
}

/* ---------- leaderboard ---------- */

export function Leaderboard({ board, compact = false }: { board: Board; compact?: boolean }) {
  const rows = board?.top.slice(0, compact ? 5 : 10) ?? [];
  return (
    <section className="rounded-3xl bg-white p-5 shadow-card ring-1 ring-slate-200 sm:p-6">
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-lg font-extrabold text-slate-900">
          <Trophy className="h-5 w-5 text-amber-500" /> Dagens rangliste
        </h2>
        {board && <span className="text-xs text-slate-500">{board.total} har spillet</span>}
      </div>
      {!board ? (
        <div className="mt-4 space-y-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-9 animate-pulse rounded-xl bg-slate-100" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <p className="mt-4 rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">Ingen har spillet i dag endnu. Bliv den første på listen.</p>
      ) : (
        <ol className="mt-4 space-y-1.5">
          {rows.map((r, i) => (
            <li
              key={`${r.name}-${i}`}
              className={`flex items-center gap-3 rounded-xl px-3 py-2 ${r.me ? "bg-blue-50 ring-1 ring-inset ring-blue-200" : i < 3 ? "bg-slate-50" : ""}`}
            >
              <span
                className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-xs font-bold ${
                  i === 0 ? "bg-amber-400 text-slate-900" : i === 1 ? "bg-slate-300 text-slate-900" : i === 2 ? "bg-orange-300 text-slate-900" : "text-slate-500"
                }`}
              >
                {i + 1}
              </span>
              <span className="min-w-0 flex-1 truncate text-sm font-semibold text-slate-900">
                {r.name}
                {r.me && <span className="ml-1.5 text-xs font-medium text-blue-700">(dig)</span>}
              </span>
              <span className="text-sm font-bold tabular-nums text-slate-900">{r.score}</span>
            </li>
          ))}
        </ol>
      )}
      {board?.me && !rows.some((r) => r.me) && (
        <p className="mt-3 text-sm text-slate-600">
          Du er nr. <strong>{board.me.rank}</strong> med {board.me.score} point.
        </p>
      )}
    </section>
  );
}

/* ---------- badges ---------- */

export function BadgeShelf({ profile }: { profile: Profile }) {
  return (
    <section className="rounded-3xl bg-white p-5 shadow-card ring-1 ring-slate-200 sm:p-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-extrabold text-slate-900">Badges</h2>
        <span className="text-xs text-slate-500">
          {Object.keys(profile.badges).length} af {BADGES.length}
        </span>
      </div>
      <div className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-4">
        {BADGES.map((b) => {
          const got = !!profile.badges[b.id];
          return (
            <div
              key={b.id}
              title={b.how}
              className={`flex flex-col items-center rounded-2xl p-2.5 text-center ring-1 ring-inset ${got ? "bg-amber-50 ring-amber-200" : "bg-slate-50 ring-slate-200"}`}
            >
              <span className={`grid h-10 w-10 place-items-center rounded-full ${got ? "bg-gradient-to-br from-amber-300 to-amber-500 text-slate-900 shadow-sm" : "bg-slate-200 text-slate-400"}`}>
                {got ? <Check className="h-5 w-5" strokeWidth={3} /> : <Lock className="h-4 w-4" />}
              </span>
              <span className={`mt-1.5 text-[11px] font-bold leading-tight ${got ? "text-slate-900" : "text-slate-500"}`}>{b.title}</span>
              <span className="mt-0.5 hidden text-[10px] leading-tight text-slate-500 sm:block">{b.how}</span>
            </div>
          );
        })}
      </div>
    </section>
  );
}

/* ---------- level ladder (small) ---------- */

export function LevelLadder({ xp }: { xp: number }) {
  const cur = levelFor(xp).level;
  return (
    <div className="flex flex-wrap gap-1.5">
      {LEVELS.map((l, i) => (
        <span
          key={l.title}
          className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${i + 1 < cur ? "bg-emerald-100 text-emerald-800" : i + 1 === cur ? "bg-amber-400 text-slate-900" : "bg-slate-100 text-slate-400"}`}
        >
          {l.title}
        </span>
      ))}
    </div>
  );
}

export function useBoard(clientId: string | null, refreshKey: number) {
  const [board, setBoard] = useState<Board>(null);
  useEffect(() => {
    if (!clientId) return;
    let alive = true;
    fetch(`/api/game/daily?view=board&client=${encodeURIComponent(clientId)}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((j) => alive && j?.ok && setBoard({ total: j.total, top: j.top, me: j.me }))
      .catch(() => alive && setBoard({ total: 0, top: [], me: null }));
    return () => {
      alive = false;
    };
  }, [clientId, refreshKey]);
  return board;
}
