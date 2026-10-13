/*
 * Long-form public guides for the search clusters around buying: forældrekøb,
 * bidding on a home and reading a salgsopstilling. Facts are sourced (see
 * `sources`) and written for Danish private investors. Each guide links to the
 * matching NordInvest feature.
 */

export type GuideSection = { id: string; h2: string; body: string[]; list?: string[]; table?: { head: string[]; rows: string[][] } };
export type Guide = {
  slug: string;
  path: string;
  metaTitle: string;
  metaDescription: string;
  h1: string;
  lead: string;
  updated: string;
  sections: GuideSection[];
  faq: { q: string; a: string }[];
  sources: { href: string; label: string }[];
  related: { href: string; label: string }[];
  feature: { href: string; label: string; text: string };
};

export const GUIDES: Guide[] = [
  {
    slug: "foraeldrekoeb",
    path: "/foraeldrekoeb",
    metaTitle: "Forældrekøb 2026: regler, skat og beregner · NordInvest",
    metaDescription: "Sådan virker forældrekøb: markedsleje, de tre skatteordninger, reglerne siden 2021, skat ved salg og en beregner, der viser om køb slår leje.",
    h1: "Forældrekøb: regler, skat og hvad det giver familien",
    lead: "Ved et forældrekøb køber forældrene en bolig og lejer den ud til deres barn. Det kan være en god investering, men kun hvis huslejen, finansieringen og skatten hænger sammen. Her er reglerne, og en beregner, der viser om køb slår leje.",
    updated: "2026-10-14",
    sections: [
      {
        id: "hvad",
        h2: "Hvad er et forældrekøb?",
        body: [
          "Et forældrekøb er, når forældre køber en ejerlejlighed eller et hus og udlejer den til deres barn, typisk mens barnet studerer. Barnet betaler husleje til forældrene, og når studiet er slut, sælges boligen, eller den lejes ud til andre.",
          "Skattemæssigt er forældrene udlejere. Det betyder, at lejeindtægten skal beskattes, og at en eventuel gevinst ved salg beskattes som ejendomsavance, fordi boligen ikke har været forældrenes egen bolig. Reglerne gælder ikke for andelsboliger, hvor foreningens vedtægter i stedet afgør, hvad der er muligt.",
        ],
      },
      {
        id: "markedsleje",
        h2: "Markedsleje: barnet må gerne betale mindre, men skatten følger markedet",
        body: [
          "Ifølge Skattestyrelsen skal forældrene altid beskattes af markedslejen, altså den husleje boligen kunne lejes ud til en fremmed. Betaler barnet mindre, bliver forældrene stadig beskattet af den fulde markedsleje.",
          "Derfor giver det sjældent mening at sætte huslejen lavt for at hjælpe barnet. Hjælpen bliver dyrere i skat, end hvis I lod barnet betale markedslejen og hjalp på anden vis. Et godt udgangspunkt er lejen for tilsvarende lejligheder i samme område.",
        ],
      },
      {
        id: "skat",
        h2: "De tre måder at blive beskattet på",
        body: [
          "Forældrene vælger, hvordan overskuddet fra udlejningen beskattes. Valget har betydning for både skatten hvert år og for, hvor meget bogføring der skal til.",
        ],
        table: {
          head: ["Ordning", "Sådan virker den", "Særligt for forældrekøb"],
          rows: [
            ["Almindelige regler (personskatteloven)", "Overskuddet beskattes som personlig indkomst med AM-bidrag. Renteudgifter trækkes fra i kapitalindkomsten.", "Simpelt og uden krav om bogføring."],
            ["Kapitalafkastordningen", "En del af overskuddet beskattes som kapitalindkomst uden AM-bidrag. Satsen var 2 % i 2025 (4 % i 2024).", "Siden 2021 indgår købsprisen for forældrekøbsboligen ikke i grundlaget for kapitalafkastet."],
            ["Virksomhedsordningen", "Overskuddet kan spares op i virksomheden til en lav foreløbig skat. Renteudgifter rentekorrigeres; satsen var 5 % i 2025 (7 % i 2024).", "Siden 2021 har renteudgifter samme fradragsværdi som for en privatperson. Kræver regnskab og indskudskonto."],
          ],
        },
      },
      {
        id: "salg",
        h2: "Skat når boligen sælges",
        body: [
          "Gevinsten ved salg beskattes efter ejendomsavancebeskatningsloven. Avancen er salgsprisen minus salgsomkostninger og minus købspris og købsomkostninger. Ved udregningen får I et tillæg til købsprisen på 10.000 kr. for hvert år, I har ejet boligen.",
          "Sælger I boligen til barnet, skal handlen ske til markedspris. Er prisen lavere, regnes forskellen som en gave.",
        ],
      },
      {
        id: "beregning",
        h2: "Slår køb leje? Regn det igennem",
        body: [
          "Det afgørende spørgsmål er, om familien står bedre efter studietiden ved at eje boligen end ved at betale husleje til en udlejer. Ved et forældrekøb går huslejen til jer selv, men I betaler renter, ejerudgift og vedligehold, og I har penge bundet i udbetalingen. Til gengæld får I prisstigningen, når boligen sælges, minus skat.",
          "Beregneren nedenfor bruger NordInvests egen model. Ret tallene, så ser du resultatet for jeres situation.",
        ],
      },
      {
        id: "tjekliste",
        h2: "Tjekliste før I køber",
        body: ["Det er de punkter, der oftest går galt i et forældrekøb."],
        list: [
          "Læs ejerforeningens vedtægter og referater: tillader foreningen udlejning, og er der krav til lejeperiode eller godkendelse?",
          "Fastsæt huslejen efter markedslejen, og lav en skriftlig lejekontrakt med barnet.",
          "Tal med banken om finansieringen. Realkredit kan typisk dække op til 80 % af prisen, resten skal komme fra opsparing eller banklån.",
          "Vælg skatteordning sammen med en revisor, før det første år er gået.",
          "Regn på salget: hvad skal prisen stige med, før køb slår leje, når skat og salgsomkostninger er betalt?",
          "Tjek lokalplaner og kommende udgifter, fx kloakseparering eller en stor renovering i foreningen.",
        ],
      },
    ],
    faq: [
      { q: "Kan forældrekøb betale sig i 2026?", a: "Det afhænger af prisen, renten og hvor meget boligen stiger. Med en husleje på markedsniveau, en rimelig rente og en ejertid på 4-6 år kommer mange familier ud bedre end ved at leje, men et lavt prisstigningstempo kan vende regnestykket. Brug beregneren med jeres egne tal." },
      { q: "Må barnet betale en lavere husleje?", a: "Ja, men forældrene skal stadig beskattes af markedslejen. En lav husleje gør derfor hjælpen dyrere i skat." },
      { q: "Gælder forældrekøb for andelsboliger?", a: "Nej. Skattestyrelsens regler for forældrekøb gælder ikke andelsboliger. Om en andelsbolig må udlejes, afgør andelsboligforeningens vedtægter." },
      { q: "Hvordan beskattes gevinsten ved salg?", a: "Som ejendomsavance. Avancen er salgspris minus salgsomkostninger og minus købspris og købsomkostninger, og I får et tillæg på 10.000 kr. for hvert år, I har ejet boligen." },
    ],
    sources: [
      { href: "https://skat.dk/borger/bolig-og-ejendomme/koeb-af-bolig/foraeldrekoeb", label: "Skattestyrelsen: Forældrekøb" },
    ],
    related: [
      { href: "/udlejning-af-lejlighed", label: "Regler og skat ved udlejning af lejlighed" },
      { href: "/beregn-husleje", label: "Beregn markedslejen for en lejlighed" },
      { href: "/funktioner/dokumentgennemgang", label: "Få vedtægter og referater læst af AI" },
    ],
    feature: { href: "/funktioner/boliganalyse", label: "Regn den konkrete lejlighed igennem", text: "NordInvests analyse har en forældrekøbsvisning, der sammenligner køb med leje for en bestemt bolig, med pris, ejerudgift og markedsleje hentet fra annoncen." },
  },
  {
    slug: "saadan-byder-du-paa-en-bolig",
    path: "/saadan-byder-du-paa-en-bolig",
    metaTitle: "Sådan byder du på en bolig: forbehold, modbud og maks",
    metaDescription: "Guide til at byde på et hus eller en lejlighed: find dit maksimale bud, brug de rigtige forbehold, håndtér modbud og svarfrist, og kend fortrydelsesretten.",
    h1: "Sådan byder du på en bolig",
    lead: "Et godt bud er ikke det laveste, mægleren tager imod. Det er et bud, du har regnet på, med de rigtige forbehold og en svarfrist, der holder processen i gang. Sådan gør du, skridt for skridt.",
    updated: "2026-10-14",
    sections: [
      {
        id: "foer",
        h2: "Før du byder: kend dit maksimale bud",
        body: [
          "Beslut dit højeste bud, før du taler med mægleren. Når forhandlingen er i gang, er det svært at holde fast i et tal, du ikke har regnet på. For en investeringsbolig er maksimum den pris, hvor cash flowet og afkastet stadig lever op til dine krav. For en bolig du selv skal bo i, er det den pris, din økonomi og banken kan bære.",
          "Regn boligen igennem ved flere priser og flere renter. Den pris, hvor cash flowet rammer nul, er dit loft for en udlejningsbolig, og den rente, hvor det samme sker, fortæller hvor robust handlen er.",
        ],
        list: [
          "Få et lånetilsagn fra banken, så du ved, hvad du kan købe for.",
          "Læs salgsopstilling, tilstandsrapport, elinstallationsrapport, energimærke og ejerforeningens referater.",
          "Sammenlign kvadratmeterprisen med lignende boliger til salg i samme postnummer.",
          "Hav en købers rådgiver klar til at læse købsaftalen.",
        ],
      },
      {
        id: "buddet",
        h2: "Sådan afgiver du buddet",
        body: [
          "Bud afgives til sælgers ejendomsmægler, helst skriftligt. Skriv beløbet, hvornår du ønsker at overtage boligen, dine forbehold og hvor længe buddet gælder. En kort svarfrist, typisk et døgn eller to, giver sælger et klart tidspunkt at forholde sig til.",
          "Begynd under dit maksimum, men ikke så lavt, at sælger ikke vil forhandle. Udgangspunktet er, hvad lignende boliger handles til, og hvor længe boligen har været til salg. En bolig, der har ligget længe, eller som har fået sat prisen ned, giver mere plads.",
        ],
      },
      {
        id: "forbehold",
        h2: "Forbehold du bør tage",
        body: ["Forbehold beskytter dig, hvis noget viser sig efter, at sælger har accepteret. De mest almindelige er:"],
        list: [
          "Advokatforbehold: din købers rådgiver skal godkende købsaftalen og alle papirer, før handlen er bindende.",
          "Finansieringsforbehold: handlen forudsætter, at du får den finansiering, du har regnet med.",
          "Forbehold for salg af egen bolig, hvis du skal sælge først.",
          "Forbehold for udlejning, hvis du køber en lejlighed for at leje den ud: foreningen skal tillade det.",
        ],
      },
      {
        id: "modbud",
        h2: "Når sælger kommer med et modbud",
        body: [
          "Et modbud betyder, at sælger vil handle, men til en højere pris. Du kan acceptere, give et nyt bud eller stoppe. Hold dig til dit maksimum, og spørg efter noget andet end prisen, hvis I er tæt på: en senere overtagelse, at sælger betaler en del af omkostningerne eller at noget inventar følger med.",
          "Skriv alle bud og modbud ned med dato og svarfrist. Når der er flere bud i spil, eller flere boliger på én gang, er det let at miste overblikket.",
        ],
      },
      {
        id: "fortrydelse",
        h2: "Accepteret: købsaftale og fortrydelsesret",
        body: [
          "Når sælger accepterer, laver mægleren en købsaftale. Den skal gennemgås af din rådgiver, før du skriver under. Som privat køber af en bolig har du fortrydelsesret i 6 hverdage, mod at betale 1 % af købesummen til sælger. Har du taget et advokatforbehold, bruger du det i stedet, hvis rådgiveren ikke kan godkende handlen.",
        ],
      },
    ],
    faq: [
      { q: "Hvor meget skal man byde under udbudsprisen?", a: "Der er ingen fast regel. Se på, hvad lignende boliger handles til, hvor længe boligen har været til salg, og om prisen er sat ned. Beslut dit maksimum ud fra dine egne tal, før du byder." },
      { q: "Er et bud bindende?", a: "Et bud bliver bindende, når sælger accepterer det, medmindre du har taget forbehold. Derfor bør du altid tage advokatforbehold og finansieringsforbehold." },
      { q: "Hvad er fortrydelsesretten ved boligkøb?", a: "Som privat køber kan du fortryde købet inden for 6 hverdage mod at betale 1 % af købesummen til sælger." },
      { q: "Hvordan holder jeg styr på flere bud?", a: "Skriv hvert bud ned med beløb, dato, status og svarfrist. I NordInvest gemmes det på boligen, svarfristen lægges i kalenderen, og du ser dit bud mod udbudsprisen og dit maksimum." },
    ],
    sources: [
      { href: "https://www.retsinformation.dk/eli/lta/2015/1123", label: "Lov om forbrugerbeskyttelse ved erhvervelse af fast ejendom (fortrydelsesret)" },
    ],
    related: [
      { href: "/salgsopstilling", label: "Sådan læser du en salgsopstilling" },
      { href: "/analyse-af-ejendomsinvestering", label: "Analyse af ejendomsinvestering i Danmark" },
      { href: "/funktioner/boliganalyse", label: "Find dit maksimum med boliganalysen" },
    ],
    feature: { href: "/funktioner/pipeline", label: "Hold styr på bud, modbud og svarfrister", text: "I NordInvests pipeline registrerer du hvert bud og modbud, svarfristen kommer i kalenderen, og du ser dit bud mod udbudsprisen og dit maksimum." },
  },
  {
    slug: "salgsopstilling",
    path: "/salgsopstilling",
    metaTitle: "Salgsopstilling: sådan læser du den før du byder",
    metaDescription: "Forstå salgsopstillingen på et hus, en ejerlejlighed eller en andelsbolig: kontantpris, ejerudgift, nettoydelse, tilstandsrapporten og faldgruberne.",
    h1: "Salgsopstilling: sådan læser du den, før du byder",
    lead: "Salgsopstillingen er mæglerens samlede beskrivelse af boligen og handlen. Den er fuld af tal, og de vigtigste står ikke altid øverst. Her er, hvad de betyder, og hvor de dyre overraskelser plejer at gemme sig.",
    updated: "2026-10-14",
    sections: [
      {
        id: "tal",
        h2: "Tallene øverst: kontantpris, udbetaling og ejerudgift",
        body: [
          "Kontantprisen er den pris, sælger beder om. Udbetalingen er den del, du selv skal betale, og ejerudgiften er de faste udgifter pr. måned, før du har betalt på lånet.",
        ],
        table: {
          head: ["Post", "Hvad det dækker", "Hvad du skal tjekke"],
          rows: [
            ["Ejerudgift", "Ejendomsskatter (grundskyld og ejendomsværdiskat), forsikring, fællesudgifter i en ejerforening, renovation m.m.", "Er den realistisk? Mangler der vedligehold, vand eller varme? Sammenlign med lignende boliger."],
            ["Brutto- og nettoydelse", "Mæglerens eksempel på et lån og ydelsen før og efter skattefradrag.", "Eksemplet bruger mæglerens rente og løbetid. Regn med dit eget lånetilbud."],
            ["Boligareal", "Det areal, der er registreret i BBR.", "Matcher BBR og det, du ser? Uudnyttet tagetage og kælder tæller ikke med."],
            ["Ejerforening", "Fællesudgifter, foreningens økonomi og vedligeholdelsesplan.", "Læs regnskab og referater: er der store projekter eller stigende fællesudgifter på vej?"],
          ],
        },
      },
      {
        id: "tilstand",
        h2: "Tilstandsrapporten: hvor alvorlige er skaderne?",
        body: [
          "For huse følger der normalt en tilstandsrapport fra en beskikket bygningssagkyndig. Siden 1. oktober 2020 markeres skaderne med en farveskala efter alvor: kritiske skader, alvorlige skader, mindre alvorlige skader og mulige skader, som du selv bør få undersøgt nærmere. De mulige skader er markeret med et spørgsmålstegn, og køber du uden at få dem undersøgt, bærer du selv risikoen.",
          "Ældre rapporter bruger karaktererne K0 (kosmetisk) til K3 (kritisk) og UN (bør undersøges nærmere). Farverne og karaktererne fortæller, hvor alvorlig en skade er, ikke hvad den koster at udbedre. Læs hele rapporten, ikke kun forsiden, og få en håndværker til at prissætte de alvorlige og kritiske skader, før du byder. Alle rapporter på en bolig kan findes på boligejer.dk.",
        ],
      },
      {
        id: "andel",
        h2: "Salgsopstilling for en andelsbolig",
        body: [
          "En andelsbolig har en anden opstilling. Her betaler du for en andel af foreningen, og prisen er bundet af foreningens vedtægter. Se især på andelsværdien, boligafgiften pr. måned, foreningens gæld og nøgleoplysningsskemaet, der viser foreningens økonomi. En høj gæld i foreningen kan betyde stigende boligafgift senere.",
        ],
      },
      {
        id: "faldgruber",
        h2: "Faldgruber, der ofte står længere nede",
        body: ["Det er de punkter, investorer oftest overser:"],
        list: [
          "Udlejningsforbud eller krav om godkendelse i ejerforeningens vedtægter.",
          "Kommende projekter i foreningen: tag, facade, faldstammer eller vinduer.",
          "Servitutter og lokalplaner, der begrænser hvad du må bruge boligen til.",
          "Kloakseparering eller andre krav fra kommunen, som du som ejer skal betale.",
          "Et lavt energimærke, der betyder høje varmeudgifter og krav om forbedringer.",
          "Lejeregulering: boliger taget i brug før 1992 kan være omfattet af omkostningsbestemt leje.",
        ],
      },
    ],
    faq: [
      { q: "Hvad er forskellen på brutto- og nettoydelse?", a: "Bruttoydelsen er den samlede betaling på lånet før skat. Nettoydelsen er efter skattefradrag for renterne. Begge er mæglerens eksempel og passer ikke nødvendigvis med dit eget lånetilbud." },
      { q: "Hvad betyder farverne og K3 i en tilstandsrapport?", a: "Siden oktober 2020 markeres skader efter alvor fra kritiske over alvorlige og mindre alvorlige skader til mulige skader, der bør undersøges nærmere. I ældre rapporter er K3 den kritiske karakter. Hverken farve eller karakter siger noget om prisen, så få en håndværker til at prissætte skaden, før du byder." },
      { q: "Hvad skal jeg se efter i en andelsboligs salgsopstilling?", a: "Andelsværdi, boligafgift, foreningens gæld og nøgleoplysningsskemaet. En forening med høj gæld kan få brug for at hæve boligafgiften." },
      { q: "Kan AI læse en salgsopstilling?", a: "Ja. I NordInvest kan du uploade salgsopstilling, tilstandsrapport og referater og få et resumé, de vigtigste tal, risici med sidehenvisning og spørgsmål til mægleren." },
    ],
    sources: [
      { href: "https://www.boligejer.dk/", label: "Boligejer.dk (Erhvervsstyrelsen): huseftersynsordningen og tilstandsrapporter" },
    ],
    related: [
      { href: "/saadan-byder-du-paa-en-bolig", label: "Sådan byder du på en bolig" },
      { href: "/udlejning-af-lejlighed", label: "Regler og skat ved udlejning af lejlighed" },
      { href: "/ordbog", label: "Ordbog for ejendomsinvestering" },
    ],
    feature: { href: "/funktioner/dokumentgennemgang", label: "Få papirerne læst af AI", text: "Upload salgsopstilling, tilstandsrapport eller referat, og få risici med sidetal, de vigtigste tal og spørgsmål til mægleren." },
  },
];

export const guideBySlug = (slug: string) => GUIDES.find((g) => g.slug === slug);
