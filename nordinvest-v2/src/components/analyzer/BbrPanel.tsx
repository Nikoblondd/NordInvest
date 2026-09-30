import { BadgeCheck, Building2 } from "lucide-react";

export type BbrEnrich = {
  enriched: boolean;
  cached?: boolean;
  bfe?: string | null;
  betegnelse?: string | null;
  bbr?: {
    byggeaar?: number | null;
    ombygningsaar?: number | null;
    boligareal_m2?: number | null;
    enhedsareal_m2?: number | null;
    samletBygningsareal_m2?: number | null;
    antalVaerelser?: number | null;
    antalBadevaerelser?: number | null;
    antalToiletter?: number | null;
    opvarmning?: string | null;
    ydervaeg?: string | null;
    tag?: string | null;
    antalEtager?: number | null;
  } | null;
};

function Fact({ label, value }: { label: string; value: string | number | null | undefined }) {
  if (value == null || value === "") return null;
  return (
    <div className="min-w-0 rounded-xl bg-white/70 px-3 py-2">
      <div className="text-[13px] font-mediumr text-emerald-700/70">{label}</div>
      <div className="text-sm font-semibold text-slate-800 [overflow-wrap:anywhere]">{value}</div>
    </div>
  );
}

export function BbrPanel({ data }: { data: BbrEnrich }) {
  const b = data.bbr;
  if (!b) return null;
  // The unit's own area is `enhedsareal_m2`. `boligareal_m2` is the WHOLE
  // building's residential area (e.g. 11.735 m² across 84 flats) — showing that
  // as "Boligareal" for a single apartment looks broken, so prefer the enhed.
  const area = b.enhedsareal_m2 ?? b.boligareal_m2 ?? b.samletBygningsareal_m2;

  return (
    <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-5">
      <div className="flex items-center gap-2">
        <BadgeCheck size={18} className="text-emerald-600" />
        <span className="text-sm font-semibold text-emerald-900">
          Beriget med officielle bygningsdata fra BBR
        </span>
        {data.cached && <span className="text-xs text-emerald-600/70">· fra cache</span>}
        {data.bfe && <span className="ml-auto text-xs text-emerald-600/70">BFE {data.bfe}</span>}
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
        <Fact label="Byggeår" value={b.byggeaar} />
        <Fact label="Ombygget" value={b.ombygningsaar} />
        <Fact label="Boligareal" value={area ? `${area} m²` : null} />
        <Fact label="Værelser" value={b.antalVaerelser} />
        <Fact label="Badeværelser" value={b.antalBadevaerelser} />
        <Fact label="Toiletter" value={b.antalToiletter} />
        <Fact label="Etager" value={b.antalEtager} />
        <Fact label="Opvarmning" value={b.opvarmning} />
        <Fact label="Ydervæg" value={b.ydervaeg} />
        <Fact label="Tag" value={b.tag} />
      </div>
      {/* Proper CC BY 4.0 attribution: name the source, link the license.
          Datafordeler's terms + the CC BY 4.0 license both require this. */}
      <div className="mt-2 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-xs text-emerald-700/70">
        <Building2 size={12} className="shrink-0" />
        <span>
          Kilde: Bygnings- og Boligregistret (BBR) via{" "}
          <a
            href="https://datafordeler.dk"
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-2 hover:text-emerald-800"
          >
            Datafordeler
          </a>
          . Licens:{" "}
          <a
            href="https://creativecommons.org/licenses/by/4.0/deed.da"
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-2 hover:text-emerald-800"
          >
            CC BY 4.0
          </a>
          .
        </span>
      </div>
    </div>
  );
}
