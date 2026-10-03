"use client";

/** Opens the cookie banner again, so a choice can be changed as easily as it was made. */
export function CookieSettingsButton({ className }: { className?: string }) {
  return (
    <button type="button" onClick={() => window.dispatchEvent(new Event("ni-consent-reopen"))} className={className}>
      Cookie-indstillinger
    </button>
  );
}
