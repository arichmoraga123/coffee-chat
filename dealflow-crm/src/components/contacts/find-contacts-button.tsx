"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { LinkedInXRayModal } from "@/components/linkedin-xray-modal";

/** LinkedIn X-Ray search; people saved from it land in the outreach queue. */
export function FindContactsButton({ schoolName }: { schoolName: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="secondary" onClick={() => setOpen(true)}>
        Find contacts
      </Button>
      <LinkedInXRayModal
        open={open}
        onClose={() => setOpen(false)}
        schoolName={schoolName}
        onSaveToQueue={async (data) => {
          const res = await fetch("/api/contacts", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ fullName: data.fullName, firmName: data.firmName, title: data.title, source: "linkedin-search", inOutreachQueue: true }),
          });
          if (res.ok) {
            toast(`Saved ${data.fullName} to your outreach queue`);
            router.refresh();
          } else toast.error("Couldn't save that contact.");
        }}
      />
    </>
  );
}
