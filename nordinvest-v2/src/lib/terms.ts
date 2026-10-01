/*
 * One page per term at /ordbog/<slug>. Picked from what Danes actually search
 * (Bing/Google suggestions, 2026-10-01): "hvad er cash flow", "investeringsejendom
 * definition", "beregn afkastningsgrad" and so on. The first sentence answers the
 * question on its own, so search engines and AI assistants can quote it.
 */

export type Term = {
  slug: string;
  term: string;
  aka?: string[];
  question: string; // the search, as a heading
  definition: string; // answers the question in 1–3 sentences
  formula?: string;
  example?: string;
  use: string; // why it matters when you buy to let
  related: string[]; // other term slugs
  links: { href: string; label: string }[];
};

export const TERMS: Term[] = [
  {
    slug: "cash-flow",
    term: "Cash flow",
    aka: ["pengestrøm", "cashflow"],
    question: "Hvad er cash flow?",
    definition:
      "Cash flow er de penge, der kommer ind, minus de penge, der går ud, i en periode. For en udlejningsbolig er det lejen hver måned minus lån, ejerudgift, vedligehold og andre faste udgifter. Er tallet positivt, betaler boligen sig selv.",
    formula: "Cash flow = leje − (ydelse på lån + ejerudgift + vedligehold + tomgang)",
    example:
      "En lejlighed udlejes for 10.000 kr. om måneden. Lånet koster 6.900 kr., ejerudgiften 2.200 kr. og vedligehold 600 kr. Cash flow er 10.000 − 9.700 = +300 kr. om måneden.",
    use: "Cash flow er det første tal, en privat udlejer skal se på: et negativt cash flow betyder, at du selv betaler til boligen hver måned, uanset hvad den stiger i værdi.",
    related: ["afkastningsgrad", "kontantafkast", "lejeindtaegt"],
    links: [
      { href: "/beregn-afkast", label: "Beregn cash flow og afkast" },
      { href: "/deals", label: "Se boliger med positivt cash flow" },
    ],
  },
  {
    slug: "investeringsejendom",
    term: "Investeringsejendom",
    aka: ["udlejningsejendom"],
    question: "Hvad er en investeringsejendom?",
    definition:
      "En investeringsejendom er en ejendom, du ejer for at tjene penge på den, enten gennem lejeindtægt eller værdistigning, i stedet for at bo i den selv. Det kan være en ejerlejlighed eller et hus, du lejer ud, eller en erhvervs- eller boligudlejningsejendom med flere lejemål.",
    example:
      "Køber du en toværelses lejlighed i Aarhus for at leje den ud, er den en investeringsejendom. Køber dine forældre den, så du kan bo i den, er det et forældrekøb, som også er en investeringsejendom for dem.",
    use: "En investeringsejendom vurderes på, hvad den tjener: lejen, udgifterne, finansieringen og risikoen, ikke på hvor godt man selv kunne lide at bo der.",
    related: ["afkastningsgrad", "cash-flow", "lejeindtaegt"],
    links: [
      { href: "/deals", label: "Investeringsejendomme til salg" },
      { href: "/analyse-af-ejendomsinvestering", label: "Sådan analyserer du en investeringsejendom" },
    ],
  },
  {
    slug: "afkastningsgrad",
    term: "Afkastningsgrad",
    aka: ["nettoafkast", "cap rate", "startafkast"],
    question: "Hvad er afkastningsgrad, og hvordan beregner man den?",
    definition:
      "Afkastningsgraden er ejendommens årlige driftsresultat divideret med købsprisen, i procent. Driftsresultatet er lejen minus de faste udgifter, men før renter og afdrag. Den bruges til at sammenligne ejendomme uanset hvordan de er finansieret.",
    formula: "Afkastningsgrad = (årlig leje − faste udgifter) / købspris × 100",
    example:
      "En ejendom til 2.000.000 kr. lejes ud for 120.000 kr. om året og har 30.000 kr. i faste udgifter. Afkastningsgraden er 90.000 / 2.000.000 = 4,5 %.",
    use: "Ligger afkastningsgraden under renten på dit lån, giver boligen typisk negativt cash flow med en almindelig udbetaling.",
    related: ["bruttoafkast", "kontantafkast", "cash-flow"],
    links: [{ href: "/beregn-afkast", label: "Beregn afkastningsgrad" }],
  },
  {
    slug: "bruttoafkast",
    term: "Bruttoafkast",
    aka: ["bruttolejeafkast"],
    question: "Hvad er bruttoafkast?",
    definition:
      "Bruttoafkastet er lejen for et år divideret med købsprisen, i procent, før der er trukket udgifter fra. Det er et hurtigt første tal, men det overvurderer altid, hvad boligen tjener.",
    formula: "Bruttoafkast = årlig leje / købspris × 100",
    example: "En bolig til 1.500.000 kr. med en leje på 9.000 kr. om måneden har et bruttoafkast på 108.000 / 1.500.000 = 7,2 %.",
    use: "Brug bruttoafkastet til at sortere boliger hurtigt, og regn derefter nettoafkast og cash flow, før du byder.",
    related: ["afkastningsgrad", "kontantafkast"],
    links: [{ href: "/beregn-afkast", label: "Beregn bruttoafkast" }],
  },
  {
    slug: "kontantafkast",
    term: "Kontantafkast",
    aka: ["cash-on-cash"],
    question: "Hvad er kontantafkast?",
    definition:
      "Kontantafkastet er det, der er tilbage om året efter alle udgifter og ydelsen på lånet, divideret med din egen udbetaling, i procent. Det viser, hvad dine egne penge giver, når lånet er med i regnestykket.",
    formula: "Kontantafkast = (årlig leje − udgifter − ydelse) / udbetaling × 100",
    example: "Du lægger 400.000 kr. i udbetaling, og boligen giver 12.000 kr. i overskud om året efter lån. Kontantafkastet er 12.000 / 400.000 = 3 %.",
    use: "Kontantafkastet kan sammenlignes direkte med, hvad pengene ellers kunne give, fx i aktier eller på en opsparing.",
    related: ["afkastningsgrad", "cash-flow", "belaaningsgrad"],
    links: [{ href: "/beregn-afkast", label: "Beregn kontantafkast" }],
  },
  {
    slug: "lejeindtaegt",
    term: "Lejeindtægt",
    question: "Hvad er lejeindtægt?",
    definition:
      "Lejeindtægt er den leje, du modtager fra en lejer for at bruge din bolig. Den er skattepligtig, og hvordan den beskattes, afhænger af, om du udlejer en hel bolig, en del af din egen bolig eller et sommerhus.",
    example: "Udlejer du en lejlighed for 9.500 kr. om måneden, er din lejeindtægt 114.000 kr. om året, før udgifter og skat.",
    use: "Sæt lejen realistisk: den bærer hele afkastet, og den må ikke overstige det, lejereglerne tillader.",
    related: ["markedsleje", "cash-flow", "omkostningsbestemt-leje"],
    links: [
      { href: "/beregn-husleje", label: "Beregn husleje ved udlejning" },
      { href: "/blog/ejendomsskat-investeringsejendom-2026", label: "Skat på lejeindtægt" },
    ],
  },
  {
    slug: "markedsleje",
    term: "Markedsleje",
    aka: ["fri leje"],
    question: "Hvad er markedsleje?",
    definition:
      "Markedsleje er den leje, som udlejer og lejer frit aftaler, typisk det tilsvarende boliger i området udlejes for. Fri leje kan bl.a. aftales for boliger i ejendomme, der er taget i brug efter 31. december 1991.",
    example: "Ligger lejen for tilsvarende lejligheder i området på 130 kr. pr. m² om måneden, er markedslejen for 70 m² omkring 9.100 kr.",
    use: "Regn aldrig med markedsleje i en ældre ejendom, før du har tjekket, om lejen er reguleret.",
    related: ["omkostningsbestemt-leje", "det-lejedes-vaerdi", "lejereserve"],
    links: [{ href: "/beregn-husleje", label: "Beregn markedslejen for din bolig" }],
  },
  {
    slug: "omkostningsbestemt-leje",
    term: "Omkostningsbestemt leje",
    question: "Hvad er omkostningsbestemt leje?",
    definition:
      "Omkostningsbestemt leje er en leje, der fastsættes ud fra ejendommens nødvendige driftsudgifter plus et afkast til ejeren, ikke ud fra markedet. Den gælder i kommuner med huslejeregulering for ældre ejendomme med flere lejemål, og den ligger ofte under markedslejen.",
    example: "En lejlighed, der kunne udlejes for 11.000 kr. til markedsleje, kan have en omkostningsbestemt leje på 7.500 kr. Forskellen kan gøre en god handel til en dårlig.",
    use: "Køber du i en ældre udlejningsejendom, så få lejefastsættelsen tjekket. Den lovlige leje kan være lavere end den, der står i salgsopstillingen.",
    related: ["markedsleje", "det-lejedes-vaerdi", "lejereserve"],
    links: [{ href: "/beregn-husleje", label: "Se hvilke lejeregler der gælder" }],
  },
  {
    slug: "det-lejedes-vaerdi",
    term: "Det lejedes værdi",
    question: "Hvad betyder det lejedes værdi?",
    definition:
      "Det lejedes værdi er den leje, der svarer til, hvad tilsvarende lejemål i området udlejes for, når man tager højde for beliggenhed, størrelse, stand og udstyr. Lejen må som udgangspunkt ikke overstige det lejedes værdi, fx når du udlejer en enkelt ejerlejlighed eller et hus.",
    example: "Tilsvarende lejligheder i opgangen udlejes for 8.000 til 8.500 kr. Tager du 10.500 kr., kan lejeren få lejen sat ned i huslejenævnet.",
    use: "Sammenlign med konkrete lejemål i området, før du sætter lejen, og gem dokumentationen.",
    related: ["markedsleje", "omkostningsbestemt-leje"],
    links: [{ href: "/beregn-husleje", label: "Beregn husleje ved udlejning" }],
  },
  {
    slug: "lejereserve",
    term: "Lejereserve",
    question: "Hvad er lejereserve?",
    definition:
      "Lejereserven er forskellen mellem den leje, der betales i dag, og den højeste leje, der lovligt kan opkræves. En stor lejereserve betyder, at lejen kan hæves, fx ved genudlejning eller efter forbedringer, inden for lejereglerne.",
    example: "Lejen er 7.000 kr., og den lovlige leje er 8.200 kr. Lejereserven er 1.200 kr. om måneden, eller 14.400 kr. om året.",
    use: "Lejereserven er et af de tal, danske investorer optimerer efter, fordi den viser, hvor meget mere ejendommen kan tjene uden at købe noget nyt.",
    related: ["markedsleje", "omkostningsbestemt-leje", "cash-flow"],
    links: [{ href: "/analyseren", label: "Se lejereserven for en bolig" }],
  },
  {
    slug: "gaeldsdaekning",
    term: "Gældsdækning (DSCR)",
    aka: ["DSCR", "debt service coverage ratio"],
    question: "Hvad er gældsdækning (DSCR)?",
    definition:
      "Gældsdækningen er ejendommens årlige driftsresultat divideret med den årlige ydelse på lånet. Er den over 1, dækker lejen lånet. Er den under 1, skal du selv betale til.",
    formula: "Gældsdækning = årligt driftsresultat / årlig ydelse",
    example: "Driftsresultatet er 90.000 kr., og ydelsen er 75.000 kr. Gældsdækningen er 90.000 / 75.000 = 1,2.",
    use: "Banker kigger på gældsdækningen, når de vurderer et lån til en udlejningsejendom. Jo højere, jo bedre kan ejendommen tåle tomgang og rentestigninger.",
    related: ["afkastningsgrad", "belaaningsgrad", "cash-flow"],
    links: [{ href: "/analyseren", label: "Se gældsdækningen for en bolig" }],
  },
  {
    slug: "belaaningsgrad",
    term: "Belåningsgrad (LTV)",
    aka: ["LTV", "loan to value"],
    question: "Hvad er belåningsgrad?",
    definition:
      "Belåningsgraden er lånets størrelse som procent af ejendommens værdi. Realkredit kan låne op til 80 % af værdien på helårsboliger og op til 60 % på fritidshuse, så resten skal komme fra udbetaling eller banklån.",
    formula: "Belåningsgrad = lån / ejendommens værdi × 100",
    example: "En bolig til 2.000.000 kr. med et lån på 1.600.000 kr. har en belåningsgrad på 80 %.",
    use: "En højere belåningsgrad giver et højere kontantafkast, når det går godt, og et større tab, når det går dårligt.",
    related: ["kontantafkast", "gaeldsdaekning"],
    links: [{ href: "/blog/udbetaling-investeringsejendom", label: "Hvor meget udbetaling skal du have?" }],
  },
];

export const term = (slug: string) => TERMS.find((t) => t.slug === slug);
