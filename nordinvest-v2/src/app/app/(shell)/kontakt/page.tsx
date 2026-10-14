import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/app/PageHeader";
import { ContactForm } from "@/components/ContactForm";
import { appUser } from "@/lib/app/data";
import { TOPICS, type TopicId } from "@/lib/contact";
import { site } from "@/lib/site";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Kontakt" };

/* Contact from inside the app: the same form, with the member's name and e-mail filled in. */
export default async function AppContactPage({ searchParams }: { searchParams: { emne?: string } }) {
  const me = await appUser();
  if (!me) redirect("/auth/login?next=/app/kontakt");
  const topic = TOPICS.find((t) => t.id === searchParams.emne)?.id as TopicId | undefined;
  return (
    <div className="mx-auto max-w-[760px] px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
      <PageHeader title="Kontakt" sub="Spørgsmål, fejl eller forslag. Beskeden går direkte til vores indbakke, og vi svarer typisk inden for en arbejdsdag." />
      <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 sm:p-7">
        <ContactForm name={me.name ?? ""} email={me.user.email ?? ""} topic={topic} page="/app" />
      </section>
      <p className="mt-4 text-[14px] text-slate-500">Du kan også skrive direkte til <span className="select-all font-medium text-slate-700">{site.email}</span>.</p>
    </div>
  );
}
