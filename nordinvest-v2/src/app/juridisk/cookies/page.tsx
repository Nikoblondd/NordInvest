import type { Metadata } from "next";
import { LegalLayout } from "@/components/LegalLayout";

export const metadata: Metadata = {
  title: "Cookiepolitik",
  description: "Sådan bruger NordInvest cookies.",
};

export default function Page() {
  return (
    <LegalLayout
      title="Cookiepolitik"
      updated="22. august 2026"
      sections={[
        {
          h: "1. Hvad vi bruger cookies til",
          p: [
            "NordInvest bruger kun de cookies, der er nødvendige for at drive tjenesten — primært til at holde dig logget ind. Vi sætter ikke marketing- eller tredjeparts-sporingscookies.",
          ],
        },
        {
          h: "2. Nødvendige cookies",
          p: [
            "Login-sessionen håndteres af vores autentificerings-udbyder (Supabase) via en sikker session-cookie. Uden den kan du ikke være logget ind.",
          ],
        },
        {
          h: "3. Analyse",
          p: [
            "Til produktforbedring bruger vi privatlivsvenlig analyse (Plausible), der ikke bruger cookies og ikke indsamler personhenførbare data.",
          ],
        },
        {
          h: "4. Dit valg",
          p: [
            "Da vi kun bruger nødvendige cookies, kræver det ikke samtykke efter cookiereglerne. Du kan altid slette cookies i din browser, men så bliver du logget ud.",
          ],
        },
      ]}
    />
  );
}
