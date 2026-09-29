/*
 * The kommuner that get their own Deal-motor page (/deals/<slug>). Each page
 * shows that kommune's live ranking, so every page carries its own data. Kept
 * to the larger rental markets; a small kommune rarely has enough listings to
 * rank.
 */

export type DealCity = {
  slug: string; // kommune slug, as in lib/kommuner
  name: string;
  /** "i Aarhus" / "på Frederiksberg" */
  in: string;
  note: string;
  guide?: string; // our investment guide for the area, when there is one
};

export const DEAL_CITIES: DealCity[] = [
  { slug: "koebenhavn", name: "København", in: "i København", note: "Danmarks største lejemarked. Høje kvadratmeterpriser gør positivt cashflow sjældent, så de fleste investorer her køber for værdistigningen.", guide: "/investering-i-ejendom-koebenhavn" },
  { slug: "frederiksberg", name: "Frederiksberg", in: "på Frederiksberg", note: "Tæt byområde med stor efterspørgsel på lejeboliger og nogle af landets højeste kvadratmeterpriser." },
  { slug: "aarhus", name: "Aarhus", in: "i Aarhus", note: "Danmarks næststørste by med et stort studie- og lejemarked. Ejerlejligheder i midtbyen er dyre; forstæderne giver oftere et bedre afkast.", guide: "/investering-i-ejendom-aarhus" },
  { slug: "odense", name: "Odense", in: "i Odense", note: "Fyns største by, med universitet og et voksende lejemarked til lavere priser end København og Aarhus.", guide: "/investering-i-ejendom-fyn" },
  { slug: "aalborg", name: "Aalborg", in: "i Aalborg", note: "Nordjyllands største by. Universitetet holder efterspørgslen på mindre lejligheder oppe, og priserne ligger under de største byer." },
  { slug: "esbjerg", name: "Esbjerg", in: "i Esbjerg", note: "Havne- og energiby med relativt lave boligpriser, hvor lejen oftere kan bære finansieringen." },
  { slug: "randers", name: "Randers", in: "i Randers", note: "Østjysk by med lave kvadratmeterpriser tæt på Aarhus, ofte med et højere bruttoafkast." },
  { slug: "kolding", name: "Kolding", in: "i Kolding", note: "Trekantsområdets handels- og uddannelsesby med et stabilt lejemarked." },
  { slug: "horsens", name: "Horsens", in: "i Horsens", note: "Voksende by mellem Aarhus og Vejle, hvor nybyggeri og tilflytning præger lejemarkedet." },
  { slug: "vejle", name: "Vejle", in: "i Vejle", note: "Trekantsområdets største by med stigende befolkning og en blanding af nyt og ældre boligbyggeri." },
  { slug: "roskilde", name: "Roskilde", in: "i Roskilde", note: "Pendlerby tæt på København, hvor priserne ligger under hovedstaden, men lejen følger efter." },
  { slug: "herning", name: "Herning", in: "i Herning", note: "Midtjysk erhvervsby med lave boligpriser og ofte et højt bruttoafkast." },
  { slug: "silkeborg", name: "Silkeborg", in: "i Silkeborg", note: "Attraktiv midtjysk by med stigende priser og stabil efterspørgsel på lejeboliger." },
  { slug: "naestved", name: "Næstved", in: "i Næstved", note: "Sydsjællands største by med lavere priser end hovedstadsområdet." },
  { slug: "viborg", name: "Viborg", in: "i Viborg", note: "Administrativ by i Midtjylland med et roligt, stabilt boligmarked." },
  { slug: "fredericia", name: "Fredericia", in: "i Fredericia", note: "Trekantsområdets havneby, hvor lave priser giver plads til et bedre cashflow." },
];

export const dealCity = (slug: string) => DEAL_CITIES.find((c) => c.slug === slug);
