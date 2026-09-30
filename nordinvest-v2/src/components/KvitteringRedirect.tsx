"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

// After a successful payment the customer lands on /kvittering. Give the Stripe
// webhook a couple of seconds to upgrade the account, then send them straight to
// their dashboard so they see the active subscription without doing anything.
export function KvitteringRedirect({ seconds = 4 }: { seconds?: number }) {
  const router = useRouter();
  const [left, setLeft] = useState(seconds);

  useEffect(() => {
    const tick = setInterval(() => setLeft((n) => Math.max(0, n - 1)), 1000);
    const go = setTimeout(() => router.push("/dashboard?welcome=1"), seconds * 1000);
    return () => {
      clearInterval(tick);
      clearTimeout(go);
    };
  }, [router, seconds]);

  return (
    <p className="mt-6 text-sm text-slate-400">
      Sender dig til dit dashboard{left > 0 ? ` om ${left}…` : "…"}
    </p>
  );
}
