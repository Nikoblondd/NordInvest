import Link from "next/link";
import { clsx } from "@/lib/clsx";

type Variant = "primary" | "dark" | "secondary";
type Size = "md" | "lg";

const base =
  "inline-flex items-center justify-center gap-2 font-semibold transition-all duration-150 ease-standard focus-visible:outline-none disabled:opacity-60 active:translate-y-px";

const sizes: Record<Size, string> = {
  md: "px-5 py-2.5 text-sm rounded-full",
  lg: "px-8 py-3.5 text-base rounded-full",
};

// Considered button treatments — no more `shadow-lg shadow-blue-600/20` glow
// (the #1 AI-generated CTA tell). Primary uses a subtle inset highlight + a
// tight contact shadow, so it reads physical without the neon glow.
const variants: Record<Variant, string> = {
  primary:
    "bg-blue-600 text-white hover:bg-blue-700 shadow-btn ring-1 ring-inset ring-white/10",
  dark: "bg-slate-900 text-white hover:bg-slate-800 shadow-btn ring-1 ring-inset ring-white/10",
  secondary:
    "bg-white text-slate-900 border border-slate-200 hover:border-slate-300 hover:bg-slate-50",
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
