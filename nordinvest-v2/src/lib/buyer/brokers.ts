/*
 * The estate agent behind a listing, from the link to its own ad. Boligsiden
 * collects the ads from the agents; this names the chain the buyer knows.
 */
const CHAINS: Record<string, string> = {
  "edc.dk": "EDC",
  "nybolig.dk": "Nybolig",
  "nyboliglandbrug.dk": "Nybolig",
  "danbolig.dk": "Danbolig",
  "home.dk": "Home",
  "johnfrandsen.dk": "John Frandsen",
  "realmaeglerne.dk": "RealMæglerne",
  "estate.dk": "Estate",
  "lokalbolig.dk": "Lokalbolig",
  "maeglerhuset.dk": "Mæglerhuset",
  "brikk.dk": "Brikk",
  "lilienhoff.dk": "Lilienhoff",
  "eltoftnielsen.dk": "Eltoft Nielsen",
  "ejendroem.dk": "Ejendrøm",
  "andliving.dk": "&living",
  "estaldo.com": "Estaldo",
  "minbolighandel.dk": "Min Bolighandel",
  "boligone.dk": "BoligOne",
};

export function domainOf(url: string | null | undefined): string | null {
  const m = url?.match(/^https?:\/\/(?:www\.)?([^/?#:]+)/i);
  return m ? m[1].toLowerCase() : null;
}

/** "Home", "EDC" … or the agent's own domain for the smaller ones. */
export function brokerOf(url: string | null | undefined): string | null {
  const d = domainOf(url);
  if (!d) return null;
  return CHAINS[d] ?? d;
}

export const isChain = (name: string) => Object.values(CHAINS).includes(name);
