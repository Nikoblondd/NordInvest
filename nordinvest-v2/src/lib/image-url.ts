/**
 * Listing photos from Ejendomstorvet only load through an image-class
 * transform; a bare path or another query string returns 404. Safe to use in
 * the browser and on the server.
 */
export function listingImage(url: string | null | undefined): string | null {
  if (!url || typeof url !== "string") return null;
  if (url.includes("i.ejendomstorvet.dk") && !url.includes("class=")) return `${url.split("?")[0]}?class=listingimagebannermax`;
  return url;
}
