/*
 * Consent to the monthly "Månedens deals" email (markedsføringsloven § 10:
 * marketing email needs prior, specific consent). Stored on the user's own
 * user_metadata with the time and the exact wording they agreed to, so the
 * consent can be documented. Unticked by default; withdrawn with one click.
 */
export const DEALS_OPTIN_TEXT =
  "Ja tak, send mig månedens deals på mail: de bedste boliger og erhvervsejendomme fra Deal-motoren, højst én mail om måneden. Jeg kan altid afmelde.";

export const optInMetadata = (on: boolean) =>
  on
    ? { deals_optin: true, deals_optin_at: new Date().toISOString(), deals_optin_text: DEALS_OPTIN_TEXT }
    : { deals_optin: false, deals_optout_at: new Date().toISOString() };
