/* Shown inside the shell the moment a menu item is clicked, while the page loads. */
export default function Loading() {
  return (
    <div className="mx-auto max-w-[1400px] px-4 py-6 sm:px-6 sm:py-8 lg:px-8" aria-busy="true" aria-label="Indlæser">
      <div className="skeleton h-4 w-32" />
      <div className="skeleton mt-3 h-8 w-64" />
      <div className="mt-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => <div key={i} className="skeleton h-24" />)}
      </div>
      <div className="mt-6 grid gap-5 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <div className="skeleton h-72" />
        <div className="skeleton h-72" />
      </div>
    </div>
  );
}
