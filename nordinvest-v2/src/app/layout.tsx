import type { Metadata } from "next";
import { Fraunces, Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  display: "swap",
  axes: ["opsz"],
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const jetbrains = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://nordinvest.io"),
  title: {
    default: "NordInvest — Analysér enhver dansk ejendom på 60 sekunder",
    template: "%s · NordInvest",
  },
  description:
    "Data-drevne beslutninger for danske ejendomsinvestorer. Indsæt et link, få en klar dom om afkast, cash flow og risiko — på under 60 sekunder.",
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
    <html
      lang="da"
      className={`${fraunces.variable} ${inter.variable} ${jetbrains.variable}`}
    >
      <body>{children}</body>
    </html>
  );
}
