/**
 * The postnummer in a Danish address. It follows the comma ("Vestervang 41
 * 4.4145, 8000 Aarhus C"); door numbers can also be four digits, so the first
 * four-digit number is not safe. Without a comma, the last one wins.
 */
export function zipFromAddress(address: string | null | undefined): string | null {
  const a = address ?? "";
  const afterComma = a.match(/,\s*(\d{4})\b/);
  if (afterComma) return afterComma[1];
  const all = a.match(/\b\d{4}\b/g);
  return all ? all[all.length - 1] : null;
}
