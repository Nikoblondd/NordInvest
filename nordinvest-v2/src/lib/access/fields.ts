/** Form options for "Anmod om adgang", shared by the form and the API. */
export const PORTFOLIO = ["Ingen endnu", "1-2", "3-10", "Over 10"] as const;
export const GOALS = ["Udlejningsbolig", "Renovering og salg", "Erhverv", "Andet"] as const;
/** Who is asking. Decides which part of NordInvest they are invited to. */
export const ROLES = [
  { id: "investor", label: "Investor", lead: "Køber bolig til udlejning, renovering eller erhverv" },
  { id: "privat", label: "Boligkøber", lead: "Køber bolig til mig selv og vil vide, om det er et godt køb" },
  { id: "maegler", label: "Ejendomsmægler", lead: "Vil vise investorer, hvad mine sager kan" },
] as const;
export type Role = (typeof ROLES)[number]["id"];
export const ROLE_LABEL: Record<Role, string> = { investor: "Investor", privat: "Privat boligkøber", maegler: "Ejendomsmægler" };
/** What a private buyer is looking for. */
export const HOME_GOALS = ["Lejlighed", "Hus", "Rækkehus", "Andelsbolig", "Fritidshus"] as const;
export type FieldErrors = Partial<Record<"role" | "name" | "email" | "phone" | "portfolio" | "message", string>>;

export type AccessRequest = {
  id: string;
  createdAt: string;
  name: string;
  email: string;
  phone: string;
  /** Missing on requests from before the role question (they were investors). */
  role?: Role;
  portfolio: string;
  goals: string[];
  message: string;
  source: string;
  status: RequestStatus;
  /** Admin's own notes: what was agreed, price, next step. */
  adminNote?: string;
  updatedAt?: string;
  invitedUserId?: string;
  /** Resend id of the approval mail, to check its delivery. */
  inviteMailId?: string;
};

export type RequestStatus = "ny" | "kontaktet" | "inviteret" | "afvist";
export const REQUEST_STATUS: Record<RequestStatus, string> = { ny: "Afventer", kontaktet: "Kontaktet", inviteret: "Godkendt", afvist: "Afvist" };

const str = (v: unknown, max: number) => (typeof v === "string" ? v.replace(/\s+/g, " ").trim().slice(0, max) : "");

/** Danish numbers: 8 digits, optionally +45 / 0045 in front. Foreign numbers are allowed with a + prefix. */
export function normalisePhone(raw: string): string | null {
  const s = raw.replace(/[\s().-]/g, "");
  if (/^(\+45|0045)?\d{8}$/.test(s)) {
    const d = s.slice(-8);
    return `+45 ${d.slice(0, 2)} ${d.slice(2, 4)} ${d.slice(4, 6)} ${d.slice(6)}`;
  }
  if (/^\+\d{7,15}$/.test(s)) return s;
  return null;
}

export function validate(body: Record<string, unknown>): { data?: Omit<AccessRequest, "id" | "createdAt" | "status">; errors?: FieldErrors } {
  const errors: FieldErrors = {};
  const name = str(body.name, 120);
  const email = str(body.email, 200).toLowerCase();
  const phoneRaw = str(body.phone, 40);
  const role = (ROLES.some((r) => r.id === body.role) ? body.role : "") as Role | "";
  const portfolio = role === "investor" ? str(body.portfolio, 40) : "";
  const allowed: readonly string[] = role === "privat" ? HOME_GOALS : role === "investor" ? GOALS : [];
  const goals = Array.isArray(body.goals) ? body.goals.map((g) => str(g, 40)).filter((g) => allowed.includes(g)) : [];
  const message = typeof body.message === "string" ? body.message.trim().slice(0, 2000) : "";
  const source = str(body.source, 80) || "adgang";

  if (!role) errors.role = "Vælg, hvem du er.";
  if (name.length < 2) errors.name = "Skriv dit navn.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) errors.email = "Skriv en gyldig e-mail.";
  const phone = normalisePhone(phoneRaw);
  if (!phone) errors.phone = "Skriv et telefonnummer med 8 cifre.";
  if (role === "investor" && !(PORTFOLIO as readonly string[]).includes(portfolio)) errors.portfolio = "Vælg et svar.";

  if (Object.keys(errors).length) return { errors };
  return { data: { role: role as Role, name, email, phone: phone!, portfolio: portfolio || "Ikke relevant", goals, message, source } };
}

