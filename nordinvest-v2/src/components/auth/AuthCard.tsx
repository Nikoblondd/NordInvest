import Link from "next/link";
import { Logo } from "@/components/Logo";

function LinkedInIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M20.45 20.45h-3.56v-5.57c0-1.33-.02-3.04-1.85-3.04-1.85 0-2.13 1.45-2.13 2.94v5.67H9.35V9h3.42v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.45v6.29zM5.34 7.43a2.07 2.07 0 1 1 0-4.14 2.07 2.07 0 0 1 0 4.14zM7.12 20.45H3.55V9h3.57v11.45zM22.22 0H1.77C.79 0 0 .77 0 1.73v20.54C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.73V1.73C24 .77 23.2 0 22.22 0z" />
    </svg>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5a5.6 5.6 0 0 1-2.4 3.6v3h3.9c2.3-2.1 3.5-5.2 3.5-8.8z" />
      <path fill="#34A853" d="M12 24c3.2 0 6-1.1 8-2.9l-3.9-3c-1.1.7-2.5 1.2-4.1 1.2-3.1 0-5.8-2.1-6.7-5H1.3v3.1A12 12 0 0 0 12 24z" />
      <path fill="#FBBC05" d="M5.3 14.3a7.2 7.2 0 0 1 0-4.6V6.6H1.3a12 12 0 0 0 0 10.8l4-3.1z" />
      <path fill="#EA4335" d="M12 4.8c1.8 0 3.3.6 4.6 1.8l3.4-3.4A12 12 0 0 0 12 0 12 12 0 0 0 1.3 6.6l4 3.1C6.2 6.9 8.9 4.8 12 4.8z" />
    </svg>
  );
}

export function AuthCard({
  mode,
}: {
  mode: "login" | "signup";
}) {
  const isSignup = mode === "signup";
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-6">
      <div className="w-full max-w-md">
        <div className="mb-8 flex justify-center">
          <Logo />
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-xl shadow-slate-200/50">
          <h1 className="text-center text-2xl font-bold tracking-tight text-slate-900">
            {isSignup ? "Opret din gratis konto" : "Log ind på NordInvest"}
          </h1>
          <p className="mt-2 text-center text-sm text-slate-500">
            {isSignup
              ? "3 gratis analyser om måneden — intet kreditkort."
              : "Velkommen tilbage. Fortsæt med din konto."}
          </p>

          <div className="mt-8 space-y-3">
            <button className="flex w-full items-center justify-center gap-3 rounded-xl bg-[#0A66C2] px-4 py-3 text-sm font-medium text-white transition-opacity hover:opacity-90">
              <LinkedInIcon />
              Fortsæt med LinkedIn
            </button>
            <button className="flex w-full items-center justify-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-900 transition-colors hover:bg-slate-50">
              <GoogleIcon />
              Fortsæt med Google
            </button>
          </div>

          <p className="mt-6 text-center text-xs text-slate-400">
            Ved at fortsætte accepterer du vores{" "}
            <Link href="/juridisk/vilkaar" className="underline hover:text-slate-600">
              vilkår
            </Link>{" "}
            og{" "}
            <Link href="/juridisk/privatlivspolitik" className="underline hover:text-slate-600">
              privatlivspolitik
            </Link>
            .
          </p>
        </div>

        <p className="mt-6 text-center text-sm text-slate-500">
          {isSignup ? (
            <>
              Har du allerede en konto?{" "}
              <Link href="/auth/login" className="font-medium text-blue-600 hover:text-blue-700">
                Log ind
              </Link>
            </>
          ) : (
            <>
              Ny hos NordInvest?{" "}
              <Link href="/auth/signup" className="font-medium text-blue-600 hover:text-blue-700">
                Opret gratis
              </Link>
            </>
          )}
        </p>
      </div>
    </div>
  );
}
