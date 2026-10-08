import { NextResponse } from "next/server";

// Temporary: does production have the Datafordeler key it should? Shows only
// length and the first four characters. Behind CRON_SECRET. Remove after use.
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  if (req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) return NextResponse.json({}, { status: 401 });
  const k = process.env.DATAFORDELER_API_KEY ?? "";
  const t = new Date().toISOString();
  const r = await fetch(`https://graphql.datafordeler.dk/FlexibleCurrent/v1?apiKey=${encodeURIComponent(k)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query: `{ DAR_Husnummer(first:1, virkningstid: "${t}", where:{adgangsadressebetegnelse:{startsWith:"Vindblæsvej 17,"}}){nodes{ adgangsadressebetegnelse }} }` }),
    cache: "no-store",
  }).then((x) => x.text()).catch((e) => String(e));
  return NextResponse.json({ length: k.length, start: k.slice(0, 4), trailingWhitespace: /\s$/.test(k), test: r.slice(0, 160) });
}
