/*
 * The public feature pages (/funktioner/<slug>): what NordInvest does, in the
 * words investors search with. Each page carries its own content (no shared
 * boilerplate beyond the frame), a product screen, real use cases per type of
 * investor and a short FAQ. Facts here must match the product.
 */

export type ScreenKey = "analysis" | "bank" | "deal" | "docs" | "offer" | "pipeline" | "calendar" | "overview";

export type Feature = {
  slug: string;
  nav: string;
  /** <title>, under ~60 characters with the brand. */
  metaTitle: string;
  /** Meta description, 120-160 characters. */
  metaDescription: string;
  h1: string;
  lead: string;
  screens: ScreenKey[];
  intro: string[];
  steps: { title: string; text: string }[];
  points: { title: string; text: string }[];
  investors: { who: string; text: string }[];
  faq: { q: string; a: string }[];
  related: { href: string; label: string }[];
};

export const FEATURES: Feature[] = [
  {
    slug: "boliganalyse",
    nav: "Boliganalyse",
    metaTitle: "Boliganalyse til investorer: cashflow, afkast og bankrapport",
    metaDescription: "Regn en investeringsbolig igennem på et minut: cashflow, afkast, DSCR, rentestress, pris mod området og 10 år frem. Med bankrapport og Excel.",
    h1: "Boliganalyse til investorer: se hvad boligen tjener, før du byder",
    lead: "Indsæt et link fra Boligsiden, home, EDC, Nybolig, Danbolig eller Ejendomstorvet. NordInvest henter tallene, regner boligen igennem og giver dig en klar dom med de fire tal, der afgør handlen.",
    screens: ["analysis", "bank"],
    intro: [
      "En boliganalyse skal svare på fem spørgsmål: Tjener boligen penge hver måned? Er prisen fair for området? Hvad sker der, hvis renten stiger? Er der skjult potentiale? Og hvad er den værd om ti år? NordInvest svarer på dem alle i én analyse, med tal du kan rette og en forklaring på, hvor hvert tal kommer fra.",
      "Analysen bygger på annoncens egne tal, BBR-bygningsdata fra Datafordeler, lejeniveauer fra Danmarks Statistik, lokalplaner og kloakopland fra Plandata og sammenlignelige boliger til salg i samme postnummer. Hvor et tal er et skøn, står det tydeligt, så du ved, hvad du skal bekræfte med mægleren.",
    ],
    steps: [
      { title: "Indsæt linket", text: "Annoncen læses automatisk: pris, areal, værelser, ejerudgift og billeder. Har du ikke et link, skriver du selv pris, leje og udgifter." },
      { title: "Læs dommen", text: "Øverst står konklusionen i én sætning, en score fra 0 til 100 og de fire tal: overskud pr. måned, afkast af prisen, afkast af dine penge og om lejen dækker lånet." },
      { title: "Gå i dybden", text: "Faner med hele regnestykket, pris mod området, risici, potentiale, fremskrivning over ti år og datagrundlaget. Ret et blåt felt, og alt regnes om." },
      { title: "Gem og tag videre", text: "Gem boligen i din pipeline, planlæg fremvisningen, eller tag bankrapporten med til banken." },
    ],
    points: [
      { title: "Cashflow efter alt", text: "Leje minus ydelse, ejerudgift, vedligehold og tomgang. Det tal, der faktisk lander på kontoen hver måned." },
      { title: "Afkast og gældsdækning", text: "Nettoafkast (cap rate), kontantafkast, bruttoafkast, DSCR, IRR, break-even-rente og break-even-belægning." },
      { title: "Rentestress", text: "Hvor meget renten kan stige, før cash flowet går i nul, og hvad hvert procentpoint koster dig om måneden." },
      { title: "Pris mod markedet", text: "Kvadratmeterprisen sammenlignet med lignende boliger til salg i samme postnummer, og et tjek af om ejerudgiften er sat for lavt." },
      { title: "Fremtidige byrder", text: "Lokalplaner, kloakseparering og planforslag fra Plandata, som sjældent står i salgsopstillingen." },
      { title: "Bankrapport og Excel", text: "En PDF med alle nøgletal og forudsætninger til banken, og hele regnearket i Excel, når du vil regne videre selv." },
    ],
    investors: [
      { who: "Udlejning", text: "Se om lejen bærer lån og drift, hvad lejereserven er, og hvad lejeloven betyder for boliger fra før 1992." },
      { who: "Forældrekøb", text: "Sammenlign det samlede resultat med at leje, efter skat ved salg, så familien kan se, om køb slår leje." },
      { who: "Renovering og salg", text: "Flip-analysen giver værdi efter renovering, et budget med rigtige materialepriser, skat og dit maksimale bud." },
      { who: "Erhverv", text: "Udlejningsejendomme, butik og kontor regnes på driftsresultatet med startafkast mod det normale niveau for ejendomstypen." },
    ],
    faq: [
      { q: "Hvor lang tid tager en boliganalyse?", a: "Typisk under et minut fra du indsætter linket, til dommen står på skærmen. Billeder, BBR og sammenlignelige boliger hentes samtidig." },
      { q: "Hvilke boligsider kan NordInvest læse?", a: "Boligsiden og de store mæglerkæder som home, EDC, Nybolig og Danbolig samt Ejendomstorvet for erhvervs- og udlejningsejendomme. Mangler et tal, kan du skrive det selv." },
      { q: "Kan jeg bruge analysen i banken?", a: "Ja. Bankrapporten samler nøgletal, finansiering, driftsbudget og forudsætninger i en PDF, som banken kan læse på fem minutter." },
      { q: "Er NordInvest finansiel rådgivning?", a: "Nej. NordInvest er beslutningsstøtte. Tallene viser konsekvensen af forudsætningerne, og du kan rette dem alle." },
    ],
    related: [
      { href: "/analyse-af-ejendomsinvestering", label: "Guide: sådan regner du en udlejningsbolig igennem" },
      { href: "/beregn-afkast", label: "Beregn afkast på en bolig" },
      { href: "/beregn-husleje", label: "Beregn markedslejen" },
      { href: "/foraeldrekoeb", label: "Forældrekøb: regler, skat og beregning" },
    ],
  },
  {
    slug: "soegeagent",
    nav: "Søgeagenter",
    metaTitle: "Søgeagent til investeringsboliger med AI · NordInvest",
    metaDescription: "Få besked, når en investeringsbolig, der passer dine krav, kommer til salg. Søgeagenter med egne kriterier, tidspunkt, mail og AI-vurdering.",
    h1: "Søgeagenter, der holder øje med markedet for dig",
    lead: "Beskriv hvad du leder efter, vælg hvornår agenten skal kigge, og få en mail, når en ny bolig passer. Hvert fund kommer med tallene, signalerne og en kort vurdering.",
    screens: ["deal", "overview"],
    intro: [
      "De gode handler bliver sjældent liggende længe. En søgeagent gennemsøger hele markedet på dine tidspunkter, regner hver ny bolig igennem som investering og giver kun besked, når der er noget nyt, der passer. Ingen daglige tjek af boligportalerne, ingen mails om boliger, du allerede har set.",
      "Agenten søger i Deal-motorens data over hele det danske marked: helårsboliger fra Boligsiden og erhvervs- og udlejningsejendomme fra Ejendomstorvet. Hvert fund får en score, cash flow, afkast og pris pr. m² mod andre boliger i samme postnummer.",
    ],
    steps: [
      { title: "Beskriv hvad du søger", text: "Med dine egne ord, fx \"3-værelses i Aarhus til forældrekøb under 2,5 mio.\", eller med filtre for område, type, pris, areal, værelser, score, afkast og cash flow." },
      { title: "Vælg din strategi", text: "Udlejning, familiebolig, renovering og salg eller erhverv. Strategien bestemmer, hvordan fund rangeres og vurderes." },
      { title: "Vælg tidspunkt", text: "Hver dag, på hverdage eller en bestemt ugedag, på det klokkeslæt du vil, i dansk tid." },
      { title: "Gem det bedste", text: "Nye fund lander i NordInvest og i din mail. Ét tryk gemmer boligen i din pipeline med tallene." },
    ],
    points: [
      { title: "Kun det nye", text: "Agenten husker, hvad den har vist dig. Du får besked om boliger, der er kommet til siden sidst, og prisfald står tydeligt på hvert fund." },
      { title: "Signaler du kan handle på", text: "Prisfald, pris pr. m² under områdets niveau, lang tid til salg, byggeår og energimærke for boliger med renoveringspotentiale." },
      { title: "Match efter strategi", text: "En flip-agent leder efter billige kvadratmeter og ældre boliger. En udlejningsagent efter cash flow og afkast." },
      { title: "AI-vurdering", text: "De bedste nye fund får en kort vurdering: hvorfor boligen er værd at se på, med tal, og hvad du skal tjekke først." },
      { title: "Live optælling", text: "Mens du sætter kriterierne, kan du se, hvor mange boliger der matcher i dag, så kravene aldrig er et gæt." },
      { title: "Fra fund til sag", text: "Gem et fund, og det bliver en sag i din pipeline med fremvisning, papirer og bud samlet ét sted." },
    ],
    investors: [
      { who: "Udlejning", text: "Lejligheder i dine kommuner, hvor lejen betaler lånet, med besked hver morgen kl. 7." },
      { who: "Familiebolig", text: "Boliger med nok værelser til en studerende og en pris pr. m² under området." },
      { who: "Renovering og salg", text: "Ældre boliger med lavt energimærke og en kvadratmeterpris, der giver plads til en renovering." },
      { who: "Erhverv", text: "Udlejningsejendomme og erhverv med et startafkast over dit minimum, en gang om ugen." },
    ],
    faq: [
      { q: "Hvor ofte kører en søgeagent?", a: "Så ofte du vælger: hver dag, på hverdage eller en gang om ugen, på et klokkeslæt mellem 5 og 22. Du kan også køre den med det samme." },
      { q: "Får jeg mails om de samme boliger igen?", a: "Nej. Agenten husker, hvad den har fundet, og giver kun besked om nye boliger. Når du opretter en agent, ser du det, der matcher i dag, uden en mail." },
      { q: "Hvor mange agenter kan jeg have?", a: "Op til tolv, hver med sine egne kriterier, tidspunkt og mails." },
      { q: "Hvad er forskellen på en søgeagent og en almindelig boligagent?", a: "En boligagent giver besked om nye annoncer. NordInvests søgeagent regner også hver bolig igennem som investering, viser signaler som prisfald og pris pr. m² mod området og rangerer fundene efter din strategi." },
    ],
    related: [
      { href: "/deals", label: "De bedste investeringsboliger lige nu" },
      { href: "/udlejningsejendomme-til-salg", label: "Udlejningsejendomme til salg" },
      { href: "/funktioner/boliganalyse", label: "Boliganalysen bag hvert fund" },
    ],
  },
  {
    slug: "pipeline",
    nav: "Pipeline og kalender",
    metaTitle: "CRM til ejendomsinvestorer: pipeline, kalender og bud",
    metaDescription: "Følg hver bolig fra første kig til nøgleoverdragelse: pipeline, tjekliste for købsprocessen, fremvisninger i kalenderen og budhistorik med modbud.",
    h1: "Pipeline til ejendomsinvestorer: fra første kig til købt",
    lead: "Hver bolig du overvejer, bliver en sag. Fremvisninger, mægleren, papirerne, banken og dine bud samles ét sted, og kalenderen husker resten.",
    screens: ["pipeline", "calendar", "offer"],
    intro: [
      "Når du kigger på flere boliger på én gang, går det hurtigt i stå i noter, mails og regneark. NordInvest samler det i en pipeline, der følger den danske købsproces: screening, fremvisning, dokumenter, bank, bud og købt. Du ser på et øjeblik, hvor hver bolig står, og hvad næste skridt er.",
      "Pipelinen hænger sammen med analysen. Gemmer du en bolig fra en analyse, en søgeagent eller Deal-motoren, følger tallene med, og alt du gør på sagen bagefter, gemmes samme sted.",
    ],
    steps: [
      { title: "Gem boligen", text: "Fra analysen, en søgeagent eller Deal-motoren. Boligen lander i den fase, du vælger." },
      { title: "Planlæg fremvisningen", text: "Aftaler med tidspunkt, sted og noter. De ligger på sagen og i kalenderen, og du får en mail dagen før." },
      { title: "Følg tjeklisten", text: "Punkterne for hver fase af købet: fra energimærke og referater til købers rådgiver og forbehold i købsaftalen." },
      { title: "Byd med styr på det", text: "Registrér dit bud, sælgers modbud og svarfristen. Fristen kommer i kalenderen, og hele budhistorikken gemmes." },
    ],
    points: [
      { title: "Tavle eller liste", text: "Træk boliger mellem faserne, eller brug menuen på kortet. Hver fase viser antal og samlet værdi." },
      { title: "Kalender", text: "Måned, uge eller liste med fremvisninger, bankmøder, mæglerkald og svarfrister for alle boliger." },
      { title: "Påmindelse dagen før", text: "Hver morgen får du en mail med morgendagens aftaler, så intet glipper." },
      { title: "Budhistorik", text: "Hvert bud med dato, status, modbud og svarfrist, og dit maksimale bud regnet mod udbudsprisen." },
      { title: "Mægleren ved hånden", text: "Navn, firma, telefon og mail på sagen, så du kan ringe eller skrive med ét tryk." },
      { title: "Aktivitet", text: "Hvad der er sket på boligen og hvornår: faseskift, bud, aftaler og gennemgåede dokumenter." },
    ],
    investors: [
      { who: "Udlejning", text: "Flere boliger i spil på én gang, uden at miste overblikket over fremvisninger og bank." },
      { who: "Familiebolig", text: "Hold styr på fremvisninger og bud, mens barnet læser videre, og del datoerne med familien via kalenderfilen." },
      { who: "Renovering og salg", text: "Følg hvert projekt fra fremvisning med håndværker til købt, med noter om stand og budget." },
      { who: "Erhverv", text: "Lange processer med mange dokumenter og forhandlinger samlet på én sag." },
    ],
    faq: [
      { q: "Hvilke faser har pipelinen?", a: "Screening, fremvisning, dokumenter, bank, bud og købt. En bolig, du ikke går videre med, kan droppes og genåbnes senere." },
      { q: "Kan jeg få aftalerne i min egen kalender?", a: "Ja. Hver aftale kan hentes som kalenderfil til Google Kalender, Outlook eller Apple Kalender." },
      { q: "Hvad sker der, når jeg registrerer et bud?", a: "Buddet gemmes i budhistorikken, boligen flytter til fasen Bud, og en svarfrist lægges i kalenderen. Kommer sælger med et modbud, registrerer du det på samme bud." },
    ],
    related: [
      { href: "/saadan-byder-du-paa-en-bolig", label: "Guide: sådan byder du på en bolig" },
      { href: "/funktioner/dokumentgennemgang", label: "AI-gennemgang af salgsopstilling og referater" },
      { href: "/funktioner/soegeagent", label: "Søgeagenter, der finder boligerne" },
    ],
  },
  {
    slug: "dokumentgennemgang",
    nav: "AI-gennemgang af papirer",
    metaTitle: "AI læser salgsopstilling, tilstandsrapport og referater",
    metaDescription: "Upload salgsopstilling, tilstandsrapport eller ejerforeningsreferat. NordInvest finder risici, tal og spørgsmål til mægleren, med sidehenvisninger.",
    h1: "AI-gennemgang af salgsopstilling, tilstandsrapport og referater",
    lead: "Upload papirerne på en bolig. NordInvest læser dem, trækker de vigtige tal ud, markerer risici med sidetal og skriver de spørgsmål, du bør stille mægleren.",
    screens: ["docs"],
    intro: [
      "Salgsopstillingen, tilstandsrapporten, elinstallationsrapporten, vedtægterne og referaterne fra ejerforeningen er tilsammen ofte over hundrede sider. Det er her, de dyre overraskelser står: en kommende tagrenovering, en stigning i fællesudgifterne, et forbud mod udlejning eller en sag om fugt.",
      "NordInvest læser dokumenterne for dig. Hver gennemgang giver et kort resumé, de vigtigste tal, risici sorteret efter alvor med sidehenvisning og citat, et svar på om udlejning er tilladt, og en liste med spørgsmål til mægleren.",
    ],
    steps: [
      { title: "Upload en PDF", text: "Salgsopstilling, tilstandsrapport, elinstallationsrapport, energimærke, vedtægter eller referat fra ejerforeningen." },
      { title: "Læs gennemgangen", text: "Dokumenttype, resumé, nøgletal og risici med sidehenvisning, så du kan slå op og se det med egne øjne." },
      { title: "Tjek udlejning", text: "For lejligheder: om vedtægter og referater tillader udlejning, med betingelser og sidetal." },
      { title: "Stil de rigtige spørgsmål", text: "Spørgsmålene til mægleren står klar, og tjeklisten for fasen krydses af." },
    ],
    points: [
      { title: "Risici med sidetal", text: "Høj, middel og lav risiko, hver med en forklaring og en henvisning til siden i dokumentet." },
      { title: "Røde flag på sagen", text: "Alvorlige fund vises øverst på boligens sag, så de ikke drukner." },
      { title: "Udlejning tilladt?", text: "Et klart ja, nej eller betinget, med kilden i vedtægter eller referat." },
      { title: "Spørgsmål til mægleren", text: "Konkrete spørgsmål ud fra det, der står, og det der mangler." },
      { title: "Tjeklisten krydses af", text: "En gennemgået tilstandsrapport eller et referat markerer det tilsvarende punkt i købsprocessen." },
      { title: "Gemt på boligen", text: "Alle gennemgange ligger på sagen sammen med analyse, aftaler og bud." },
    ],
    investors: [
      { who: "Udlejning", text: "Find udlejningsforbud, kommende fællesudgifter og vedligeholdelsesplaner, før de koster afkast." },
      { who: "Familiebolig", text: "Vær sikker på, at foreningen tillader forældrekøb og udlejning til et barn." },
      { who: "Renovering og salg", text: "Brug tilstandsrapportens karakterer til at prissætte renoveringen realistisk." },
      { who: "Erhverv", text: "Få overblik over lejekontrakter, vedligeholdelsesforpligtelser og miljøforhold i et langt materiale." },
    ],
    faq: [
      { q: "Hvilke dokumenter kan NordInvest læse?", a: "PDF-filer som salgsopstilling, tilstandsrapport, elinstallationsrapport, energimærke, vedtægter, referater fra ejerforeningen og andre bilag fra mægleren." },
      { q: "Erstatter gennemgangen en købers rådgiver?", a: "Nej. Den giver dig overblik og de rigtige spørgsmål hurtigt. Købsaftalen bør altid gennemgås af en købers rådgiver eller advokat." },
      { q: "Kan jeg se, hvor en risiko står?", a: "Ja. Hver risiko har en sidehenvisning og et citat fra dokumentet, så du kan tjekke den selv." },
    ],
    related: [
      { href: "/salgsopstilling", label: "Guide: sådan læser du en salgsopstilling" },
      { href: "/funktioner/pipeline", label: "Pipeline med tjekliste for købsprocessen" },
      { href: "/udlejning-af-lejlighed", label: "Regler og skat ved udlejning af lejlighed" },
    ],
  },
];

export const featureBySlug = (slug: string) => FEATURES.find((f) => f.slug === slug);
