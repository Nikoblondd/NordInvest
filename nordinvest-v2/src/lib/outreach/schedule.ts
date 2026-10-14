import week from "@/lib/outreach/press-week-41.json";
import brokers43 from "@/lib/outreach/maegler-uge-43.json";

/* Outreach the weekday cron sends: press (week 41) and erhvervsmæglere (15, 16 and 19 October), one mail per person, each with its own send time. */
export type Pitch = { id: string; to: string; subject: string; text: string; sendAt: string };
export const PITCHES = [...(week as Pitch[]), ...(brokers43 as Pitch[])];
export const PITCH_FROM = "Nikolaj Blond <contact@nordinvest.io>";
export const PITCH_REPLY_TO = "contact@nordinvest.io";
/** The founder's own inbox for receipts and the daily report. */
export const REPORT_TO = "blond.nikolaj@gmail.com";
export const REPORT_FROM = "NordInvest <contact@nordinvest.io>";

export const dkDay = (d: Date) => new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Copenhagen" }).format(d); // YYYY-MM-DD
export const dkTime = (iso: string) => new Date(iso).toLocaleTimeString("da-DK", { timeZone: "Europe/Copenhagen", hour: "2-digit", minute: "2-digit" });
export const pitchesOn = (day: string) => PITCHES.filter((p) => dkDay(new Date(p.sendAt)) === day);
