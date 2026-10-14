/*
 * The contact form: one list of topics shared by the form and the API, and
 * the validation both sides agree on.
 */

export const TOPICS = [
  { id: "spoergsmaal", label: "Spørgsmål" },
  { id: "fejl", label: "Fejl" },
  { id: "forslag", label: "Forslag" },
  { id: "adgang", label: "Adgang og abonnement" },
  { id: "samarbejde", label: "Samarbejde og presse" },
  { id: "andet", label: "Andet" },
] as const;

export type TopicId = (typeof TOPICS)[number]["id"];
export type ContactMessage = { topic: TopicId; name: string; email: string; message: string; page: string | null };
export type ContactErrors = Partial<Record<"topic" | "name" | "email" | "message", string>>;

const str = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");

export function validateContact(body: Record<string, unknown>): { data?: ContactMessage; errors?: ContactErrors } {
  const errors: ContactErrors = {};
  const topic = str(body.topic, 40) as TopicId;
  const name = str(body.name, 120);
  const email = str(body.email, 200).toLowerCase();
  const message = str(body.message, 5000);
  const page = str(body.page, 300) || null;
  if (!TOPICS.some((t) => t.id === topic)) errors.topic = "Vælg et emne.";
  if (name.length < 2) errors.name = "Skriv dit navn.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) errors.email = "Skriv en gyldig e-mailadresse.";
  if (message.length < 10) errors.message = "Skriv en besked på mindst 10 tegn.";
  if (Object.keys(errors).length) return { errors };
  return { data: { topic, name, email, message, page } };
}

export const topicLabel = (id: TopicId) => TOPICS.find((t) => t.id === id)?.label ?? "Andet";
