import type { Metadata } from "next";
import GameClient from "./GameClient";

export const metadata: Metadata = {
  title: "Gæt Boligprisen — multiplayer prisspil på danske boliger",
  description:
    "Se billederne af rigtige danske boliger fra Boligsiden og gæt prisen. Multiplayer, hints koster point, tættest på vinder. Vælg region, antal runder og spillere.",
  alternates: { canonical: "https://nordinvest.io/spil" },
};

export default function SpilPage() {
  return <GameClient />;
}
