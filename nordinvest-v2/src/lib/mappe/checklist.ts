/*
 * The Danish process for buying an investment property, as a checklist per
 * stage. Each item says why it matters and where to get it, so the
 * ejendomsmappe follows what buyers, banks and købers rådgivere already do
 * instead of inventing a new process. `for` limits an item to flats
 * (ejerlejlighed, ejerforening papers) or houses (tilstandsrapport etc.).
 */

export type Stage = "screening" | "fremvisning" | "dokumenter" | "bank" | "bud" | "koebt";
export type Kind = "lejlighed" | "hus";

export const STAGES: { id: Stage; label: string; lead: string }[] = [
  { id: "screening", label: "Screening", lead: "Er boligen værd at bruge tid på?" },
  { id: "fremvisning", label: "Fremvisning", lead: "Se boligen og stil de rigtige spørgsmål." },
  { id: "dokumenter", label: "Dokumenter", lead: "Læs papirerne, før du byder." },
  { id: "bank", label: "Bank", lead: "Få finansieringen på plads." },
  { id: "bud", label: "Bud", lead: "Byd med de rigtige forbehold." },
  { id: "koebt", label: "Købt", lead: "Fra nøgle til første husleje." },
];

export type CheckItem = {
  id: string;
  stage: Stage;
  title: string;
  why: string;
  where?: { label: string; href?: string };
  for?: Kind;
  /** Done automatically when the property has an analysis. */
  auto?: "analysis";
};

export const CHECKLIST: CheckItem[] = [
  // Screening
  { id: "regn", stage: "screening", auto: "analysis", title: "Regn tallene igennem", why: "Overskud pr. måned, afkast og hvor meget renten kan stige, før lejen ikke betaler lånet.", where: { label: "Analysen" } },
  { id: "solgte", stage: "screening", title: "Sammenlign med solgte priser i området", why: "Udbudsprisen er sælgers ønske. Handelspriserne viser, hvad boliger faktisk går for.", where: { label: "Boliga: solgte boliger", href: "https://www.boliga.dk/salg" } },
  { id: "bbr", stage: "screening", title: "Tjek BBR-meddelelsen", why: "Areal, byggeår og anvendelse skal passe med annoncen. Byggeåret afgør også lejereglerne.", where: { label: "BBR: se oplysninger", href: "https://bbr.dk/se-bbr-oplysninger" } },
  { id: "leje-lovlig", stage: "screening", title: "Er lejen lovlig?", why: "Bygget før 1992 i en reguleret kommune betyder ofte omkostningsbestemt leje, som kan være langt under markedslejen.", where: { label: "Lovguiden: lejefastsættelse", href: "https://www.lovguiden.dk/praksisoversigt/lejefastsaettelse" } },
  { id: "vurdering", stage: "screening", title: "Tjek vurderingen og ejendomsskatterne", why: "Grundskyld og ejendomsværdiskat er faste udgifter, der skal med i budgettet.", where: { label: "Vurderingsportalen", href: "https://www.vurderingsportalen.dk" } },

  // Fremvisning
  { id: "se", stage: "fremvisning", title: "Se boligen og tag billeder", why: "Kig efter fugt, revner, vinduer, tag og el-tavle. Det er de dyre overraskelser.", where: { label: "Til fremvisningen" } },
  { id: "liggetid", stage: "fremvisning", title: "Spørg om liggetid, prisfald og andre bud", why: "En bolig, der har ligget længe, giver plads til forhandling.", where: { label: "Mægleren" } },
  { id: "lejer", stage: "fremvisning", title: "Er der en lejer i dag?", why: "En eksisterende lejekontrakt følger med boligen. Få husleje, depositum og opsigelsesvarsel oplyst.", where: { label: "Mægleren" } },

  // Dokumenter
  { id: "salgsopstilling", stage: "dokumenter", title: "Salgsopstillingen", why: "Ejerudgift, skatter og forbehold står her. Upload den, så gennemgår AI'en den for dig.", where: { label: "Mægleren" } },
  { id: "tilstand", stage: "dokumenter", for: "hus", title: "Tilstandsrapport og elinstallationsrapport", why: "K2- og K3-skader og ulovlige installationer er de største kendte udgifter i et hus.", where: { label: "Mægleren" } },
  { id: "vedtaegter", stage: "dokumenter", for: "lejlighed", title: "Ejerforeningens vedtægter", why: "Vedtægterne afgør, om du overhovedet må udleje, og på hvilke vilkår.", where: { label: "Mægleren eller administrator" } },
  { id: "regnskab", stage: "dokumenter", for: "lejlighed", title: "Regnskab og budget for ejerforeningen", why: "Viser foreningens økonomi, gæld og om fællesudgiften kan forventes at stige.", where: { label: "Mægleren eller administrator" } },
  { id: "referater", stage: "dokumenter", for: "lejlighed", title: "Referater fra de seneste generalforsamlinger", why: "Her står vedtagne arbejder og ekstraordinære indbetalinger, som rammer dig som ny ejer.", where: { label: "Mægleren eller administrator" } },
  { id: "vedligehold", stage: "dokumenter", for: "lejlighed", title: "Vedligeholdelsesplan", why: "Tag, facade og faldstammer, der skal skiftes de næste 10 år, og hvad det koster.", where: { label: "Administrator" } },
  { id: "energi", stage: "dokumenter", title: "Energimærke", why: "Et dårligt energimærke betyder høje varmeregninger og kan gøre boligen sværere at leje ud.", where: { label: "Energistyrelsen: find energimærke", href: "https://sparenergi.dk/forbruger/vaerktoejer/find-dit-energimaerke" } },

  // Bank
  { id: "bankbudget", stage: "bank", title: "Send budgettet til din bank", why: "Banken skal se, at lejen betaler lånet, og hvad du selv lægger. Bankrapporten er lavet til det.", where: { label: "Bankrapport fra analysen" } },
  { id: "laanetilbud", stage: "bank", title: "Få lånetilbud fra realkredit og bank", why: "Til en investeringsbolig kræver banken ofte en større udbetaling end til din egen bolig.", where: { label: "Din bank" } },
  { id: "stress", stage: "bank", title: "Stresstest renten", why: "Tjek, at handlen holder, hvis renten stiger 2 procentpoint.", where: { label: "Analysen: Hvad kan gå galt?" } },

  // Bud
  { id: "maxbud", stage: "bud", title: "Beslut dit højeste bud", why: "Sæt grænsen, før du forhandler: den pris, hvor overskuddet stadig er det, du vil have.", where: { label: "Juster prisen i analysen" } },
  { id: "raadgiver", stage: "bud", title: "Få en købers rådgiver eller boligadvokat", why: "De gennemgår papirerne og købsaftalen for dig. Det koster typisk 10.000 til 15.000 kr.", where: { label: "Købers rådgiver" } },
  { id: "forbehold", stage: "bud", title: "Byd med advokat- og finansieringsforbehold", why: "Så kan du træde tilbage, hvis rådgiveren finder noget, eller banken siger nej.", where: { label: "Købsaftalen" } },
  { id: "ejerskifte", stage: "bud", for: "hus", title: "Tag stilling til ejerskifteforsikring", why: "Dækker skjulte skader, som ikke står i tilstandsrapporten. Sælger betaler halvdelen.", where: { label: "Forsikringsselskab" } },
  { id: "revisor", stage: "bud", title: "Spørg en revisor om skatten", why: "Virksomhedsordningen eller kapitalindkomst kan give stor forskel i skat på lejeindtægten.", where: { label: "Revisor" } },

  // Købt
  { id: "kontrakt", stage: "koebt", title: "Lejekontrakt på typeformular A10", why: "Standardkontrakten for boliglejemål i Danmark. Skriv lejen og depositum ind korrekt.", where: { label: "Typeformular A10" } },
  { id: "depositum", stage: "koebt", title: "Depositum og indflytningsrapport", why: "Indflytningssyn med billeder beskytter dig, når lejeren flytter.", where: { label: "Ved indflytning" } },
  { id: "skat", stage: "koebt", title: "Husk lejeindtægten i årsopgørelsen", why: "Lejeindtægt og fradrag skal oplyses til Skattestyrelsen.", where: { label: "Skattestyrelsen", href: "https://skat.dk" } },
];

export const itemsFor = (stage: Stage, kind: Kind | null) =>
  CHECKLIST.filter((c) => c.stage === stage && (!c.for || !kind || c.for === kind));

export type DocReview = {
  id: string;
  name: string;
  pages: number;
  at: string;
  type: string;
  title: string;
  summary: string;
  facts: { label: string; value: string; page: number | null }[];
  risks: { level: "hoej" | "middel" | "lav"; title: string; detail: string; page: number | null; quote: string | null }[];
  rental: { allowed: "ja" | "nej" | "betinget" | "ukendt"; note: string; page: number | null } | null;
  questions: string[];
};

export type TaskKind = "fremvisning" | "maegler" | "bank" | "bud" | "raadgiver" | "andet";
export const TASK_KINDS: { id: TaskKind; label: string }[] = [
  { id: "fremvisning", label: "Fremvisning" },
  { id: "maegler", label: "Kontakt mægleren" },
  { id: "bank", label: "Bankmøde" },
  { id: "bud", label: "Afgiv bud" },
  { id: "raadgiver", label: "Købers rådgiver" },
  { id: "andet", label: "Andet" },
];
/** A to-do on a property, e.g. a viewing on Tuesday at 16:00. `due` is local "YYYY-MM-DDTHH:mm" or a date. */
export type Task = {
  id: string; kind: TaskKind; title: string; due: string | null; done: boolean;
  /** End time "HH:mm" on the same day, for appointments. */
  end?: string | null;
  place?: string;
  note?: string;
};
export type Offer = {
  amount: number; date: string; status: "afgivet" | "modbud" | "accepteret" | "afslaaet"; note?: string;
  id?: string;
  /** The seller's counter-offer, when status is "modbud". */
  counter?: number | null;
  /** Answer deadline "YYYY-MM-DDTHH:mm". */
  deadline?: string | null;
};
/** One line in the case's activity log. */
export type LogEntry = { at: string; text: string; kind: "fase" | "bud" | "aftale" | "dokument" | "note" | "oprettet" };
export const OFFER_STATUS: Record<Offer["status"], string> = { afgivet: "Afgivet", modbud: "Modbud", accepteret: "Accepteret", afslaaet: "Afslået" };

export type Mappe = {
  stage: Stage | "droppet";
  checks: Record<string, boolean>;
  notes: string;
  docs: DocReview[];
  tasks?: Task[];
  offer?: Offer | null;
  /** Every offer made on the property, newest first. `offer` is the current one. */
  offers?: Offer[];
  log?: LogEntry[];
  /** The member's own highest price for this property. */
  maxBid?: number | null;
  /** The listing agent (or seller) for this property. */
  contact?: Contact | null;
  /** Running the property once it is bought (lib/drift). */
  drift?: import("@/lib/drift").Drift;
  updatedAt?: string;
};

export type Contact = { name?: string; company?: string; phone?: string; email?: string };

export const EMPTY_MAPPE: Mappe = { stage: "screening", checks: {}, notes: "", docs: [], tasks: [], offer: null };

export const STAGE_LABEL: Record<Stage | "droppet", string> = {
  screening: "Screening", fremvisning: "Fremvisning", dokumenter: "Dokumenter", bank: "Bank", bud: "Bud", koebt: "Købt", droppet: "Droppet",
};

/** "tir. 14. okt. kl. 16.00", or just the date when no time was set. */
export function fmtDue(due: string): string {
  const d = new Date(due.length <= 10 ? `${due}T12:00` : due);
  const date = d.toLocaleDateString("da-DK", { weekday: "short", day: "numeric", month: "short" });
  return due.length > 10 ? `${date} kl. ${d.toLocaleTimeString("da-DK", { hour: "2-digit", minute: "2-digit" })}` : date;
}
/** Days from today (local) to the task's day: negative when overdue. */
export function daysUntil(due: string, now = new Date()): number {
  const d = new Date(due.length <= 10 ? `${due}T12:00` : due);
  const a = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const b = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  return Math.round((b - a) / 86400000);
}
