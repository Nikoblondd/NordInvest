/* eslint-disable @typescript-eslint/no-explicit-any */
// Shared by the vision routes: fetch listing photos ourselves (browser UA) and
// send them as base64, and salvage a JSON object from a model reply.

const OK_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

export async function fetchImageB64(url: string): Promise<{ media_type: string; data: string } | null> {
  try {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), 8000);
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36",
        // Request only formats Anthropic accepts — never avif (CDNs will serve it if offered).
        Accept: "image/jpeg,image/png,image/webp,image/*;q=0.8",
      },
    });
    clearTimeout(t);
    if (!res.ok) return null;
    let type = (res.headers.get("content-type") ?? "").split(";")[0].trim().toLowerCase();
    if (type === "image/jpg") type = "image/jpeg";
    if (!OK_TYPES.has(type)) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length < 1024 || buf.length > 5_000_000) return null; // skip tiny icons / huge files
    return { media_type: type, data: buf.toString("base64") };
  } catch {
    return null;
  }
}

export function parseJson(text: string): any | null {
  try {
    return JSON.parse(text);
  } catch {
    const m = text.match(/\{[\s\S]*\}/); // salvage a JSON object from any wrapping
    if (m) {
      try {
        return JSON.parse(m[0]);
      } catch {
        return null;
      }
    }
    return null;
  }
}

