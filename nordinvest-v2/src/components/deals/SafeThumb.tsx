"use client";

import { useState } from "react";

/** A listing photo that falls back to a plain tile when the broker removes the image. */
export function SafeThumb({ src, alt, className }: { src: string; alt: string; className: string }) {
  const [broken, setBroken] = useState(false);
  if (broken) return <span aria-hidden className={`${className} bg-slate-100`} />;
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt={alt} width={96} height={72} loading="lazy" decoding="async" className={className} onError={() => setBroken(true)} />;
}
