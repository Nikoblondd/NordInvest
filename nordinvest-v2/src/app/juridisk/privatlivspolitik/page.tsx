import type { Metadata } from "next";
import { LegalLayout } from "@/components/LegalLayout";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Privatlivspolitik",
  description: "Sådan behandler NordInvest dine personoplysninger efter GDPR: hvilke data vi gemmer, hvor længe, hvem der behandler dem, og dine rettigheder.",
};

const b = site.business;
const identity = [
  b.legalName,
  b.entityType,
  b.cvr && `CVR ${b.cvr}`,
  b.address,
  b.country,
].filter(Boolean).join(", ");

export default function Page() {
  return (
    <LegalLayout
      title="Privatlivspolitik"
      updated="5. september 2026"
      sections={[
        {
          h: "1. Dataansvarlig",
          p: [
            `${identity} er dataansvarlig for behandlingen af de personoplysninger, vi modtager om dig. Har du spørgsmål til behandlingen, kan du kontakte os på ${site.email} eller ${site.phone}.`,
          ],
        },
        {
          h: "2. Hvilke oplysninger vi behandler",
          p: [
            "Når du opretter en konto, behandler vi navn og e-mail — enten fra dit LinkedIn- eller Google-login eller fra den e-mail og adgangskode, du selv opretter. Vælger du at udfylde din profil, behandler vi også dit telefonnummer.",
            "Når du kører en analyse, gemmer vi de ejendomsdata og resultater, du selv indtaster eller henter, knyttet til din konto.",
            "Opretter du et betalt abonnement, behandler Stripe din betaling. Vi modtager oplysninger om abonnementet (fx status og betalingshistorik), men ikke dine fulde kortoplysninger.",
            "Vi indsamler desuden begrænset teknisk data (IP-adresse og enhedsoplysninger) for at forebygge misbrug og oprettelse af flere gratis konti.",
          ],
        },
        {
          h: "3. Formål og retsgrundlag",
          p: [
            "Vi behandler oplysningerne for at levere tjenesten og håndtere dit abonnement (retsgrundlag: opfyldelse af aftalen, databeskyttelsesforordningen art. 6, stk. 1, litra b), for at forebygge misbrug og forbedre produktet (legitim interesse, litra f) samt for at overholde lovkrav som bogføringsloven (retlig forpligtelse, litra c).",
          ],
        },
        {
          h: "4. Deling af data",
          p: [
            "Vi sælger aldrig dine data. Vi deler kun oplysninger med databehandlere, der leverer infrastruktur til os — herunder hosting og cookiefri webanalyse (Vercel), produktanalyse med dit samtykke (PostHog, EU-hosting), database og login (Supabase) og betaling (Stripe) — under databehandleraftaler. PostHog bruges kun, hvis du accepterer analyse-cookies, og det, du taster, maskeres i eventuelle sessionsoptagelser.",
          ],
        },
        {
          h: "5. Opbevaring",
          p: [
            "Vi opbevarer dine oplysninger, så længe du har en konto. Sletter du din konto, fjerner vi dine persondata inden for rimelig tid. Bogføringsmateriale for betalinger opbevarer vi dog i op til 5 år efter udgangen af det pågældende regnskabsår, som bogføringsloven kræver.",
          ],
        },
        {
          h: "6. Dine rettigheder",
          p: [
            "Du har ret til indsigt, berigtigelse, sletning, begrænsning og dataportabilitet samt til at gøre indsigelse mod behandlingen. Kontakt os på " + site.email + ", så hjælper vi dig med at udøve dine rettigheder.",
            "Er du utilfreds med vores behandling, kan du klage til Datatilsynet, Carl Jacobsens Vej 35, 2500 Valby, dt@datatilsynet.dk, datatilsynet.dk.",
          ],
        },
      ]}
    />
  );
}
