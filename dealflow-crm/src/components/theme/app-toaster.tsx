"use client";

import { useEffect, useState } from "react";
import { Toaster } from "sonner";

/** Plain-text toasts: bottom-right on desktop, top on phones, 4 seconds. */
export function AppToaster() {
  const [mobile, setMobile] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const on = () => setMobile(mq.matches);
    on();
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  return (
    <Toaster
      position={mobile ? "top-center" : "bottom-right"}
      duration={4000}
      toastOptions={{
        unstyled: false,
        style: {
          background: "var(--surface)",
          color: "var(--ink)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius)",
          boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
          fontSize: "14px",
        },
      }}
    />
  );
}
