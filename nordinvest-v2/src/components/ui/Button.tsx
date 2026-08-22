import Link from "next/link";
import { clsx } from "@/lib/clsx";

type Variant = "primary" | "secondary";
type Size = "md" | "lg";

const base =
  "inline-flex items-center justify-center rounded-full font-medium tracking-tight transition-all duration-200 ease-standard focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-400 focus-visible:ring-offset-2";

const sizes: Record<Size, string> = {
  md: "px-6 py-3 text-sm",
  lg: "px-8 py-4 text-base",
};

const variants: Record<Variant, string> = {
  primary:
    "bg-gold-500 text-navy-900 hover:bg-gold-600 hover:scale-[1.02] shadow-[0_8px_30px_-12px_rgba(184,147,90,0.6)]",
  secondary:
    "bg-transparent border border-current hover:opacity-80",
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
    const external = href.startsWith("http");
    return (
      <Link
        href={href}
        className={cls}
        {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
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
