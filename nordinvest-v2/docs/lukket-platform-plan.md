# NordInvest som lukket platform: anbefaling og faseplan

Udkast 12. oktober 2026. Intet er ændret live endnu. Udkastene ligger lokalt på `/udkast/forside` og `/udkast/medlem`.

## 1. Positionering i én sætning

NordInvest er det samlede system, hvor danske private ejendomsinvestorer finder, regner, gennemgår og beslutter, med en rigtig person bag og adgang efter en samtale.

Vi lover kvalitet og personlig kontakt. Vi lover ikke et fællesskab, medlemstal eller udtalelser, før de findes.

## 2. Sidestruktur

**Offentligt (uændret synlighed i søgemaskiner)**

| Side | Hvad den gør nu |
|---|---|
| `/` Forside | Præsentationssiden: hvem, hvilke problemer, produktvisninger, gratis test, Anmod om adgang |
| `/spil` | Ejendomsspillet, gratis og åbent |
| `/blog`, `/ordbog`, guider | Uændret. De er vores trafik |
| `/investering-i-ejendom-*`, `/deals` og kommunesider | Ranglisterne bliver ved med at være offentlige (de giver trafik). Knapperne "Analysér" og "Søg selv" fører til Anmod om adgang |
| `/beregn-afkast`, `/beregn-husleje` | Forbliver åbne lommeregnere (søgeord), med vej videre til adgang |
| `/om`, `/kontakt`, juridiske sider | Uændret |
| `/adgang` | Anmodningsformularen som sin egen side (samme formular som på forsiden), så den kan linkes fra blog og mails |
| `/priser` | Priserne forsvinder fra siden. Den forklarer i stedet, at prisen aftales efter samtalen, og peger på Anmod om adgang. Adressen bliver, så eksisterende links ikke dør |

**Kun for godkendte medlemmer**

`/analyseren` (alle trin), `/deals`-søgningen (Deal-motoren som værktøj), `/mappe/*`, `/dashboard`, `/konto`, `/rapport/*` og alle API-ruter bag dem.

## 3. Adgangsforløbet

1. **Anmodning:** personen udfylder formularen (navn, e-mail, telefon, antal ejendomme, hvad de leder efter, eventuelt et boliglink og en besked). Den gemmes, og du får straks en mail.
2. **Samtale:** du ringer inden for en arbejdsdag. Er der et boliglink, har du det klar på forhånd. Det er demoen: vi regner deres egen bolig igennem på 20 minutter.
3. **Aftale:** I aftaler pris. Du skriver prisen og en note på personen i adminsiden.
4. **Invitation:** du trykker "Godkend og invitér". Personen får en personlig mail med et link. Boligen fra samtalen ligger allerede i deres arbejdsområde.
5. **Første login:** de sætter deres adgangskode og lander i Overblik.

**Din administration:** en side under `/dashboard/adgang`, som kun du kan se. Den har tre faner:
- **Nye anmodninger.** Du kan markere en som "Kontaktet" eller "Ikke et match".
- **Medlemmer.** Her står pris, note og seneste login, og du kan fjerne adgang med ét tryk.
- **Fjernet adgang.**

**Regler, der gælder i selve systemet:**
- Hver konto har en adgangsstatus: anmodet, godkendt eller fjernet.
- Kun "godkendt" åbner systemet.
- Det tjekkes på serveren på hver beskyttet side og i hvert API-kald. Et direkte link til fx `/mappe/123` eller `/api/analyze` virker derfor ikke uden godkendelse.
- Hverken en ny konto eller en indsendt formular åbner noget. Man ser blot siden "Tak, vi er i gang med din anmodning".
- Selvoprettelse af konto lukkes. Konti oprettes kun via din invitation.

## 4. Medlemsområdet

Én fast ramme: sidemenu på computer og en bundbjælke på mobil. Menuen har fem punkter:

1. **Overblik:** dagens næste skridt, nye muligheder fra Deal-motoren, der matcher personens profil, og status på pipelinen.
2. **Ejendomme:** pipelinen (tavle og liste), som allerede er bygget.
3. **Find boliger:** Deal-motoren. "Gem" lægger boligen direkte i pipelinen med tallene.
4. **Analysér:** indsæt link eller adresse. Resultatet gemmes på boligen, ikke som en løs analyse.
5. **Opgaver:** alle opgaver på tværs af boligerne.

**Boligen er sagen.** Når man åbner en bolig, har den seks faner, så intet skal tastes to gange:
- Overblik
- Analyse
- Papirer
- Opgaver og noter
- Kontakt (mægler: navn, telefon, e-mail)
- Bud

**Første version indeholder:**
- Pipeline med faser.
- Opgaver med dato.
- Fri noter.
- Én mæglerkontakt pr. bolig.
- Buddet.
- AI-gennemgang af papirer.
- En mail dagen før en opgave.

**Ikke med i første version:**
- En samlet kontaktbog.
- Deling med partnere.
- Kalendersynkronisering.
- Fællesskabsfunktioner.

Grunden er, at de ikke flytter en købsbeslutning endnu.

## 5. Faseplan

Hver fase lukkes først, når kriterierne er opfyldt og vist for dig.

**Fase 1: Ny offentlig side og anmodninger (åbner ikke for lukning endnu)**
- Ny forside, `/adgang` og en ny tekst på `/priser`.
- Formularen gemmer anmodningen og sender dig en mail.
- Adminsiden viser anmodningerne.
- Værktøjerne er stadig åbne, så intet går i stykker.

*Færdig når:*
- En testanmodning lander i adminsiden og din indbakke.
- Forsiden er gennemtestet ved 360, 390, 768, 1024 og 1440 px uden fejl.
- Alle eksisterende offentlige adresser svarer 200.
- Sitemap og titler er uændrede for SEO-siderne.

**Fase 2: Adgangsstyring**
- Adgangsstatus på konti.
- Serverkontrol på sider og API.
- Invitationsflow og "Afventer"-side.
- Selvoprettelse lukkes.
- Eksisterende konti håndteres efter din beslutning (se nedenfor).

*Færdig når:* en testmatrix er kørt og bestået. Den består af fire brugertyper (ikke logget ind, logget ind men ikke godkendt, godkendt, fjernet), og hver af dem prøves mod direkte links til alle beskyttede sider og API'er.

**Fase 3: Arbejdsområdet**
- Rammen med sidemenu og bundbjælke, Overblik og boligen som sag med faner.
- "Gem" fra Deal-motoren og analysen lander på boligen.

*Færdig når:* hele forløbet er gennemført uden at taste noget to gange, på mobil og computer. Forløbet er: fundet bolig, gem, analysér, upload papir, opgave, bud.

**Fase 4: Opfølgning**
- Påmindelsesmails.
- Mæglerkontakt.
- Demoboligen lægges automatisk ind ved invitation.
- En lille personlig velkomst fra dig ved første login.

*Færdig når:* en ny inviteret bruger lander med sin bolig klar, og en opgave med dato giver en mail dagen før.

## 6. Beslutninger, der kræver dig

1. **Eksisterende konti:** skal alle nuværende brugere godkendes automatisk (anbefalet: de har allerede valgt os, og det koster intet), eller skal de igennem en samtale?
2. **Betalende abonnenter:** beholder de deres nuværende abonnement og pris (anbefalet), indtil I aftaler andet?
3. **Betaling fremover:** du opretter et Stripe-betalingslink pr. aftale (anbefalet, intet nyt at bygge), eller fakturerer du manuelt?
