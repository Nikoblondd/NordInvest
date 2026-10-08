import { NextResponse } from "next/server";

// Temporary: does production have the Datafordeler key it should? Shows only
// its length and whether Datafordeler accepts it, nothing of the key. Remove after use.
export const dynamic = "force-dynamic";

export async function GET() {
  const k = process.env.DATAFORDELER_API_KEY ?? "";
  const t = new Date().toISOString();
  const r = await fetch(`https://graphql.datafordeler.dk/FlexibleCurrent/v1?apiKey=${encodeURIComponent(k)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query: `{ DAR_Husnummer(first:1, virkningstid: "${t}", where:{adgangsadressebetegnelse:{startsWith:"Vindblæsvej 17,"}}){nodes{ adgangsadressebetegnelse }} }` }),
    cache: "no-store",
  }).then((x) => x.text()).catch((e) => String(e));
  return NextResponse.json({ length: k.length, trailingWhitespace: /\s$/.test(k), accepted: r.includes('"data"'), error: r.includes('"data"') ? null : r.slice(0, 120) });
}
