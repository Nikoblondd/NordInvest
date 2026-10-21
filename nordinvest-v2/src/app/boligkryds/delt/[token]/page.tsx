import type { Metadata } from "next";
import { readDoc, readStore } from "@/lib/app/store";
import type { BuyerState } from "@/lib/buyer/state";
import { SharedList } from "@/components/buyer/SharedList";
import { BoligkrydsLogo } from "@/components/buyer/Brand";

export const dynamic = "force-dynamic";

type Share = { owner: string; name?: string | null; revoked?: boolean };

export async function generateMetadata({ params }: { params: { token: string } }): Promise<Metadata> {
  const s = /^[A-Za-z0-9_-]{6,30}$/.test(params.token) ? await readDoc<Share>(`boligkryds-share/${params.token}`) : null;
  const who = s?.name ? `${s.name}s` : "En";
  return { title: `${who} boliger`, description: "En liste over boliger til salg, delt fra Boligkryds." };
}

/** A shared list: the owner's saved homes and searched places, as they are now. No login needed. */
export default async function SharedPage({ params }: { params: { token: string } }) {
  const share = /^[A-Za-z0-9_-]{6,30}$/.test(params.token) ? await readDoc<Share>(`boligkryds-share/${params.token}`) : null;
  const [state] = share && !share.revoked ? await readStore<BuyerState>("boligkoeb", share.owner) : [];
  if (!share || share.revoked || !state || state.shareToken !== params.token) {
    return (
      <main className="flex min-h-[100dvh] items-center justify-center bg-[#f4f6f9] px-4">
        <div className="max-w-[400px] rounded-3xl bg-white p-8 text-center ring-1 ring-slate-200">
          <div className="flex justify-center"><BoligkrydsLogo /></div>
          <h1 className="mt-6 text-[22px] font-semibold">Listen er ikke delt længere</h1>
          <p className="mt-2 text-[15px] text-slate-600">Den, der delte den, har slået deling fra.</p>
          <a href="/" className="mt-6 inline-flex min-h-[48px] w-full items-center justify-center rounded-full bg-emerald-600 text-[16px] font-semibold text-white">Se alle boliger til salg</a>
        </div>
      </main>
    );
  }
  return (
    <SharedList
      name={share.name ?? null}
      saved={state.saved.filter((s) => !s.gone).map((s) => ({ id: s.id, stage: s.stage ?? null, price: s.price }))}
      areas={state.areas ?? []}
      view={state.view}
    />
  );
}
