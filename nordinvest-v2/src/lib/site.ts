export const site = {
  name: "NordInvest",
  url: "https://nordinvest.io",
  linkedin: "https://www.linkedin.com/company/nordinvest-io",
  email: "contact@nordinvest.io",
  phone: "+45 20 99 37 97",
  phoneHref: "tel:+4520993797",
  // Lovpligtige virksomhedsoplysninger (e-handelsloven § 7 kræver navn, CVR,
  // adresse, e-mail). Udfyld cvr + address, så vises de automatisk i footeren
  // og på de juridiske sider. Lad dem stå tomme, hvis de endnu ikke findes —
  // så vises ingen forkerte oplysninger.
  business: {
    legalName: "NordInvest v/ Nikolaj Blond",
    entityType: "Enkeltmandsvirksomhed",
    cvr: "44701898",
    address: "Aage Knudsens Strøg 3C, 1. th",
    country: "Danmark",
  },
  founder: {
    name: "Nikolaj Blond",
    role: "Start-up founder",
    // Drop a photo at nordinvest-v2/public/founder.jpg to replace the placeholder.
    photo: "/founder.jpg",
  },
} as const;
