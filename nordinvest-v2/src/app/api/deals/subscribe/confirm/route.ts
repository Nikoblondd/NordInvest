import { dealCity } from "@/lib/deal-cities";
import { cityOptInText, dbHeaders, dbReady, dbUrl, notice, readConfirmToken } from "@/lib/deal-subscribe";
import { sendEmail } from "@/lib/email";

/*
 * The link in the confirmation email. Creates (or re-activates) the
 * subscription with the consent wording and time. If the table is missing, the
 * signup is mailed to the admin so no consent is lost.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const p = readConfirmToken(new URL(req.url).searchParams.get("t") ?? "");
  const c = p ? dealCity(p.k) : null;
  if (!p || !c) return notice("Linket virker ikke", "Linket er udløbet eller ugyldigt. Tilmeld dig igen på siden for din by.", 400);

  const now = new Date().toISOString();
  const row = {
    email: p.e,
    kommune: c.slug,
    consent_text: cityOptInText(c.in),
    consent_at: new Date(p.t).toISOString(),
    confirmed_at: now,
    unsubscribed_at: null,
  };
  let stored = false;
  if (dbReady()) {
    const res = await fetch(dbUrl("deal_subscribers?on_conflict=email,kommune"), {
      method: "POST",
      headers: { ...dbHeaders(), Prefer: "resolution=merge-duplicates,return=minimal" },
      body: JSON.stringify(row),
      cache: "no-store",
    }).catch(() => null);
    stored = !!res?.ok;
  }
  if (!stored) {
    const admin = (process.env.ADMIN_EMAILS ?? "").split(",")[0]?.trim();
    if (admin) {
      await sendEmail({
        to: admin,
        subject: `Ny tilmelding (ikke gemt i databasen): ${c.name}`,
        html: `<p>Tabellen deal_subscribers mangler eller fejlede. Gem denne tilmelding:</p><pre>${JSON.stringify(row, null, 2)}</pre><p>Kør supabase/deal-subscribers-migration.sql i Supabase.</p>`,
      });
    }
  }
  return notice(
    `Du er tilmeldt ${c.name}`,
    `Tak. Du får månedens bedste køb ${c.in} på mail, første gang den 1. i næste måned. Du kan altid afmelde med ét klik nederst i mailen.`,
  );
}
