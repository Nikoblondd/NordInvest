import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";

export function LegalLayout({
  title,
  updated,
  sections,
}: {
  title: string;
  updated: string;
  sections: { h: string; p: string[] }[];
}) {
  return (
    <main>
      <Nav />
      <article className="bg-cream-50 pt-32">
        <div className="container-x max-w-3xl pb-24">
          <h1 className="text-4xl md:text-5xl">{title}</h1>
          <p className="mt-3 text-sm text-stone-400">Senest opdateret: {updated}</p>
          <div className="mt-10 space-y-10">
            {sections.map((s) => (
              <section key={s.h}>
                <h2 className="text-xl text-stone-900">{s.h}</h2>
                <div className="mt-3 space-y-3 text-stone-600">
                  {s.p.map((para, i) => (
                    <p key={i}>{para}</p>
                  ))}
                </div>
              </section>
            ))}
          </div>
        </div>
      </article>
      <Footer />
    </main>
  );
}
