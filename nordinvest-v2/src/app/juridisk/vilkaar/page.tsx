import type { Metadata } from "next";
import { LegalLayout } from "@/components/LegalLayout";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Vilkår for brug og abonnement",
  description: "Vilkår for brug af NordInvest: abonnement, opsigelse, fortrydelsesret, ansvar for beregninger og hvordan du kontakter os.",
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
      title="Vilkår for brug"
      updated="5. september 2026"
      sections={[
        {
          h: "1. Om tjenesten og udbyderen",
          p: [
            "NordInvest er et analyseværktøj, der hjælper dig med at vurdere ejendomsinvesteringer. Ved at oprette en konto accepterer du disse vilkår.",
            `Tjenesten udbydes af ${identity}. Du kan kontakte os på ${site.email} eller ${site.phone}.`,
          ],
        },
        {
          h: "2. Ikke finansiel rådgivning",
          p: [
            "NordInvest leverer beregninger og skøn til oplysningsformål. Det er ikke personlig finansiel eller investeringsmæssig rådgivning. Beslutninger, du træffer på baggrund af tallene, er dit eget ansvar. Søg altid professionel rådgivning inden større investeringer.",
          ],
        },
        {
          h: "3. Abonnement, betaling og fortrydelse",
          p: [
            "Betalte planer afregnes månedligt via Stripe. Du kan opgradere, nedgradere eller opsige når som helst med virkning fra næste betalingsperiode; ved opsigelse beholder du adgangen resten af den periode, du har betalt for.",
            "Er du forbruger, har du som udgangspunkt 14 dages fortrydelsesret. Da tjenesten er digitalt indhold, du får adgang til med det samme, giver du ved købet samtykke til, at leveringen begynder straks, og anerkender, at fortrydelsesretten dermed bortfalder. Se de fulde regler i vores fortrydelses- og refunderingspolitik.",
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
        {
          h: "7. Lovvalg og klage",
          p: [
            "Vilkårene er underlagt dansk ret. Er du forbruger, kan en tvist indbringes for de danske domstole eller for Center for Klageløsning / Forbrugerklagenævnet (Nævnenes Hus, naevneneshus.dk). EU-Kommissionens onlineklageportal findes på ec.europa.eu/consumers/odr.",
          ],
        },
      ]}
    />
  );
}
