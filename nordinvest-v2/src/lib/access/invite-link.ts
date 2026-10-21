import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

/*
 * Durable sign-in links for invitations and "Glemt adgangskode".
 *
 * Supabase's own links are one-time tokens that expire after an hour, and mail
 * scanners (Outlook Safe Links and the like) open every link in a mail before
 * the recipient does, which uses the token up. So the mail carries our own
 * link, /invitation/<userId>.<token>. Opening it changes nothing; the person
 * presses a button (a POST, which scanners do not send), and only then do we
 * make a fresh Supabase token and sign them in.
 *
 * Only a hash of the token is kept, on the account's app_metadata, which only
 * the service role can write.
 */

export type InviteKind = "member" | "maegler" | "begge" | "privat" | "investor_privat";
export type LinkPurpose = "invite" | "login";

/** Where each kind of person lands after the invitation. */
export const INVITE_NEXT: Record<InviteKind, string> = { member: "/app/velkommen", maegler: "/maegler", begge: "/app/velkommen", privat: "/boligkoeb", investor_privat: "/app/velkommen" };

export type LinkRecord = { hash: string; kind?: InviteKind; next: string; created_at: string; expires_at?: string; used_at?: string };

/** app_metadata field per purpose. */
export const FIELD: Record<LinkPurpose, string> = { invite: "nordinvest_invite", login: "nordinvest_login" };

/** An invitation keeps working until it is used, and for 14 days after that, so the person can open it again on another device. */
const AFTER_USE_MS = 14 * 24 * 3600 * 1000;
/** A "Glemt adgangskode" link works for 24 hours. */
export const LOGIN_TTL_MS = 24 * 3600 * 1000;

const sha = (t: string) => createHash("sha256").update(t).digest("hex");

export function newLink(next: string, kind?: InviteKind, ttlMs?: number): { token: string; record: LinkRecord } {
  const token = randomBytes(24).toString("base64url");
  const now = Date.now();
  return {
    token,
    record: { hash: sha(token), next, created_at: new Date(now).toISOString(), ...(kind ? { kind } : {}), ...(ttlMs ? { expires_at: new Date(now + ttlMs).toISOString() } : {}) },
  };
}

export const linkUrl = (site: string, userId: string, token: string) => `${site}/invitation/${userId}.${token}`;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function parseCode(code: string): { userId: string; token: string } | null {
  const i = code.indexOf(".");
  if (i < 0) return null;
  const userId = code.slice(0, i);
  const token = code.slice(i + 1);
  if (!UUID.test(userId) || !/^[A-Za-z0-9_-]{20,64}$/.test(token)) return null;
  return { userId, token };
}

type Meta = Record<string, unknown> | undefined;

/** The record this token belongs to and its purpose, if the token matches and is still valid. */
export function matchLink(meta: Meta, token: string): { purpose: LinkPurpose; record: LinkRecord } | null {
  if (meta?.nordinvest_access === "revoked") return null;
  const h = Buffer.from(sha(token), "hex");
  for (const purpose of ["invite", "login"] as const) {
    const rec = meta?.[FIELD[purpose]] as LinkRecord | undefined;
    if (!rec?.hash || rec.hash.length !== 64) continue;
    if (!timingSafeEqual(Buffer.from(rec.hash, "hex"), h)) continue;
    const now = Date.now();
    if (rec.expires_at && Date.parse(rec.expires_at) < now) return null;
    if (purpose === "invite" && rec.used_at && Date.parse(rec.used_at) + AFTER_USE_MS < now) return null;
    return { purpose, record: rec };
  }
  return null;
}

/** Same-site paths only, never an open redirect. */
export const safeNext = (n: string | undefined, fallback = "/app") => (n && n.startsWith("/") && !n.startsWith("//") ? n : fallback);
