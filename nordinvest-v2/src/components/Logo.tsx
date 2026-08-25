import Link from "next/link";
import { clsx } from "@/lib/clsx";

export function Logo({
  className,
  size = 32,
  href = "/",
}: {
  className?: string;
  size?: number;
  href?: string | null;
}) {
  const mark = (
    <span className={clsx("flex items-center gap-2", className)}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 32 32"
        fill="none"
        aria-hidden="true"
      >
        <rect width="32" height="32" rx="8" className="fill-slate-900" />
        <path
          d="M9 23V9h2.6l9 10.2V9H23v14h-2.6l-9-10.2V23H9z"
          className="fill-white"
        />
        <path
          d="M24.5 7.5l.7 2 2 .7-2 .7-.7 2-.7-2-2-.7 2-.7.7-2z"
          className="fill-blue-500"
        />
      </svg>
      <span className="text-xl font-bold tracking-tight text-slate-900">
        NordInvest
      </span>
    </span>
  );

  if (href === null) return mark;
  return (
    <Link href={href} aria-label="NordInvest">
      {mark}
    </Link>
  );
}
