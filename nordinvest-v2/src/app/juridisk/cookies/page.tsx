import type { Metadata } from "next";
import { LegalLayout } from "@/components/LegalLayout";

export const metadata: Metadata = {
  title: "Cookiepolitik",
  description: "Sådan bruger NordInvest cookies: nødvendige cookies til login og betaling, analyse-cookies kun med dit samtykke og ingen marketingcookies.",
};

export default function Page() {
  return (
    <LegalLayout
      title="Cookiepolitik"
      updated="13. september 2026"
      sections={[
        {
          h: "1. Hvad vi bruger cookies til",
          p: [
            "NordInvest bruger to slags cookies: teknisk nødvendige cookies (fx til at holde dig logget ind), som altid er aktive, og analyse-cookies, som hjælper os med at forstå, hvordan siden bruges. Analyse-cookies aktiveres KUN, hvis du trykker “Accepter” i cookie-banneret. Vi sætter ingen marketingcookies.",
          ],
        },
        {
          h: "2. Nødvendige cookies",
          p: [
            "Login-sessionen håndteres af vores autentificerings-udbyder (Supabase) via en sikker session-cookie. Uden den kan du ikke være logget ind.",
          ],
        },
        {
          h: "3. Betaling",
          p: [
            "Når du opretter et betalt abonnement, håndteres betalingen af Stripe. Stripe kan sætte nødvendige cookies som led i at gennemføre betalingen sikkert og forebygge svindel. Vi modtager ikke dine fulde kortoplysninger.",
          ],
        },
        {
          h: "4. Analyse (kun med dit samtykke)",
          p: [
            "Hvis du accepterer, bruger vi analyseværktøjer til at forstå, hvordan siden bruges — hvilke sider der besøges, hvor besøgende kommer fra, og hvordan man bevæger sig rundt — så vi kan forbedre produktet. Til det bruger vi PostHog (EU-hosting), som sætter analyse-cookies og kan optage anonymiserede sessioner. Alt hvad du taster (fx i felter og formularer) maskeres og optages ikke.",
            "Vi bruger desuden Vercel Web Analytics til simple, cookiefri besøgstal. Vi bruger ikke Google Analytics eller marketing-pixels, og vi sætter ingen marketingcookies.",
          ],
        },
        {
          h: "5. Dit valg",
          p: [
            "Første gang du besøger siden, spørger vi, om du vil acceptere analyse-cookies. Vælger du “Afvis”, sætter vi ingen analyse-cookies — kun de teknisk nødvendige. Du kan altid ændre dit valg under “Cookie-indstillinger” nederst på hver side. Trækker du samtykket tilbage, stopper analysen med det samme.",
          ],
        },
      ]}
    />
  );
}
