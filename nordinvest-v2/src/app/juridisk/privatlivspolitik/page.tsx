import type { Metadata } from "next";
import { LegalLayout } from "@/components/LegalLayout";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Privatlivspolitik",
  description: "Sådan behandler NordInvest dine personoplysninger.",
};

export default function Page() {
  return (
    <LegalLayout
      title="Privatlivspolitik"
      updated="22. august 2026"
      sections={[
        {
          h: "1. Dataansvarlig",
          p: [
            `NordInvest er dataansvarlig for behandlingen af de personoplysninger, vi modtager om dig. Har du spørgsmål, kan du kontakte os på ${site.email}.`,
          ],
        },
        {
          h: "2. Hvilke oplysninger vi behandler",
          p: [
            "Når du opretter en konto, behandler vi navn og e-mail fra din LinkedIn- eller Google-login. Når du kører en analyse, gemmer vi de ejendomsdata og resultater, du selv indtaster, knyttet til din konto.",
            "Vi indsamler desuden begrænset teknisk data (IP-adresse og enhedsoplysninger) for at forhindre misbrug og oprettelse af flere gratis konti.",
          ],
        },
        {
          h: "3. Formål og retsgrundlag",
          p: [
            "Vi behandler oplysningerne for at levere tjenesten, håndtere dit abonnement og forbedre produktet. Retsgrundlaget er opfyldelse af aftalen med dig samt vores legitime interesse i at drive og sikre platformen.",
          ],
        },
        {
          h: "4. Deling af data",
          p: [
            "Vi sælger aldrig dine data. Vi deler kun oplysninger med databehandlere, der leverer infrastruktur til os — herunder hosting (Vercel), database og login (Supabase) og betaling (Stripe) — under databehandleraftaler.",
          ],
        },
        {
          h: "5. Opbevaring",
          p: [
            "Vi opbevarer dine oplysninger, så længe du har en konto. Sletter du din konto, fjerner vi dine persondata inden for rimelig tid, medmindre lovgivning kræver længere opbevaring (fx bogføringsloven for betalinger).",
          ],
        },
        {
          h: "6. Dine rettigheder",
          p: [
            "Du har ret til indsigt, berigtigelse, sletning og dataportabilitet samt til at gøre indsigelse mod behandlingen. Kontakt os for at udøve dine rettigheder. Du kan også klage til Datatilsynet.",
          ],
        },
      ]}
    />
  );
}
