/*
 * The editable part of an invitation mail. The admin's invite form starts
 * with the default text for the chosen kind of access, and whatever ends up in
 * the box is what the person reads between "Hej <fornavn>," and the button.
 * Shared by the form (client) and the mail (server), so no server imports.
 */
export type InviteCopyKind = "member" | "maegler" | "begge" | "privat";

const MEMBER = "Du er nu inviteret til NordInvest, og din konto er klar. Tryk på knappen for at logge ind første gang. Du vælger selv en adgangskode, og bagefter viser en kort guide dig rundt.";
const BROKER = "Som aftalt har du nu adgang til NordInvest for mæglere. Her laver du investoranalyser af jeres sager og sætter en NordInvest-knap på sagen på jeres hjemmeside. Det tager et par minutter pr. sag og er gratis.";
const BOTH = "Du har også adgang til mæglerværktøjet, hvor du laver investoranalyser af dine sager og sætter en NordInvest-knap på dem. Du finder det i menuen under Mæglerværktøj.";
const PRIVATE = "Du har nu adgang til NordInvest for boligkøbere. Du får et kort over alle boliger til salg i Danmark, hvor hver bolig er vurderet: grøn er et godt køb, gul er middel, og rød er dyr i forhold til lignende boliger i området. Tryk på en bolig for at se prisen mod området, hvad du kan låne, friværdi og byggeprojekter i nærheden.";
const QUESTIONS = "Har du spørgsmål undervejs, kan du svare på denne mail.";

export const DEFAULT_INVITE_TEXT: Record<InviteCopyKind, string> = {
  member: `${MEMBER}\n\n${QUESTIONS}`,
  maegler: `${BROKER}\n\n${QUESTIONS}`,
  begge: `${MEMBER}\n\n${BOTH}\n\n${QUESTIONS}`,
  privat: `${PRIVATE}\n\n${QUESTIONS}`,
};

export const INVITE_TEXT_MAX = 4000;

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

/** Plain text to mail HTML: a blank line starts a new paragraph, a single line break stays a line break. */
export function inviteTextToHtml(text: string): string {
  return text
    .replace(/\r\n?/g, "\n")
    .trim()
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => `<p>${esc(p).replace(/\n/g, "<br>")}</p>`)
    .join("\n");
}
