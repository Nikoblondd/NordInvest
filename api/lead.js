// Financing lead intake endpoint.
// MVP-honest: validates the lead, logs it (visible in Vercel logs), and — if a
// destination is configured via env — forwards it there. It does NOT silently
// claim to email an admin or write to a database that isn't wired up.
//
// To actually receive leads, set ONE of these in the Vercel project env:
//   LEAD_WEBHOOK_URL   — any HTTPS endpoint (Zapier/Make/CRM/your own) that
//                        receives the lead JSON via POST. Connect it to email
//                        or a sheet/DB on your side.
// Until then, leads are still captured in the function logs so nothing is lost.

function readJson(req) {
  return new Promise((resolve) => {
    if (req.body && typeof req.body === 'object') return resolve(req.body);
    let raw = '';
    req.on('data', (c) => { raw += c; if (raw.length > 1e6) req.destroy(); });
    req.on('end', () => { try { resolve(JSON.parse(raw || '{}')); } catch { resolve({}); } });
    req.on('error', () => resolve({}));
  });
}

const isEmail = (s) => typeof s === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
const clean = (s, max = 200) => (typeof s === 'string' ? s.trim().slice(0, max) : '');

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  if (req.method !== 'POST') {
    res.status(405).json({ ok: false, error: 'method_not_allowed' });
    return;
  }

  const body = await readJson(req);

  const name = clean(body.name, 120);
  const email = clean(body.email, 160);
  const phone = clean(body.phone, 40);

  if (!name || !isEmail(email) || !phone) {
    res.status(400).json({ ok: false, error: 'invalid_contact' });
    return;
  }

  // Whitelist the answer fields we accept — never trust arbitrary payloads.
  const lead = {
    name, email, phone,
    need: clean(body.need, 40),                 // boliglaan | investering | refinansiering | erhverv
    amountRange: clean(body.amountRange, 40),
    grossMonthly: Number(body.grossMonthly) || null,
    existingDebt: Number(body.existingDebt) || null,
    downPayment: Number(body.downPayment) || null,
    employment: clean(body.employment, 40),
    rki: !!body.rki,
    defaulted: !!body.defaulted,
    ownsProperty: !!body.ownsProperty,
    source: clean(body.source, 60) || 'analyzer', // which tool the user came from
    lang: clean(body.lang, 5),
    consent: !!body.consent,
    timestamp: new Date().toISOString(),
    ua: clean(req.headers['user-agent'], 200),
  };

  if (!lead.consent) {
    res.status(400).json({ ok: false, error: 'consent_required' });
    return;
  }

  // Always capture in logs so a lead is never lost, even before a webhook is set.
  console.log('[lead]', JSON.stringify(lead));

  // Forward to the configured destination, if any.
  const hook = process.env.LEAD_WEBHOOK_URL;
  if (hook) {
    try {
      await fetch(hook, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(lead),
      });
    } catch (err) {
      // Don't fail the user's submission if the downstream is momentarily down;
      // the lead is already in the logs.
      console.error('[lead] webhook forward failed:', err && err.message);
    }
  }

  res.status(200).json({ ok: true });
}
