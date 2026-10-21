import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

/*
 * Boligkryds magic links. The mail carries /login/<userId>.<token>; only a
 * hash of the token is kept on the account (app_metadata, service role only).
 * Opening the page signs nobody in (mail scanners open links); the page posts
 * the code, and only then is a Supabase session made. A link works once,
 * within 24 hours.
 */
export const LOGIN_FIELD = "boligkryds_login";
const TTL = 24 * 3600 * 1000;
const sha = (t: string) => createHash("sha256").update(t).digest("hex");

export type LoginRecord = { hash: string; expires_at: string; next?: string };

export function newLogin(next?: string): { token: string; record: LoginRecord } {
  const token = randomBytes(24).toString("base64url");
  return { token, record: { hash: sha(token), expires_at: new Date(Date.now() + TTL).toISOString(), ...(next ? { next } : {}) } };
}

export function parseLoginCode(code: string): { userId: string; token: string } | null {
  const m = code.match(/^([0-9a-f-]{36})\.([A-Za-z0-9_-]{20,})$/i);
  return m ? { userId: m[1], token: m[2] } : null;
}

export function loginMatches(meta: Record<string, unknown> | null | undefined, token: string): LoginRecord | null {
  const r = meta?.[LOGIN_FIELD] as LoginRecord | null | undefined;
  if (!r?.hash || Date.parse(r.expires_at) < Date.now()) return null;
  const a = Buffer.from(sha(token)), b = Buffer.from(r.hash);
  return a.length === b.length && timingSafeEqual(a, b) ? r : null;
}

/** Same-site paths only. */
export const safePath = (p: unknown) => (typeof p === "string" && p.startsWith("/") && !p.startsWith("//") ? p.slice(0, 300) : "/");

/** The site the request came in on (the Host header), so links and redirects stay on Boligkryds. */
export function originOf(req: Request): string {
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  if (!host) return new URL(req.url).origin;
  const proto = req.headers.get("x-forwarded-proto") ?? (host.includes("localhost") ? "http" : "https");
  return `${proto.split(",")[0]}://${host}`;
}
