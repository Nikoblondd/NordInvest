"use client";

import { useState } from "react";
import { clsx } from "@/lib/clsx";
import { listingImage } from "@/lib/image-url";

/*
 * A property's photo, or our own illustration of a Danish apartment building
 * when there is none (or it fails to load), so a list never shows grey boxes.
 */
export const HOME_ILLUSTRATION = "/app/il-home.jpg";

export function PropertyImage({ src, alt = "", className }: { src?: string | null; alt?: string; className?: string }) {
  const [broken, setBroken] = useState(false);
  const url = listingImage(src);
  const real = !!url && !broken;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={real ? url! : HOME_ILLUSTRATION} alt={real ? alt : ""} loading="lazy" onError={() => setBroken(true)}
      className={clsx("h-full w-full", real ? "object-cover" : "bg-white object-contain p-[6%]", className)} />
  );
}
