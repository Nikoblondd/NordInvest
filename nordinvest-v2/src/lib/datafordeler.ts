// Datafordeler BBR Public REST — official Danish building registry (BBR).
// Server-side only: credentials come from env and are never sent to the client.
// Auth is username/password as query params (the documented BBRPublic method).
// A valid *tjenestebruger* (service user) with BBR access is required — the
// self-service web login (email) does NOT work for REST.

const BBR_BASE = "https://services.datafordeler.dk/BBR/BBRPublic/1/REST";

function creds() {
  return {
    username: process.env.DATAFORDELER_USERNAME ?? "",
    password: process.env.DATAFORDELER_PASSWORD ?? "",
  };
}

export function datafordelerConfigured(): boolean {
  const { username, password } = creds();
  return !!username && !!password;
}

async function bbr(entity: string, params: Record<string, string>): Promise<unknown[]> {
  const { username, password } = creds();
  const qs = new URLSearchParams({ ...params, username, password, Format: "JSON" });
  const res = await fetch(`${BBR_BASE}/${entity}?${qs.toString()}`, { cache: "no-store" });
  if (!res.ok) {
    // 403 = invalid/unprovisioned service user. Bubble a typed error; callers
    // degrade gracefully so the analyzer still runs on scraped data.
    throw new Error(`BBR ${entity} HTTP ${res.status}`);
  }
  const data = await res.json();
  return Array.isArray(data) ? data : [data];
}

export function getGrundByBFE(bfeNummer: string | number) {
  return bbr("grund", { BFEnummer: String(bfeNummer) });
}

// Buildings link to the grund, not directly to BFE — this is the real path.
export function getBygningerByGrund(grundId: string) {
  return bbr("bygning", { Grund: grundId });
}

export function getEnhederByBygning(bygningsId: string) {
  return bbr("enhed", { Bygning: bygningsId });
}

// Kept for completeness (BBR is BFE-structured), though buildings are normally
// reached via the grund above.
export function getBygningByBFE(bfeNummer: string | number) {
  return bbr("bygning", { BFEnummer: String(bfeNummer) });
}
