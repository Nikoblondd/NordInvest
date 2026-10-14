import type { Metadata } from "next";
import { LegalLayout } from "@/components/LegalLayout";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Fortrydelsesret & refundering",
  description: "Dine rettigheder ved køb af NordInvest-abonnement — fortrydelse, opsigelse og refundering.",
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
      title="Fortrydelsesret & refundering"
      updated="5. september 2026"
      sections={[
        {
          h: "1. Kort fortalt",
          p: [
            "NordInvest sælges som et løbende månedligt abonnement. Du kan til enhver tid opsige, og du beholder adgangen resten af den periode, du allerede har betalt for. Der sker som udgangspunkt ikke refundering af den igangværende periode.",
          ],
        },
        {
          h: "2. Fortrydelsesret for forbrugere",
          p: [
            "Køber du som forbruger, har du efter forbrugeraftaleloven som udgangspunkt 14 dages fortrydelsesret fra aftalens indgåelse.",
            "NordInvest er digitalt indhold, som du får adgang til umiddelbart efter købet. Når du gennemfører købet, giver du derfor udtrykkeligt samtykke til, at vi begynder leveringen med det samme, og du anerkender, at din fortrydelsesret bortfalder, når leveringen er påbegyndt. Dette følger forbrugeraftalelovens § 18, stk. 2, nr. 13.",
            "Er leveringen endnu ikke påbegyndt, kan du fortryde ved at kontakte os inden for fristen på " + site.email + ".",
          ],
        },
        {
          h: "3. Opsigelse",
          p: [
            "Du kan opsige dit abonnement når som helst fra dit dashboard eller ved at skrive til os. Opsigelsen får virkning fra næste betalingsperiode, og du bliver ikke opkrævet igen. Du beholder adgangen indtil udgangen af den betalte periode.",
          ],
        },
        {
          h: "4. Refundering",
          p: [
            "Vi refunderer ikke den igangværende måned ved opsigelse. Er du blevet fejlopkrævet, eller har der været en teknisk fejl, der forhindrede dig i at bruge tjenesten, refunderer vi naturligvis — skriv til os, så finder vi en løsning.",
            "Godkendte refunderinger sker til den oprindelige betalingsmetode via Stripe, typisk inden for 5–10 bankdage.",
          ],
        },
        {
          h: "5. Sådan kontakter du os",
          p: [
            `${identity}. Skriv til ${site.email}.`,
          ],
        },
      ]}
    />
  );
}
