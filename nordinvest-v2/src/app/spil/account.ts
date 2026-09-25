"use client";

import { useCallback, useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import type { Profile } from "./progress";

/*
 * The game's "profile" is a normal NordInvest account (Supabase auth, the same
 * one the analyser uses). Signing up is one step: username, email, password.
 * The game progress (XP, badges, streak, daily results) is stored on the user
 * as user_metadata.game, so it follows the player to every device.
 */

export type GameAccount = {
  ready: boolean;
  configured: boolean;
  user: User | null;
  username: string | null;
  signUp: (username: string, email: string, password: string) => Promise<{ ok: true } | { ok: false; error: string; exists?: boolean }>;
  signIn: (email: string, password: string) => Promise<{ ok: true } | { ok: false; error: string }>;
};

export function cleanUsername(raw: string): string {
  return raw
    .replace(/[^A-Za-z0-9ÆØÅæøåÄÖÜäöüÉé ._-]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 18);
}

export function useGameAccount(): GameAccount {
  const supabase = createClient();
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(!supabase);

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user ?? null);
      setReady(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => setUser(session?.user ?? null));
    return () => sub.subscription.unsubscribe();
  }, [supabase]);

  const signUp = useCallback<GameAccount["signUp"]>(
    async (username, email, password) => {
      if (!supabase) return { ok: false, error: "Profiler er ikke slået til lige nu." };
      const name = cleanUsername(username);
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: { full_name: name, username: name, source: "spil" },
          emailRedirectTo: `${window.location.origin}/spil`,
        },
      });
      const exists =
        /already|registered|exists/i.test(error?.message ?? "") ||
        (!error && !!data.user && (data.user.identities?.length ?? 0) === 0);
      if (exists) return { ok: false, error: "Der findes allerede en profil med den e-mail. Log ind i stedet.", exists: true };
      if (error) {
        if (/password/i.test(error.message)) return { ok: false, error: "Adgangskoden skal være på mindst 6 tegn." };
        if (/email/i.test(error.message)) return { ok: false, error: "Tjek at e-mailen er skrevet rigtigt." };
        return { ok: false, error: "Profilen kunne ikke oprettes lige nu. Prøv igen." };
      }
      if (!data.session) return { ok: false, error: "Tjek din mail og bekræft profilen, så er du klar." };
      return { ok: true };
    },
    [supabase],
  );

  const signIn = useCallback<GameAccount["signIn"]>(
    async (email, password) => {
      if (!supabase) return { ok: false, error: "Login er ikke slået til lige nu." };
      const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (error) return { ok: false, error: "Forkert e-mail eller adgangskode." };
      return { ok: true };
    },
    [supabase],
  );

  const meta = (user?.user_metadata ?? {}) as { username?: string; full_name?: string };
  const username = user ? cleanUsername(meta.username || meta.full_name || user.email?.split("@")[0] || "") || null : null;

  return { ready, configured: !!supabase, user, username, signUp, signIn };
}

/* ---------- syncing the game profile to the account ---------- */

type Stored = Pick<Profile, "xp" | "badges" | "streak" | "daily" | "regions" | "bestScore">;

export function remoteGame(user: User | null): Stored | null {
  const g = (user?.user_metadata as { game?: Stored } | undefined)?.game;
  return g && typeof g === "object" ? g : null;
}

/** Combine what this browser knows with what the account knows — never lose progress. */
export function mergeProfiles(local: Profile, remote: Stored | null): Profile {
  if (!remote) return local;
  const badges = { ...remote.badges };
  for (const [id, at] of Object.entries(local.badges)) if (!badges[id] || at < badges[id]) badges[id] = at;
  const ls = local.streak;
  const rs = remote.streak ?? { count: 0, last: null };
  const streak =
    (rs.last ?? "") > (ls.last ?? "") ? rs : (ls.last ?? "") > (rs.last ?? "") ? ls : rs.count > ls.count ? rs : ls;
  return {
    ...local,
    xp: Math.max(local.xp, Number(remote.xp) || 0),
    bestScore: Math.max(local.bestScore, Number(remote.bestScore) || 0),
    badges,
    streak,
    daily: { ...(remote.daily ?? {}), ...local.daily },
    regions: Array.from(new Set([...(remote.regions ?? []), ...local.regions])),
  };
}

/** Save progress on the account (kept small: it rides along in the session token). */
export async function pushGame(p: Profile) {
  const supabase = createClient();
  if (!supabase) return;
  const recent = Object.keys(p.daily).sort().slice(-21);
  const game: Stored = {
    xp: p.xp,
    bestScore: p.bestScore,
    badges: p.badges,
    streak: p.streak,
    regions: p.regions.slice(0, 30),
    daily: Object.fromEntries(recent.map((d) => [d, p.daily[d]])),
  };
  await supabase.auth.updateUser({ data: { game } }).catch(() => null);
}
