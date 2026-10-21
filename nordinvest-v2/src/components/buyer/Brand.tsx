/** Boligkryds: a house with a tick ("sæt kryds"). Its own mark, nothing from NordInvest. */
export function BoligkrydsMark({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
      <rect width="32" height="32" rx="9" fill="#059669" />
      <path d="M8 15.2 16 8.5l8 6.7V24a1.2 1.2 0 0 1-1.2 1.2H9.2A1.2 1.2 0 0 1 8 24z" fill="none" stroke="#fff" strokeWidth="2" strokeLinejoin="round" />
      <path d="m12.6 18.4 2.4 2.4 4.6-4.8" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function BoligkrydsLogo({ size = 30 }: { size?: number }) {
  return (
    <span className="inline-flex items-center gap-2">
      <BoligkrydsMark size={size} />
      <span className="text-[18px] font-semibold tracking-[-0.02em] text-slate-900">Boligkryds</span>
    </span>
  );
}
