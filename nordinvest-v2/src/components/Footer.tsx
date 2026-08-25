import Link from "next/link";
import { Logo } from "./Logo";

export function Footer() {
  return (
    <footer className="border-t border-slate-200 bg-white px-6 py-12">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-6 md:flex-row">
        <Logo size={24} />
        <div className="text-sm text-slate-500">
          © {new Date().getFullYear()} NordInvest ApS. Alle rettigheder forbeholdes.
        </div>
        <div className="flex gap-4 text-sm font-medium text-slate-600">
          <Link href="/juridisk/vilkaar" className="hover:text-slate-900">
            Vilkår
          </Link>
          <Link href="/juridisk/privatlivspolitik" className="hover:text-slate-900">
            Privatlivspolitik
          </Link>
          <Link href="/kontakt" className="hover:text-slate-900">
            Kontakt
          </Link>
        </div>
      </div>
    </footer>
  );
}
