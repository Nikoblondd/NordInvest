import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://nordinvest.io"),
  title: {
    default: "NordInvest — Analyser ejendomsinvesteringer på under 60 sekunder",
    template: "%s · NordInvest",
  },
  description:
    "Analyser danske ejendomsinvesteringer på under 60 sekunder. Få cashflow, afkast og rentestress-test — indsæt et link fra en dansk boligside og få en klar dom.",
  openGraph: {
    type: "website",
    locale: "da_DK",
    siteName: "NordInvest",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="da" className={inter.variable}>
      <body>{children}</body>
    </html>
  );
}
