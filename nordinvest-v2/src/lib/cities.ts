export type CityFaq = { q: string; a: string };
export type CitySection = { h2: string; body: string[] };

export type City = {
  slug: string;            // URL segment after /investering-i-ejendom-
  name: string;            // "København"
  inName: string;          // "i København" / "på Fyn"
  title: string;           // <title>
  description: string;     // meta description
  h1: string;
  intro: string;
  yield: string;           // headline yield range
  yieldLabel: string;      // short profile label
  dataSource: string;      // DST / SCB / SSB
  sections: CitySection[];
  faq: CityFaq[];
};

export const CITIES: City[] = [
  {
    slug: "koebenhavn",
    name: "København",
    inName: "i København",
    title: "Investering i ejendom i København",
    description:
      "Analysér enhver investeringsejendom i København på 60 sekunder. Lejeafkast, cash flow, kontantafkast, BRRRR og 5-årig værdistigning — gratis.",
    h1: "Investering i ejendom i København — analyseret på 60 sekunder.",
    intro:
      "Indsæt et boligopslag fra Boligsiden, EDC, Home eller Nybolig — eller indtast tallene selv. NordInvest beregner lejeafkast, månedligt cash flow, kontantafkast, BRRRR og 5-årig værdistigning på sekunder.",
    yield: "3,0–5,5 %",
    yieldLabel: "Værdistigningsmarked — lavt afkast, høj kapitalvækst",
    dataSource: "Danmarks Statistik (DST)",
    sections: [
      {
        h2: "København er et værdistigningsmarked — ikke et cashflow-marked",
        body: [
          "København leverer konsekvent blandt EU's stærkeste ejendomsværdistigninger — men matematikken straffer rene cashflow-investorer. Ved nutidens priser (typisk 50.000–80.000 kr/m² i centrale postnumre) bryder bruttoafkastet sjældent 5 %. Efter ydelse og udgifter er den typiske 20 %-udbetalingshandel tæt på nul eller negativ på cash flow.",
          "Det betyder ikke, at det er en dårlig investering. Det betyder, at investeringsmodellen er afgørende. København belønner værdistigning og value-add — ikke rent cash flow. Det er regnestykket, ikke holdningen, der afgør det.",
        ],
      },
      {
        h2: "Afkastniveauer efter postnummer",
        body: [
          "Bruttolejeafkast i centrale postnumre (1xxx, 2100, 2200) ligger typisk mellem 3,0 % og 4,5 %. Yderkvarterer som Nordvest (2400), Sydhavn (2450) og Amager Vest (2300) kan nå 4,5–5,5 %.",
          "Et bruttoafkast over 5 % i København signalerer normalt enten et mindre attraktivt kvarter, et renoveringsobjekt (value-add / BRRRR) eller en fejl i tallene, som analysen hjælper dig med at fange.",
        ],
      },
    ],
    faq: [
      {
        q: "Er ejendom i København en god investering?",
        a: "København er et af Europas stærkeste værdistigningsmarkeder med historisk 4–6 % CAGR. Det er et svagt rent-cashflow-marked, men stærkt til værdistigning og value-add. Cash flow er typisk negativt eller tæt på nul med 20 % udbetaling.",
      },
      {
        q: "Hvilket afkast kan jeg forvente i København?",
        a: "Bruttolejeafkast ligger typisk på 3,0–4,5 % centralt og op til 5,5 % i yderkvartererne. Nettoafkastet er lavere, når faste udgifter og tomgang er trukket fra — det er det tal, analysen viser dig.",
      },
    ],
  },
  {
    slug: "aarhus",
    name: "Aarhus",
    inName: "i Aarhus",
    title: "Investering i ejendom i Aarhus",
    description:
      "Analysér enhver investeringsejendom i Aarhus på 60 sekunder. Lejeafkast, cash flow, kontantafkast, BRRRR og 5-årig værdistigning — gratis.",
    h1: "Investering i ejendom i Aarhus — Danmarks bedst balancerede marked.",
    intro:
      "Aarhus er Danmarks bedst balancerede investeringsmarked: højere afkast end København, stærk værdistigning og en universitetsdrevet lejeefterspørgsel, der ikke forsvinder. Indsæt et opslag fra Boligsiden eller EDC og få hele billedet.",
    yield: "4,0–7,0 %",
    yieldLabel: "Mellemvej — bedre afkast end København, stadig stærk vækst",
    dataSource: "Danmarks Statistik (DST)",
    sections: [
      {
        h2: "Hvorfor Aarhus er første stop, når København bliver for dyrt",
        body: [
          "For mange danske investorer er Aarhus svaret på et simpelt spørgsmål: hvor får jeg et bedre afkast end København uden at give afkald på langtidsværdistigning? Kombinationen af universitetsdrevet befolkningsvækst, kommunal byudvikling (havnefronten, Aarhus Ø) og strukturelt lavere kvadratmeterpriser gør Aarhus til en mellemvej.",
          "Aarhus er Danmarks næststørste vækstmarked. Det er ofte det første marked, danske investorer skifter til, når København bliver for dyrt.",
        ],
      },
      {
        h2: "Afkast og lejeefterspørgsel",
        body: [
          "Centrale postnumre (8000, 8200) ligger typisk på 4,0–5,5 %, mens forstadspostnumre (8210 Aarhus V, 8260 Viby, 8270 Højbjerg) kan nå 5,5–7,0 %. Studieboligsegmentet kan give højere brutto, men kortere lejeperioder.",
          "Aarhus Universitet og VIA University College giver konstant studenterefterspørgsel. Internationale studerende er et hurtigt voksende segment med højere betalingsvilje for møblerede lejligheder tæt på universitetet.",
        ],
      },
    ],
    faq: [
      {
        q: "Er Aarhus bedre end København til investering?",
        a: "Til cash flow: typisk ja. Aarhus tilbyder højere bruttoafkast (4–7 %) end København, men lidt lavere langtidsværdistigning. Det stærke universitetsmiljø giver vedvarende lejeefterspørgsel.",
      },
      {
        q: "Hvad er afkastet på en lejlighed i Aarhus?",
        a: "Bruttolejeafkast ligger typisk på 4,0–5,5 % centralt og 5,5–7,0 % i forstæderne. Indsæt et konkret opslag for at se netto-cash flow efter lån og udgifter.",
      },
    ],
  },
  {
    slug: "fyn",
    name: "Fyn",
    inName: "på Fyn",
    title: "Investering i ejendom på Fyn",
    description:
      "Analysér investeringsejendomme på Fyn på 60 sekunder. Odense, Svendborg, Nyborg og Middelfart. Lejeafkast, cash flow, kontantafkast og værdistigning — gratis.",
    h1: "Investering i ejendom på Fyn — Danmarks bedste cashflow-marked.",
    intro:
      "Fyn er Danmarks bedste cashflow-marked: højere bruttoafkast end København og Aarhus, lavere kvadratmeterpriser og stabil lejeefterspørgsel fra SDU og Odense Universitetshospital. Indsæt et opslag og se de rigtige tal.",
    yield: "4,5–8,0 %",
    yieldLabel: "Cashflow-marked — højt afkast, beskeden værdistigning",
    dataSource: "Danmarks Statistik (DST)",
    sections: [
      {
        h2: "Fyn fungerer omvendt af København og Aarhus",
        body: [
          "Hvor København og Aarhus er værdistigningsmarkeder, hvor man accepterer lavt månedligt cash flow for langtidsvækst, er Fyn det modsatte: stærkt månedligt cash flow, men beskeden langtidsappreciation. Det gør Fyn perfekt for investorer, der prioriterer positiv likviditet fra dag ét.",
          "Odense centrum ligger på 4,5–6,0 %, forstæder på 5,5–7,0 %, og mindre fynske byer (Svendborg, Nyborg, Middelfart) kan nå 6,0–8,0 %.",
        ],
      },
      {
        h2: "Likviditet og exit-risiko",
        body: [
          "Odense er det største marked og det nemmeste at komme ud af. Svendborg, Nyborg og Middelfart giver højere brutto (6–8 %), men med færre købere ved exit.",
          "Faaborg, Bogense og Assens kan tilbyde meget høje brutto (7–9 %), men er små markeder med betydelig likviditetsrisiko. Analysen hjælper dig med at veje afkast mod exit-sikkerhed.",
        ],
      },
    ],
    faq: [
      {
        q: "Hvorfor er afkastet højere på Fyn?",
        a: "Fyn har strukturelt lavere kvadratmeterpriser end Sjælland og Jylland, men stabil lejeefterspørgsel. Det giver Danmarks bedste rent-cashflow-marked — mod til gengæld lavere værdistigning (historisk 1,5–3 % CAGR).",
      },
      {
        q: "Hvor på Fyn skal jeg investere?",
        a: "Odense giver bedst likviditet og nemmest exit. Svendborg, Nyborg og Middelfart giver højere afkast men færre købere. Vælg efter, om du prioriterer cash flow eller salgbarhed.",
      },
    ],
  },
  {
    slug: "stockholm",
    name: "Stockholm",
    inName: "i Stockholm",
    title: "Investering i ejendom i Stockholm",
    description:
      "Analysér enhver bolig i Stockholm på 60 sekunder. Lejeafkast, cash flow, kontantafkast, BRRRR og 5-årig værdistigning med markedsdata fra SCB — gratis.",
    h1: "Investering i ejendom i Stockholm — med huslejeregulering indregnet.",
    intro:
      "Indsæt et link til en bostadsrätt eller lejlighed i Stockholm. NordInvest beregner lejeafkast, månedlig cash flow, kontantafkast, BRRRR og en 5-årig prisstigningsprognose — med markedsdata fra Statistiska centralbyrån (SCB).",
    yield: "2,5–5,0 %",
    yieldLabel: "Lavt afkast — huslejeregulering, stærk værdistigning",
    dataSource: "Statistiska centralbyrån (SCB)",
    sections: [
      {
        h2: "Huslejereguleringen former hver eneste beregning",
        body: [
          "Stockholms afgørende træk for investorer er huslejereguleringen på førstehåndskontrakter (förstahandskontrakt). At sætte markedsleje på en bostadsrätt, du fremlejer, er begrænset — og begrænsningerne er reelle.",
          "Bruttolejeafkast på fremlejet bostadsrätt ligger typisk mellem 2,5 % og 4,0 % i det centrale Stockholm. Uden for tullarna (Bromma, Hägersten, de sydlige forstæder) når afkastet 4–5 %. Afkast over 5 % er sjældent.",
        ],
      },
      {
        h2: "Avgift og realistiske strategier",
        body: [
          "Den månedlige avgift ligger typisk mellem 35 og 75 SEK pr. m²/md. For en lejlighed på 60 m² svarer det til 2.100–4.500 SEK/md. før alle andre omkostninger. NordInvest regner den med som en del af de månedlige udgifter.",
          "De mest realistiske strategier er langsigtet buy-and-hold med værdistigning, ejerbolig med senere fremlejemulighed, eller nybyggeri (nyproduktion).",
        ],
      },
    ],
    faq: [
      {
        q: "Kan man tjene på udlejning i Stockholm?",
        a: "Stockholm er et af Europas markeder med lavest afkast pga. streng huslejeregulering. Det er stærkt til langsigtet værdistigning (historisk 3–5 % om året), men ren cashflow-investering er strukturelt svær.",
      },
      {
        q: "Hvor kommer markedsdataene fra?",
        a: "Alle svenske markedsdata kommer fra SCB. Hvis SCB ikke offentliggør et tal for et område, viser NordInvest “Ikke tilgængelig” frem for et gæt.",
      },
    ],
  },
  {
    slug: "oslo",
    name: "Oslo",
    inName: "i Oslo",
    title: "Investering i ejendom i Oslo",
    description:
      "Analysér enhver bolig i Oslo på 60 sekunder. Lejeafkast, cash flow, kontantafkast, BRRRR og 5-årig værdistigning med markedsdata fra SSB — gratis.",
    h1: "Investering i ejendom i Oslo — frie startlejer, NIBOR-bevidst.",
    intro:
      "Indsæt et link til en leilighet i Oslo. NordInvest beregner lejeafkast, månedlig cash flow, kontantafkast, BRRRR og en 5-årig prisstigningsprognose — med markedsdata fra Statistisk sentralbyrå (SSB) og en NIBOR-bevidst rentestresstest.",
    yield: "3,5–6,5 %",
    yieldLabel: "Balanceret — frie startlejer, rentefølsomt",
    dataSource: "Statistisk sentralbyrå (SSB)",
    sections: [
      {
        h2: "Frie startlejer gør cashflow realistisk",
        body: [
          "Oslo adskiller sig fra Stockholm og København på ét afgørende punkt: startlejen ved nye lejemål kan sættes til markedsniveau. Der er ingen streng huslejeregulering på nye udlejninger. Netop dét gør rene cashflow-strategier realistiske i Oslo på en måde, de sjældent er andre steder i Norden.",
          "Bruttolejeafkast ligger typisk på 3,5–5,0 % i de centrale bydele (Frogner, Majorstuen, Grünerløkka) og 5,0–6,5 % i yderbydele.",
        ],
      },
      {
        h2: "Bagsiden er rentefølsomhed",
        body: [
          "Norske boliglån er overvejende variabelt forrentede og bundet til NIBOR. Når Norges Bank flytter renten, flytter din månedlige cash flow med — nogle gange inden for samme år.",
          "En rentestigning på 1 % kan udslette 4.000–8.000 NOK/md. i cash flow på en lejlighed med 25 % udbetaling. NordInvests stresstest genberegner din cash flow ved +1 %, +2 % og +3 %, så du ser bagsiden, før du køber.",
        ],
      },
    ],
    faq: [
      {
        q: "Er Oslo bedre end Stockholm til udlejning?",
        a: "Til cash flow ofte ja: Oslo har ikke streng huslejeregulering på nye udlejninger, så startlejen kan sættes til markedsniveau. Til gengæld er Oslo mere rentefølsomt pga. variabelt forrentede lån bundet til NIBOR.",
      },
      {
        q: "Hvor følsomt er Oslo over for renten?",
        a: "Meget. De fleste norske boliglån er variabelt forrentede. En rentestigning på 1 % kan koste 4.000–8.000 NOK/md. i cash flow. Brug stresstesten, før du regner casen hjem.",
      },
    ],
  },
];

export function getCity(slug: string): City | undefined {
  return CITIES.find((c) => c.slug === slug);
}
