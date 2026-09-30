"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { AnimatePresence } from "framer-motion";
import { SuccessCelebration } from "@/components/SuccessCelebration";

/**
 * Shows the celebration once when the user lands on /dashboard?welcome=1
 * (fresh login or finished signup), then strips the flag from the URL so a
 * refresh doesn't replay it.
 */
export function WelcomeCelebration({ firstName }: { firstName?: string }) {
  const params = useSearchParams();
  const [show, setShow] = useState(() => params.get("welcome") === "1");

  return (
    <AnimatePresence>
      {show && (
        <SuccessCelebration
          title={firstName ? `Velkommen, ${firstName}!` : "Du er logget ind!"}
          subtitle="Din portefølje er klar."
          onDone={() => {
            setShow(false);
            window.history.replaceState(null, "", "/dashboard");
          }}
        />
      )}
    </AnimatePresence>
  );
}
