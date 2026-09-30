import { testimonials } from "@/lib/testimonials";

/** Quotes from users (lib/testimonials). Renders nothing until there are real ones. */
export function Testimonials({ className = "" }: { className?: string }) {
  if (testimonials.length === 0) return null;
  return (
    <section aria-labelledby="testimonials-h" className={className}>
      <div className="mx-auto max-w-[1080px] px-4 sm:px-6">
        <h2 id="testimonials-h" className="text-[28px] font-semibold tracking-[-0.02em] text-slate-900 sm:text-[36px]">
          Det siger investorerne
        </h2>
        <ul className="mt-8 grid gap-5 md:grid-cols-3">
          {testimonials.slice(0, 3).map((t) => (
            <li key={t.name + t.date}>
              <figure className="flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-6">
                <blockquote className="flex-1 text-[16px] leading-relaxed text-slate-800">“{t.quote}”</blockquote>
                <figcaption className="mt-5 text-[14px] text-slate-500">
                  <span className="font-semibold text-slate-900">{t.name}</span>
                  {t.role && <>, {t.role}</>}
                </figcaption>
              </figure>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
