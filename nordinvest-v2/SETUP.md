# NordInvest v2 — setup guide

Everything you need to make auth + payments work. I've written all the code
wired to these env vars; once you fill them in, the flows go live. I **cannot**
create accounts or paste secrets for you — those steps are yours.

Copy `.env.example` → `.env.local` and fill values as you go. Add the **same**
variables in Vercel (Project → Settings → Environment Variables).

---

## 1. Supabase (auth + database) — ~10 min

1. Go to **supabase.com** → New project. Pick a region (Frankfurt = closest to DK).
2. Project Settings → **API**. Copy into `.env.local`:
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` key → `SUPABASE_SERVICE_ROLE_KEY` (secret — server only)
3. Open **SQL Editor** → paste the contents of `supabase/schema.sql` → Run.
   (Creates `profiles` + `analyses`, RLS policies, and the auto-profile trigger.)

**What I need from you:** the three keys above. That's it — schema is already written.

---

## 2. Google OAuth — ~10 min

You configure Google credentials, then paste them **into Supabase** (not into env).

1. **console.cloud.google.com** → create/select a project.
2. APIs & Services → **OAuth consent screen** → External → fill app name
   ("NordInvest"), support email, developer email. Save. (You can leave it in
   "Testing" while developing.)
3. APIs & Services → **Credentials** → Create Credentials → **OAuth client ID** →
   Application type: **Web application**.
   - Authorized JavaScript origins: `https://<your-project>.supabase.co`
   - Authorized redirect URI: `https://<your-project>.supabase.co/auth/v1/callback`
     (copy the exact URL from Supabase → Auth → Providers → Google)
4. Copy the **Client ID** + **Client secret**.
5. In **Supabase → Authentication → Providers → Google**: enable it, paste Client
   ID + secret, Save.

**What I need from you:** just confirmation Google is enabled in Supabase. The
secrets live in Supabase, not in this repo.

---

## 3. LinkedIn OAuth — ~10 min

1. **linkedin.com/developers** → Create app. Associate it with the NordInvest
   company page. Fill logo, privacy policy URL (`https://nordinvest.io/juridisk/privatlivspolitik`).
2. **Auth** tab → add redirect URL:
   `https://<your-project>.supabase.co/auth/v1/callback`
3. **Products** tab → request **"Sign In with LinkedIn using OpenID Connect"**
   (approved instantly).
4. Copy **Client ID** + **Client Secret**.
5. In **Supabase → Authentication → Providers → LinkedIn (OIDC)**: enable, paste,
   Save.

**What I need from you:** confirmation LinkedIn (OIDC) is enabled in Supabase.

---

## 4. Stripe (test mode first) — ~15 min

1. **dashboard.stripe.com** → toggle **Test mode** (top right).
2. Developers → **API keys**. Copy:
   - `Publishable key` → `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
   - `Secret key` → `STRIPE_SECRET_KEY`
3. **Products** → create 3 recurring products, currency **DKK**, monthly:
   - Starter — 129 DKK/md → copy its **price id** (`price_…`) → `STRIPE_PRICE_STARTER`
   - Pro — 349 DKK/md → `STRIPE_PRICE_PRO`
   - Unlimited — 799 DKK/md → `STRIPE_PRICE_UNLIMITED`
4. **Webhook** (needed for subscription status to update):
   - Local dev: install Stripe CLI → `stripe listen --forward-to localhost:3000/api/stripe/webhook`
     → copy the `whsec_…` it prints → `STRIPE_WEBHOOK_SECRET`.
   - Production: Developers → Webhooks → Add endpoint
     `https://<preview-domain>/api/stripe/webhook`, events:
     `checkout.session.completed`, `customer.subscription.updated`,
     `customer.subscription.deleted`, `invoice.payment_failed`. Copy its signing
     secret → `STRIPE_WEBHOOK_SECRET` in Vercel.

**What I need from you:** the publishable + secret keys, the 3 price ids, and the
webhook secret.

---

## 5. Vercel preview deploy

The app lives in the `nordinvest-v2/` subfolder, so tell Vercel where the root is:

1. Vercel → your project → **Settings → General → Root Directory** → `nordinvest-v2`.
   (Or create a **new** Vercel project pointed at this repo + that root, so the live
   static site's project is untouched.)
2. Settings → **Environment Variables** → add every key from `.env.local`
   (set `NEXT_PUBLIC_SITE_URL` to the preview domain).
3. Deploy the `v2-rebuild` branch → Vercel gives a preview URL. `main` stays live.

---

## Quick reference — what I still need from you to finish + test the flows

| Item | Where you get it | Env var / location |
|---|---|---|
| Supabase URL + anon + service keys | Supabase → Settings → API | `.env.local` + Vercel |
| Google enabled | Google Cloud → Supabase Providers | in Supabase |
| LinkedIn enabled | LinkedIn Devs → Supabase Providers | in Supabase |
| Stripe pub + secret key | Stripe → API keys | `.env.local` + Vercel |
| 3 Stripe price ids | Stripe → Products | `.env.local` + Vercel |
| Stripe webhook secret | `stripe listen` / dashboard | `.env.local` + Vercel |

Once these are in, I wire the final touches and give you a test script. I can build
all the auth/Stripe **code** before you finish — it just won't function until the
keys exist, and I can't run the OAuth consent screens myself.
