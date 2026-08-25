import Link from "next/link";
import { clsx } from "@/lib/clsx";

type Variant = "primary" | "dark" | "secondary";
type Size = "md" | "lg";

const base =
  "inline-flex items-center justify-center gap-2 font-semibold transition-all duration-200 ease-standard focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:opacity-60";

const sizes: Record<Size, string> = {
  md: "px-5 py-2.5 text-sm rounded-full",
  lg: "px-8 py-3.5 text-base rounded-full",
};

const variants: Record<Variant, string> = {
  primary:
    "bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-600/20",
  dark: "bg-slate-900 text-white hover:bg-slate-800",
  secondary:
    "bg-slate-100 text-slate-900 hover:bg-slate-200",
};

type Props = {
  variant?: Variant;
  size?: Size;
  href?: string;
  className?: string;
  children: React.ReactNode;
} & React.ButtonHTMLAttributes<HTMLButtonElement>;

export function Button({
  variant = "primary",
  size = "md",
  href,
  className,
  children,
  ...rest
}: Props) {
  const cls = clsx(base, sizes[size], variants[variant], className);
  if (href) {
    const external = href.startsWith("http") || href.startsWith("mailto") || href.startsWith("tel");
    return (
      <Link
        href={href}
        className={cls}
        {...(external ? { target: href.startsWith("http") ? "_blank" : undefined, rel: "noopener noreferrer" } : {})}
      >
        {children}
      </Link>
    );
  }
  return (
    <button className={cls} {...rest}>
      {children}
    </button>
  );
}
