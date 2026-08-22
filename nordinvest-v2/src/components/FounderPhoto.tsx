import fs from "node:fs";
import path from "node:path";
import { site } from "@/lib/site";

// Server component: renders your photo the moment you drop a file at
// nordinvest-v2/public/founder.{jpg,png,webp}. Until then, a branded placeholder.
function findPhoto(): string | null {
  const pub = path.join(process.cwd(), "public");
  for (const name of ["founder.jpg", "founder.png", "founder.webp"]) {
    if (fs.existsSync(path.join(pub, name))) return "/" + name;
  }
  return null;
}

export function FounderPhoto() {
  const photo = findPhoto();

  if (!photo) {
    return (
      <div className="grain flex aspect-[4/3] items-center justify-center bg-navy-900">
        <div className="text-center">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-gold-500 font-serif text-4xl text-navy-900">
            {site.founder.name.charAt(0)}
          </div>
          <p className="mt-4 text-xs text-cream-100/50">
            Læg et foto i public/founder.jpg
          </p>
        </div>
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={photo}
      alt={`${site.founder.name}, ${site.founder.role} hos NordInvest`}
      className="aspect-[4/3] w-full object-cover"
    />
  );
}
