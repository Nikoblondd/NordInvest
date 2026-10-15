/*
 * Search titles and descriptions for blog posts, where the article's own
 * headline or summary is too long for a search result (Google shows ~60
 * characters of a title and ~155 of a description). The headline on the page
 * stays as written; only <title> and the meta description use these.
 */

export const BLOG_SEO: Record<string, { title?: string; description?: string }> = {
  "godt-afkast-udlejningsejendom": {
    title: "Godt afkast på en udlejningsejendom? Tal for 2026",
    description: "Et godt nettoafkast på en udlejningsejendom ligger på 5-7,5 %. Medianen er 6,1 % for 1.213 ejendomme til salg. Se tal efter type, pris og kommune.",
  },
  "erhvervsejendom-som-investering": {
    title: "Erhvervsejendom som investering: afkast og risici 2026",
    description: "Butik, kontor eller lager? Medianafkastet for erhvervsejendomme til salg er 7,1-7,8 %. Se typerne, lejekontraktens betydning og et regneeksempel.",
  },
  "driftsbudget-udlejningsbolig": {
    title: "Driftsbudget for udlejningsbolig: tomgang og vedligehold",
    description: "Sådan laver du et realistisk driftsbudget for en udlejningsbolig: tomgang, vedligehold, fællesudgifter og ejendomsskat, med et regneeksempel.",
  },
  "foraeldrekoeb-2026": { title: "Forældrekøb 2026: regler, skat og det ærlige regnestykke" },
  "airbnb-regler-2026": {
    title: "Airbnb-regler 2026: 70 dage, bundfradrag og skat",
    description:
      "Hvad må du i 2026, når du lejer ud på Airbnb? 70-dagesreglen, bundfradraget på 35.100 kr., skatten på resten og hvad ejerforeningen kan sige nej til.",
  },
  "sommerhus-som-investering-2026": { title: "Sommerhus som investering 2026: afkast, udlejning og skat" },
  ejendomsinvestering: {
    title: "Ejendomsinvestering i Danmark 2026: den komplette guide",
    description:
      "Alt om ejendomsinvestering i Danmark 2026: afkast, finansiering, skat, strategier og de bedste byer. Med regneeksempler og gratis analyseværktøj.",
  },
  "boligpriser-2026-prognose-investor": {
    title: "Boligpriser 2026: bankerne venter +6 %. Sådan handler du",
    description:
      "Danske Bank, Nordea og Nykredit venter 5 til 6,5 % stigning i boligpriserne i 2026. Hvor kommer den fra, og hvor skal du købe som investor?",
  },
  "passiv-indkomst-ejendomsinvestering": {
    title: "Passiv indkomst med ejendomsinvestering: 2026-guide",
    description:
      "Hvor meget passiv indkomst kan udlejningsboliger give i Danmark i 2026? Konkrete tal, arbejdstimer pr. måned og hvornår det bliver rigtigt passivt.",
  },
  "ejendomsinvestering-for-begyndere-2026": {
    title: "Ejendomsinvestering for begyndere 2026: din første bolig",
    description:
      "Begynderguide til ejendomsinvestering i 2026: udbetaling, finansiering, afkast, skat, valg af område og de fejl, der koster førstegangsinvestorer dyrt.",
  },
  "udbetaling-investeringsejendom": {
    title: "Udbetaling på investeringsejendom: hvor meget i 2026?",
    description:
      "Hvor meget skal du have i udbetaling til en investeringsejendom i 2026? Realkredit, banklån, belåningsgrænser og hvor mange kontanter du reelt skal bruge.",
  },
  "ejendomsskat-investeringsejendom-2026": { title: "Ejendomsskat på investeringsejendom 2026 og 9 fradrag" },
  "cash-flow-ejendom-danmark-2026": {
    title: "Cash flow på ejendom 2026: sådan finder du positive handler",
    description:
      "Sådan finder du boliger med positivt cash flow i Danmark i 2026: postnumre der leverer, tallene du skal se efter og en metode til at screene handler.",
  },
  "ejerlejlighed-vs-andelsbolig-investering": {
    title: "Ejerlejlighed eller andelsbolig som investering i 2026?",
    description:
      "Ejerlejlighed eller andelsbolig set fra en investor: udlejningsregler, finansiering, afkast, likviditet og skat, sammenlignet med konkrete tal.",
  },
  "koeb-af-investeringsejendom": { title: "Køb af investeringsejendom: sådan køber du din første" },
  "danske-boligpriser-2026-investering": {
    title: "Danske boligpriser 2026: er det stadig værd at investere?",
    description:
      "Boligpriserne stiger stadig i 2026. Er der stadig handler, der giver mening? En ærlig gennemgang med DST-data, postnummer-benchmarks og hvem det virker for.",
  },
  "er-denne-lejebolig-en-god-handel": {
    title: "Er lejeboligen en god handel? Tjek det på 60 sekunder",
    description:
      "Fem hurtige tjek, der viser om en investeringsbolig er en god handel: afkast, cash flow, break-even-leje og det lokale benchmark. Med gennemgået eksempel.",
  },
  "sadan-beregner-du-lejeafkast": {
    title: "Sådan beregner du lejeafkast (med eksempler)",
    description:
      "Beregn brutto- og nettolejeafkast på en bolig i Danmark, Norge og Sverige: en klar formel, gennemgåede eksempler og de afkastniveauer, der betyder noget.",
  },
  "er-det-vaerd-at-koebe-ejendom-i-koebenhavn": {
    title: "Er det værd at købe investeringsejendom i København?",
    description:
      "Giver det mening at købe en investeringsbolig i København? Afkastet, argumentet for værdistigning, risici og hvordan du kender en god handel fra en dyr fejl.",
  },
  "ejendomsinvestering-i-danmark-for-udlaendinge": {
    title: "Køb af ejendom i Danmark som udlænding: praktisk guide",
    description:
      "Det skal internationale investorer vide, før de køber ejendom i Danmark: opholdsregler, finansiering, afkast, skat og en realistisk strategi.",
  },
  "sadan-analyserer-du-en-nordisk-ejendomsinvestering": { title: "Sådan analyserer du en ejendomsinvestering trin for trin" },
  "bedste-boliginvesteringer-oktober-2026": {
    title: "3 bedste boliginvesteringer i Danmark, oktober 2026",
    description:
      "Deal-motoren har regnet over 16.500 boliger til salg igennem som udlejning. Se oktobers tre bedste med cashflow, nettoafkast og nul-punkts-leje.",
  },
  "bedste-erhvervsinvesteringer-oktober-2026": {
    title: "3 bedste erhvervsinvesteringer i Danmark, oktober 2026",
    description:
      "Oktobers tre stærkeste erhvervsejendomme til salg, rangeret på afkast og risiko. Se pris, afkast og cashflow ved 30 % udbetaling.",
  },
  "bedste-boliginvesteringer-september-2026": {
    title: "3 bedste boliginvesteringer i Danmark, september 2026",
    description:
      "Deal-motoren har scannet hele det danske boligmarked og fundet månedens tre bedste udlejningsboliger på pris, afkast og cashflow. Se hvorfor de scorer højest.",
  },
  "bedste-erhvervsinvesteringer-september-2026": {
    title: "3 bedste erhvervsinvesteringer i Danmark, september 2026",
    description:
      "Deal-motoren har rangeret hele det danske erhvervsmarked og fundet månedens tre stærkeste ejendomsinvesteringer på afkast og risiko. Se tallene bag.",
  },
  "40-aarige-realkreditlaan-ejendomsinvestering": {
    title: "40-årige realkreditlån: hvad betyder de for investorer?",
    description:
      "Regeringen har fremlagt et udspil om 40-årige realkreditlån. Se hvad den længere løbetid gør ved ydelse, cashflow og afkast, og hvornår det er en fordel.",
  },
  "institutionelle-investorer-traekker-sig-2026": {
    title: "Institutionelle investorer trækker sig: en chance i 2026",
    description:
      "Pinsepakkens skat og lave afkast har fået professionelle investorer til at trække sig fra danske udlejningsejendomme. Derfor kan det være en åbning for private.",
  },
  "koebenhavnske-ejerlejligheder-stiger-hurtigere-2026": {
    title: "Derfor stiger ejerlejligheder i København hurtigere i 2026",
    description:
      "Nationalbanken venter, at priserne på københavnske ejerlejligheder fortsat stiger mere end i resten af landet. Se hvorfor, og hvad det betyder for udlejning.",
  },
  "rentestigning-2026-ejendomsinvestering": {
    title: "Renten stiger i efteråret 2026: det rammer din investering",
    description:
      "ECB ventes at hæve renten, og F5 ligger omkring 3,3 %. Se hvad stigende boligrenter betyder for cashflow og afkast, og hvordan du stress-tester en handel.",
  },
  "ai-til-ejendomsinvestering": {
    title: "AI til ejendomsinvestering: sådan ændrer AI boliganalyse",
    description:
      "AI finder handler, vurderer stand og pris og forklarer tallene på sekunder. Se hvad kunstig intelligens kan og ikke kan i ejendomsinvestering i 2026.",
  },
  "analysevaerktoej-til-ejendomsinvestering": {
    title: "Analyseværktøj til ejendomsinvestering: gratis og hurtigt",
    description:
      "Et analyseværktøj regner cashflow, afkast, kontantafkast og gældsdækning ud på sekunder. Se hvilke nøgletal der afgør en handel, og analysér en bolig gratis.",
  },
  "beregn-afkast-paa-udlejningsejendom": {
    title: "Beregn afkast på udlejningsejendom: sådan gør du",
    description:
      "Sådan beregner du afkast på en udlejningsejendom: forskellen på bruttoafkast, nettoafkast, kontantafkast og IRR, forklaret med formler.",
  },
};
