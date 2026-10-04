import { dealCity } from "@/lib/deal-cities";
import { dbHeaders, dbReady, dbUrl, notice, validUnsubToken } from "@/lib/deal-subscribe";

/* One-click opt-out from the city email. Signed per address and kommune. */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const sp = new URL(req.url).searchParams;
  const email = (sp.get("e") ?? "").toLowerCase();
  const k = sp.get("k") ?? "";
  const c = dealCity(k);
  if (!c || !validUnsubToken(email, k, sp.get("t") ?? "")) return notice("Linket virker ikke", "Skriv til contact@nordinvest.io, så afmelder vi dig med det samme.", 400);
  if (dbReady()) {
    await fetch(dbUrl(`deal_subscribers?email=eq.${encodeURIComponent(email)}&kommune=eq.${k}`), {
      method: "PATCH",
      headers: { ...dbHeaders(), Prefer: "return=minimal" },
      body: JSON.stringify({ unsubscribed_at: new Date().toISOString() }),
      cache: "no-store",
    }).catch(() => null);
  }
  return notice("Du er afmeldt", `Du får ikke flere mails om ${c.name} fra os.`);
}
