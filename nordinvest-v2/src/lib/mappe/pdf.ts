"use client";

/*
 * Reads the text of a PDF in the browser, page by page, so the file itself
 * never leaves the user's computer. pdf.js and its worker load only when a
 * document is added. Scanned PDFs (images without text) return little or no
 * text; the caller tells the user to use a text PDF instead.
 */

export async function pdfPages(file: File, maxPages = 120): Promise<string[]> {
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
  const doc = await pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise;
  const pages: string[] = [];
  const n = Math.min(doc.numPages, maxPages);
  for (let i = 1; i <= n; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    let line = "";
    let lastY: number | null = null;
    const out: string[] = [];
    for (const item of content.items as { str?: string; transform?: number[]; hasEOL?: boolean }[]) {
      if (typeof item.str !== "string") continue;
      const y = item.transform?.[5] ?? null;
      if (lastY !== null && y !== null && Math.abs(y - lastY) > 2) { out.push(line); line = ""; }
      line += (line && !line.endsWith(" ") ? " " : "") + item.str;
      lastY = y;
      if (item.hasEOL) { out.push(line); line = ""; lastY = null; }
    }
    if (line) out.push(line);
    pages.push(out.map((l) => l.trim()).filter(Boolean).join("\n"));
  }
  await doc.destroy();
  return pages;
}
