"use client";

import { useEffect, useState } from "react";
import { DealsOptIn } from "@/components/account/DealsOptIn";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { PhoneInput } from "@/components/ui/PhoneInput";

export default function VelkommenPage() {
  const router = useRouter();
  const supabase = createClient();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [ready, setReady] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        router.replace("/auth/login");
        return;
      }
      setEmail(user.email ?? "");
      setName((user.user_metadata?.full_name as string) ?? "");
      setPhone((user.user_metadata?.phone as string) ?? "");
      setReady(true);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase) return;
    setSaving(true);
    setError(null);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return router.replace("/auth/login");
    const { error } = await supabase
      .from("profiles")
      .update({ full_name: name, phone })
      .eq("id", user.id);
    if (error) {
      setError(error.message);
      setSaving(false);
    } else {
      router.push("/dashboard?welcome=1");
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-6 py-16">
      <div className="w-full max-w-md">
        <h1 className="text-center text-2xl font-bold tracking-tight text-slate-900">
          Næsten klar 👋
        </h1>
        <p className="mt-2 text-center text-sm text-slate-500">
          Bekræft dine oplysninger, så er din profil oprettet.
        </p>

        <form
          onSubmit={save}
          className="mt-8 space-y-4 rounded-3xl border border-slate-200 bg-white p-8 shadow-xl shadow-slate-200/50"
        >
          {!ready ? (
            <div className="flex justify-center py-8 text-slate-400">
              <Loader2 className="animate-spin" />
            </div>
          ) : (
            <>
              {error && (
                <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                  {error}
                </div>
              )}
              <label className="block">
                <span className="text-sm font-medium text-slate-600">Fulde navn</span>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3.5 py-2.5 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </label>
              <label className="block">
                <span className="text-sm font-medium text-slate-600">Telefonnummer</span>
                <div className="mt-1">
                  <PhoneInput value={phone} onChange={setPhone} required />
                </div>
              </label>
              <label className="block">
                <span className="text-sm font-medium text-slate-600">Email</span>
                <input
                  value={email}
                  disabled
                  className="mt-1 w-full cursor-not-allowed rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-slate-500"
                />
              </label>
              <DealsOptIn compact />
              <button
                type="submit"
                disabled={saving}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-btn ring-1 ring-inset ring-white/10 hover:bg-blue-700 disabled:opacity-60"
              >
                {saving && <Loader2 size={18} className="animate-spin" />}
                Gå til dashboard
              </button>
              <p className="text-center text-xs text-slate-500">
                Vi bruger dine oplysninger til at oprette og drive din konto. Læs mere i vores{" "}
                <a href="/juridisk/privatlivspolitik" className="underline hover:text-slate-700">
                  privatlivspolitik
                </a>
                .
              </p>
            </>
          )}
        </form>
      </div>
    </div>
  );
}
