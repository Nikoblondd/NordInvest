/* Public pages that are built on request (Deal-motor, market pages) show this while they load. */
export default function Loading() {
  return (
    <div className="min-h-[100dvh] bg-white" aria-busy="true" aria-label="Indlæser">
      <div className="h-16 border-b border-slate-100" />
      <div className="mx-auto max-w-[1180px] px-4 pt-10 sm:px-6 lg:px-8">
        <div className="skeleton h-4 w-40" />
        <div className="skeleton mt-4 h-10 w-full max-w-[560px]" />
        <div className="skeleton mt-3 h-5 w-full max-w-[420px]" />
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2, 3, 4, 5].map((i) => <div key={i} className="skeleton h-48" />)}
        </div>
      </div>
    </div>
  );
}
