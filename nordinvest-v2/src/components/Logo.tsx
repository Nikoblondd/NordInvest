"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { clsx } from "@/lib/clsx";

// Drop your real logo at:
//   public/nordinvest-logo.png        (dark mark — for light backgrounds)
//   public/nordinvest-logo-white.png  (white mark — for dark backgrounds)
// It swaps in automatically; until then a clean "Ni" mark shows.
function useImageExists(src: string) {
  const [ok, setOk] = useState(false);
  useEffect(() => {
    const img = new window.Image();
    img.onload = () => setOk(true);
    img.src = src;
  }, [src]);
  return ok;
}

function Mark({ size, variant }: { size: number; variant: "dark" | "light" }) {
  const src = variant === "light" ? "/nordinvest-logo-white.png" : "/nordinvest-logo.png";
  const hasPng = useImageExists(src);

  if (hasPng) {
    // eslint-disable-next-line @next/next/no-img-element
    return (
      <img
        src={src}
        alt="NordInvest"
        width={size}
        height={size}
        className={clsx("object-contain", variant === "dark" && "mix-blend-multiply")}
      />
    );
  }

  const color = variant === "light" ? "text-white" : "text-slate-900";
  return (
    <svg width={size} height={size} viewBox="0 0 120 120" fill="none" aria-hidden="true">
      {/* bold N */}
      <path
        d="M16 104V40h13l46 47V40h13v64H75L29 57v47H16z"
        className={clsx("fill-current", color)}
      />
      {/* i dot */}
      <circle cx="99" cy="30" r="13" className={clsx("fill-current", color)} />
    </svg>
  );
}

export function Logo({
  className,
  size = 30,
  href = "/",
  variant = "dark",
}: {
  className?: string;
  size?: number;
  href?: string | null;
  variant?: "dark" | "light";
}) {
  const content = (
    <span className={clsx("flex items-center gap-2", className)}>
      <Mark size={size} variant={variant} />
      <span
        className={clsx(
          "text-xl font-bold tracking-tight",
          variant === "light" ? "text-white" : "text-slate-900",
        )}
      >
        NordInvest
      </span>
    </span>
  );

  if (href === null) return content;
  return (
    <Link href={href} aria-label="NordInvest">
      {content}
    </Link>
  );
}
