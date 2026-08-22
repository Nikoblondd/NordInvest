import type { Metadata } from "next";
import { LegalLayout } from "@/components/LegalLayout";

export const metadata: Metadata = {
  title: "Vilkår",
  description: "Vilkår for brug af NordInvest.",
};

export default function Page() {
  return (
    <LegalLayout
      title="Vilkår for brug"
      updated="22. august 2026"
      sections={[
        {
          h: "1. Om tjenesten",
          p: [
            "NordInvest er et analyseværktøj, der hjælper dig med at vurdere ejendomsinvesteringer. Ved at oprette en konto accepterer du disse vilkår.",
          ],
        },
        {
          h: "2. Ikke finansiel rådgivning",
          p: [
            "NordInvest leverer beregninger og skøn til oplysningsformål. Det er ikke personlig finansiel eller investeringsmæssig rådgivning. Beslutninger, du træffer på baggrund af tallene, er dit eget ansvar. Søg altid professionel rådgivning inden større investeringer.",
          ],
        },
        {
          h: "3. Abonnement og betaling",
          p: [
            "Betalte planer afregnes månedligt via Stripe. Du kan opgradere, nedgradere eller opsige når som helst med virkning fra næste betalingsperiode. Vi refunderer som udgangspunkt ikke for indeværende periode.",
          ],
        },
        {
          h: "4. Acceptabel brug",
          p: [
            "Du må ikke misbruge tjenesten, forsøge at omgå brugsgrænser, oprette flere gratis konti for at undgå betaling eller kopiere data i strid med gældende ret.",
          ],
        },
        {
          h: "5. Ansvarsbegrænsning",
          p: [
            "Tjenesten leveres “som den er”. Vi bestræber os på korrekte data, men kan ikke garantere fejlfrihed. NordInvest er ikke ansvarlig for tab som følge af beslutninger truffet på baggrund af værktøjet.",
          ],
        },
        {
          h: "6. Ændringer",
          p: [
            "Vi kan opdatere disse vilkår. Væsentlige ændringer varsler vi på platformen eller via e-mail.",
          ],
        },
      ]}
    />
  );
}
