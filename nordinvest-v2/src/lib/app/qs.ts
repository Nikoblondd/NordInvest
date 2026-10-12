/** Rebuilds a query string from Next's searchParams object. */
export function qs(sp: Record<string, string | string[] | undefined>): string {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(sp)) {
    if (typeof v === "string") q.set(k, v);
    else if (Array.isArray(v)) v.forEach((x) => q.append(k, x));
  }
  const s = q.toString();
  return s ? `?${s}` : "";
}
