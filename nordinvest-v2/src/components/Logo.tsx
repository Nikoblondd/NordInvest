import Link from "next/link";
import Image from "next/image";
import { clsx } from "@/lib/clsx";

// Server component — no client JS, no runtime "does this file exist?" probe.
// Statically references /public/nordinvest-logo.png so Next optimizes it once
// (AVIF/WebP) and inlines the correct <img> markup on every page.

function Mark({ size, variant }: { size: number; variant: "dark" | "light" }) {
  // Only the dark mark exists as a PNG today. The light variant falls back to
  // the inline SVG so a dark-navbar page still shows a mark instead of a 404.
  if (variant === "light") {
    return (
      <svg width={size} height={size} viewBox="0 0 120 120" fill="none" aria-hidden="true">
        <path d="M16 104V40h13l46 47V40h13v64H75L29 57v47H16z" className="fill-current text-white" />
        <circle cx="99" cy="30" r="13" className="fill-current text-white" />
      </svg>
    );
  }
  return (
    <Image
      src="/nordinvest-logo.png"
      alt="NordInvest"
      width={size}
      height={size}
      priority
      className="object-contain mix-blend-multiply"
    />
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
