import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

// Curated zip pools per region. Boligsiden's /search/cases requires a
// zipCode filter, so for "whole country" we sample from a diverse pool
// covering the biggest housing markets in each Danish region.
const ZIP_POOLS: Record<string, string[]> = {
  "hele-dk": [
    // Storkøbenhavn
    "1050", "1600", "2100", "2200", "2300", "2400", "2500", "2600", "2700",
    "2800", "2820", "2860", "2900", "2920", "2960",
    // Sjælland øvrige
    "3000", "3400", "3450", "3480", "3500", "3520", "3700",
    "4000", "4200", "4300", "4400", "4600", "4700", "4800", "4900",
    // Fyn
    "5000", "5200", "5220", "5260", "5500", "5600", "5700", "5800",
    // Jylland
    "6000", "6100", "6400", "6500", "6700", "6800", "6900",
    "7000", "7100", "7400", "7500", "7700", "7800",
    "8000", "8200", "8210", "8220", "8230", "8240", "8260", "8270",
    "8600", "8700", "8800", "8900",
    "9000", "9200", "9210", "9220", "9400", "9700", "9900",
  ],
  sjaelland: [
    "1050", "1600", "2100", "2200", "2300", "2400", "2500", "2600",
    "2700", "2720", "2730", "2740", "2750", "2760", "2770", "2800", "2820",
    "2830", "2840", "2850", "2860", "2870", "2880", "2900", "2920", "2930",
    "2950", "2960", "2970", "2980", "2990",
    "3000", "3050", "3060", "3070", "3100", "3140", "3150", "3200", "3230",
    "3300", "3400", "3450", "3460", "3480", "3500", "3520", "3540", "3550",
    "3600", "3630", "3660", "3670", "3700", "3720", "3730", "3740", "3751",
    "3760", "3770", "3782", "3790",
    "4000", "4030", "4040", "4050", "4060", "4070", "4100", "4130", "4140",
    "4160", "4171", "4174", "4180", "4190", "4200", "4220", "4230", "4241",
    "4243", "4250", "4261", "4270", "4281", "4291", "4293", "4295", "4296",
    "4300", "4320", "4330", "4340", "4350", "4360", "4370", "4390", "4400",
    "4420", "4440", "4450", "4460", "4470", "4480", "4490", "4500", "4520",
    "4534", "4540", "4550", "4560", "4571", "4572", "4573", "4581", "4583",
    "4591", "4592", "4593", "4600", "4622", "4623", "4632", "4640", "4652",
    "4653", "4654", "4660", "4671", "4672", "4681", "4682", "4683", "4684",
    "4690", "4700", "4720", "4733", "4735", "4736", "4750", "4760", "4771",
    "4772", "4773", "4780", "4791", "4792", "4793", "4795", "4800", "4840",
    "4850", "4862", "4863", "4871", "4872", "4873", "4874", "4880", "4891",
    "4892", "4894", "4895", "4900", "4912", "4913", "4920", "4930", "4941",
    "4943", "4944", "4951", "4952", "4953", "4960", "4970", "4983", "4990",
  ],
  fyn: [
    "5000", "5200", "5210", "5220", "5230", "5240", "5250", "5260", "5270",
    "5290", "5300", "5320", "5330", "5350", "5370", "5380", "5390", "5400",
    "5450", "5462", "5463", "5464", "5466", "5471", "5474", "5485", "5491",
    "5492", "5500", "5540", "5550", "5560", "5580", "5591", "5592", "5600",
    "5610", "5620", "5631", "5642", "5672", "5683", "5690", "5700", "5750",
    "5762", "5771", "5772", "5792", "5800", "5853", "5854", "5856", "5863",
    "5871", "5874", "5881", "5882", "5883", "5884", "5892", "5900", "5932",
    "5935", "5953", "5960", "5970", "5985",
  ],
  jylland: [
    "6000", "6040", "6051", "6052", "6064", "6070", "6091", "6092", "6093",
    "6094", "6100", "6200", "6210", "6230", "6240", "6280", "6300", "6310",
    "6320", "6330", "6340", "6360", "6372", "6392", "6400", "6430", "6440",
    "6470", "6500", "6510", "6520", "6534", "6535", "6541", "6560", "6580",
    "6600", "6621", "6622", "6623", "6630", "6640", "6650", "6660", "6670",
    "6682", "6683", "6690", "6700", "6705", "6710", "6715", "6720", "6731",
    "6740", "6752", "6753", "6760", "6771", "6780", "6792", "6800", "6818",
    "6823", "6830", "6840", "6851", "6852", "6853", "6855", "6857", "6862",
    "6870", "6880", "6893", "6900", "6920", "6933", "6940", "6950", "6960",
    "6971", "6973", "6980", "6990",
    "7000", "7100", "7120", "7130", "7140", "7150", "7160", "7171", "7173",
    "7182", "7183", "7184", "7190", "7200", "7250", "7260", "7270", "7280",
    "7300", "7321", "7323", "7330", "7361", "7362", "7400", "7430", "7441",
    "7442", "7451", "7470", "7480", "7490", "7500", "7540", "7550", "7560",
    "7570", "7620", "7650", "7660", "7673", "7680", "7700", "7730", "7741",
    "7742", "7752", "7755", "7760", "7770", "7790", "7800", "7830", "7840",
    "7850", "7860", "7870", "7884", "7900", "7950", "7960", "7970", "7980",
    "7990",
    "8000", "8200", "8210", "8220", "8230", "8240", "8250", "8260", "8270",
    "8300", "8305", "8310", "8320", "8330", "8340", "8350", "8355", "8361",
    "8362", "8380", "8381", "8382", "8400", "8410", "8420", "8444", "8450",
    "8462", "8464", "8471", "8472", "8500", "8520", "8530", "8541", "8543",
    "8544", "8550", "8560", "8570", "8581", "8585", "8586", "8592", "8600",
    "8620", "8632", "8641", "8643", "8653", "8654", "8660", "8670", "8680",
    "8700", "8721", "8722", "8723", "8732", "8740", "8751", "8752", "8762",
    "8763", "8765", "8766", "8781", "8783", "8800", "8830", "8840", "8850",
    "8860", "8870", "8881", "8882", "8883", "8900", "8920", "8930", "8940",
    "8950", "8960", "8961", "8963", "8970", "8981", "8983", "8990",
    "9000", "9100", "9200", "9210", "9220", "9230", "9240", "9260", "9270",
    "9280", "9293", "9300", "9310", "9320", "9330", "9340", "9352", "9362",
    "9370", "9380", "9381", "9382", "9400", "9430", "9440", "9460", "9480",
    "9490", "9492", "9493", "9500", "9510", "9520", "9530", "9541", "9550",
    "9560", "9574", "9575", "9600", "9610", "9620", "9631", "9632", "9640",
    "9670", "9681", "9690", "9700", "9740", "9750", "9760", "9800", "9830",
    "9850", "9870", "9881", "9900", "9940", "9970", "9981", "9982", "9990",
  ],
  kbh: [
    "1050", "1051", "1150", "1200", "1250", "1300", "1350", "1400", "1450",
    "1500", "1550", "1600", "1650", "1700", "1750", "1800", "1850", "1870",
    "1900", "1950", "2000", "2100", "2200", "2300", "2400", "2450", "2500",
    "2600", "2610", "2620", "2630", "2635", "2640", "2650", "2660", "2665",
    "2670", "2680", "2690", "2700", "2720", "2730", "2740", "2750", "2760",
    "2770", "2791", "2800", "2820", "2830", "2840", "2850", "2860", "2870",
    "2880", "2900", "2920", "2930", "2942", "2950", "2960", "2970", "2980",
    "2990",
  ],
  aarhus: ["8000", "8200", "8210", "8220", "8230", "8240", "8250", "8260", "8270"],
  odense: ["5000", "5200", "5210", "5220", "5230", "5240", "5250", "5260", "5270"],
  aalborg: ["9000", "9100", "9200", "9210", "9220", "9270", "9310", "9400"],
  esbjerg: ["6700", "6705", "6710", "6715"],
  vejle: ["7100", "7120", "7160"],
  randers: ["8900", "8920", "8930", "8940", "8960"],
  kolding: ["6000", "6040", "6091"],
  horsens: ["8700", "8721", "8722"],
  roskilde: ["4000", "4030", "4040"],
  helsingoer: ["3000", "3050", "3060"],
  fredensborg: ["3480", "2980"],
  hilleroed: ["3400", "3450"],
  koege: ["4600", "4623"],
  naestved: ["4700", "4733", "4735", "4736"],
  slagelse: ["4200", "4220", "4230"],
  holbaek: ["4300", "4340"],
  frederikshavn: ["9900", "9940", "9970"],
  silkeborg: ["8600", "8620", "8632", "8641", "8653"],
  viborg: ["8800", "8830", "8840", "8850"],
  herning: ["7400", "7430", "7441"],
  esbjerg_omraade: ["6700", "6705", "6710", "6715", "6720", "6731", "6740", "6760"],
};

type BsImageSource = { url?: string; size?: { width?: number; height?: number } };
type BsImage = { url?: string; imageSources?: BsImageSource[] };

type BsCase = {
  priceCash?: number;
  housingArea?: number;
  numberOfRooms?: number;
  yearBuilt?: number;
  energyLabel?: string;
  monthlyExpense?: number;
  addressType?: string;
  caseID?: string | number;
  caseUrl?: string;
  defaultImage?: BsImage;
  images?: BsImage[];
  address?: {
    roadName?: string;
    houseNumber?: string | number;
    letter?: string;
    floor?: string;
    door?: string;
    zipCode?: string | number;
    zip?: { zipCode?: string | number };
    cityName?: string;
  };
};

// Boligsiden serves each photo in ~6 sizes (100x80 up to 1440x960) under
// imageSources[]. Pick the biggest that's ≤1200px wide — high-quality enough
// for the game gallery, not overkill on payload.
function pickImageUrl(img: BsImage | undefined): string | null {
  if (!img) return null;
  if (typeof img.url === "string" && img.url) return img.url;
  const srcs = Array.isArray(img.imageSources) ? img.imageSources : [];
  if (srcs.length === 0) return null;
  const scored = srcs
    .filter((s) => typeof s.url === "string" && s.url)
    .map((s) => ({ url: s.url!, w: s.size?.width ?? 0 }));
  if (scored.length === 0) return null;
  // Prefer largest ≤ 1440, otherwise the biggest we have
  const under = scored.filter((s) => s.w > 0 && s.w <= 1500).sort((a, b) => b.w - a.w);
  return (under[0] ?? scored[scored.length - 1]).url;
}

type GameProperty = {
  id: string;
  price: number;
  area: number;
  rooms?: number;
  yearBuilt?: number;
  energyLabel?: string;
  monthlyExpenses?: number;
  propertyType?: string;
  address: string;
  city: string;
  zipCode: string;
  images: string[];
};

function shuffle<T>(arr: T[]): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

async function fetchCases(zip: string): Promise<BsCase[]> {
  try {
    const res = await fetch(
      `https://api.boligsiden.dk/search/cases?zipCodes=${zip}&per_page=200`,
      {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0 Safari/537.36",
          Accept: "application/json,*/*;q=0.1",
          "Accept-Language": "da-DK,da;q=0.9,en;q=0.8",
        },
        // Skip the fetch cache — the case-list responses are 5-12MB per zip,
        // above Next's 2MB cache limit, and each game already picks a random
        // subset so cache hits wouldn't help much.
        cache: "no-store",
      },
    );
    if (!res.ok) return [];
    const j = (await res.json()) as { cases?: BsCase[] };
    return Array.isArray(j.cases) ? j.cases : [];
  } catch {
    return [];
  }
}

function toProperty(c: BsCase): GameProperty | null {
  const price = typeof c.priceCash === "number" ? c.priceCash : 0;
  const area = typeof c.housingArea === "number" ? c.housingArea : 0;
  if (price < 200000 || price > 50000000) return null;
  if (area < 15 || area > 2000) return null;

  const images: string[] = [];
  const hero = pickImageUrl(c.defaultImage);
  if (hero) images.push(hero);
  for (const img of c.images ?? []) {
    const u = pickImageUrl(img);
    if (u && !images.includes(u)) images.push(u);
  }
  // Games are visual — need at least 3 real photos to be fun to guess
  if (images.length < 3) return null;

  const a = c.address ?? {};
  const streetParts = [
    a.roadName,
    [a.houseNumber, a.letter].filter(Boolean).join(""),
    [a.floor, a.door].filter(Boolean).join("."),
  ].filter(Boolean);
  const zipCode = String(a.zipCode ?? a.zip?.zipCode ?? "");
  const city = String(a.cityName ?? "");
  const address = `${streetParts.join(" ")}, ${zipCode} ${city}`.trim();
  if (!zipCode || !city) return null;

  const idBase =
    (typeof c.caseID === "string" || typeof c.caseID === "number") ? String(c.caseID) : address;

  return {
    id: `bs-${idBase}`,
    price,
    area,
    rooms: typeof c.numberOfRooms === "number" && c.numberOfRooms > 0 ? c.numberOfRooms : undefined,
    yearBuilt:
      typeof c.yearBuilt === "number" && c.yearBuilt > 1700 && c.yearBuilt <= 2100
        ? c.yearBuilt
        : undefined,
    energyLabel:
      c.energyLabel && /^[A-G]\d?$/i.test(c.energyLabel) ? c.energyLabel.toUpperCase() : undefined,
    monthlyExpenses:
      typeof c.monthlyExpense === "number" && c.monthlyExpense > 0 ? c.monthlyExpense : undefined,
    propertyType: c.addressType,
    address: address.slice(0, 140),
    city,
    zipCode,
    images: images.slice(0, 15),
  };
}

export async function GET(req: NextRequest) {
  const region = (req.nextUrl.searchParams.get("region") || "hele-dk").toLowerCase();
  const countParam = Number(req.nextUrl.searchParams.get("count") || "10");
  const count = Math.max(3, Math.min(30, Math.floor(countParam)));

  const pool = ZIP_POOLS[region] || ZIP_POOLS["hele-dk"];
  const shuffledZips = shuffle(pool);

  const chosen: GameProperty[] = [];
  const seenIds = new Set<string>();
  const seenAddresses = new Set<string>();

  // Fetch zips one at a time, keeping the good ones, until we hit `count`.
  // A single zip typically yields 40-200 cases; most rounds are complete
  // after 3-6 fetches. Cap at 20 zips to avoid runaway on empty regions.
  for (const zip of shuffledZips.slice(0, 20)) {
    if (chosen.length >= count) break;
    const cases = await fetchCases(zip);
    const usable: GameProperty[] = [];
    for (const c of shuffle(cases)) {
      const p = toProperty(c);
      if (!p) continue;
      if (seenIds.has(p.id) || seenAddresses.has(p.address)) continue;
      usable.push(p);
      if (usable.length >= 4) break; // take up to 4 per zip so region isn't all-Aarhus
    }
    for (const p of usable) {
      if (chosen.length >= count) break;
      chosen.push(p);
      seenIds.add(p.id);
      seenAddresses.add(p.address);
    }
  }

  if (chosen.length < 3) {
    return NextResponse.json(
      { ok: false, error: "not_enough_properties", got: chosen.length },
      { status: 502 },
    );
  }

  return NextResponse.json({
    ok: true,
    region,
    count: chosen.length,
    properties: shuffle(chosen).slice(0, count),
  });
}
