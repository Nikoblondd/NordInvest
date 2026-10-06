import { NextResponse } from "next/server";
import { getUdlejerindeks, previousReading, monthKey, pct, dkn, type Udlejerindeks } from "@/lib/udlejerindeks";
import { getDealSnapshot } from "@/lib/deals-snapshot";
import { REPORT_FROM, REPORT_TO } from "@/lib/outreach/schedule";

/*
 * "Mandagspakken": every Monday morning Nikolaj gets two LinkedIn posts,
 * written from this week's Udlejerindeks numbers, with links to the matching
 * share images. The angles rotate week by week so the feed doesn't repeat.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

const SITE = "https://nordinvest.io";
const TYPE: Record<string, string> = { condo: "ejerlejlighed", villa: "villa", "terraced house": "rækkehus" };

type Post = { title: string; text: string; image: string };

function isoWeek(d: Date) {
  const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const day = t.getUTCDay() || 7;
  t.setUTCDate(t.getUTCDate() + 4 - day);
  return Math.ceil(((t.getTime() - Date.UTC(t.getUTCFullYear(), 0, 1)) / 86400000 + 1) / 7);
}

async function posts(idx: Udlejerindeks, week: number): Promise<Post[]> {
  const ranked = idx.rows.filter((r) => r.rank != null);
  const by = (s: string) => ranked.find((r) => r.slug === s);
  const kbh = by("koebenhavn");
  const aar = by("aarhus");
  const nat = pct(idx.positive / idx.scanned);
  const zero = ranked.filter((r) => r.positive === 0).sort((a, b) => b.scanned - a.scanned);
  const top5 = ranked.slice(0, 5).map((r, i) => `${i + 1}. ${r.name}: ${pct(r.share)} %`).join("\n");

  const top: Post = {
    title: "Top 5: hvor lejen betaler lånet",
    image: `${SITE}/api/og/udlejerindeks?format=linkedin`,
    text: `Jeg har regnet hver eneste helårsbolig til salg i Danmark igennem som udlejning. ${dkn(idx.scanned)} boliger.

Spørgsmålet er simpelt: kan lejen betale lånet og alle udgifterne?

Svaret er ja for ${dkn(idx.positive)} af dem. ${nat} %.

Men det afhænger fuldstændig af, hvor du kigger:

${top5}
${kbh ? `\nI København gælder det ${dkn(kbh.positive)} af ${dkn(kbh.scanned)} boliger.` : ""}

Det er hele pointen med NordInvest Udlejerindeks: de gode udlejningsboliger ligger sjældent dér, hvor folk leder.

Hele listen over alle kommuner ligger her: ${SITE}/udlejerindeks

(20 % udbetaling, 5 % rente, estimeret markedsleje efter alle udgifter.)`,
  };

  const bund: Post = {
    title: "Bunden: kommuner uden én bolig med plus",
    image: `${SITE}/api/og/udlejerindeks?format=linkedin&vis=bund`,
    text: `I ${idx.zero} danske kommuner kan du ikke købe én eneste bolig, hvor lejen betaler lånet.

Ikke én.

${zero.slice(0, 5).map((r) => `${r.name}: 0 af ${dkn(r.scanned)}`).join("\n")}

Det betyder ikke, at man ikke kan tjene penge på bolig dér. Men det betyder, at man er afhængig af, at priserne bliver ved med at stige. Det er spekulation, ikke udlejning.

Imens giver ${pct(ranked[0].share)} % af boligerne til salg i ${ranked[0].name} plus hver måned.

Se hvor din kommune ligger: ${SITE}/udlejerindeks`,
  };

  const snap = await getDealSnapshot(null, 1).catch(() => null);
  const d = snap?.top[0];
  const deal: Post | null = d
    ? {
        title: "Ugens skæve handel",
        image: `${SITE}/api/og/udlejerindeks?format=linkedin`,
        text: `Ugens skæve handel fra Deal-motoren:

En ${TYPE[d.type] ?? "bolig"} i ${d.city} til ${dkn(d.price)} kr.${d.area ? ` ${d.area} m².` : ""}

Med 20 % udbetaling og 5 % rente giver den efter vores beregning +${dkn(d.cashFlow)} kr. om måneden efter alle udgifter.

Til sammenligning koster en etværelses i ${kbh ? "København" : "de store byer"} typisk det samme som hele huset i udbetaling.

Er det en god handel? Det kommer an på stand, udlejningsmulighed og lokalplan. Det er derfor, vi regner hele analysen igennem, ikke kun overskriften.

Deal-motoren finder dem hver 6. time: ${SITE}/deals`,
      }
    : null;

  const city: Post | null =
    kbh && aar
      ? {
          title: "Storby mod provins",
          image: `${SITE}/api/og/udlejerindeks?format=linkedin`,
          text: `Den mest populære investeringsstrategi i Danmark er: køb en lejlighed i København eller Aarhus og lej den ud.

Tallene fra NordInvest Udlejerindeks i denne uge:

København: ${dkn(kbh.positive)} af ${dkn(kbh.scanned)} boliger giver plus.
Aarhus: ${dkn(aar.positive)} af ${dkn(aar.scanned)}.
${ranked[0].name}: ${dkn(ranked[0].positive)} af ${dkn(ranked[0].scanned)}.

Storbyen kan stadig give mening, hvis du tror på værdistigning. Men så skal du vide, at du betaler for at eje den hver måned.

Hvilken strategi kører du selv? Skriv det gerne i kommentarerne.

${SITE}/udlejerindeks`,
        }
      : null;

  const prev = await previousReading(monthKey());
  let movers: Post | null = null;
  if (prev) {
    const before = new Map(prev.rows.map((r) => [r.slug, r.rank]));
    const moves = ranked
      .map((r) => ({ r, d: (before.get(r.slug) ?? r.rank!) - r.rank! }))
      .filter((m) => m.d !== 0)
      .sort((a, b) => b.d - a.d);
    const up = moves.slice(0, 3);
    if (up.length && up[0].d > 0) {
      movers = {
        title: "Månedens klatrere",
        image: `${SITE}/api/og/udlejerindeks?format=linkedin`,
        text: `Siden sidste måling (${prev.month}) er der sket noget i NordInvest Udlejerindeks:

${up.map((m) => `${m.r.name}: op ${m.d} pladser til nr. ${m.r.rank}`).join("\n")}

Når en kommune klatrer, er det typisk fordi priserne falder, eller fordi der kommer billigere boliger til salg. Begge dele er interessante, hvis du leder efter en udlejningsbolig.

Hele indekset: ${SITE}/udlejerindeks`,
      };
    }
  }

  const pool = [top, bund, deal, city].filter((p): p is Post => !!p);
  const a = pool[(week * 2) % pool.length];
  const b = pool[(week * 2 + 1) % pool.length];
  return movers ? [movers, a] : [a, b];
}

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const key = process.env.RESEND_API_KEY;
  const idx = await getUdlejerindeks();
  if (!key || !idx) return NextResponse.json({ ok: false, error: !key ? "resend_not_configured" : "no_data" }, { status: 500 });
  const now = new Date();
  const week = isoWeek(now);
  const ps = await posts(idx, week);
  const text = [
    `Mandagspakken, uge ${week}`,
    "To opslag, klar til at kopiere. Tallene er fra i morges. Post gerne tirsdag til torsdag mellem kl. 7 og 9, og svar på kommentarerne den første time.",
    ...ps.map((p, i) => `========== OPSLAG ${i + 1}: ${p.title} ==========\n\nBillede (gem og vedhæft): ${p.image}\n\n${p.text}`),
    "NordInvest",
  ].join("\n\n");
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json", "Idempotency-Key": `weekly-content-${now.getUTCFullYear()}-${week}` },
    body: JSON.stringify({ from: REPORT_FROM, to: [REPORT_TO], subject: `Mandagspakken uge ${week}: 2 LinkedIn-opslag med ugens tal`, text }),
  });
  return NextResponse.json({ ok: res.ok, week, posts: ps.map((p) => p.title) });
}
