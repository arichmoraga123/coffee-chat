import { Suspense } from "react";
import { requireUserId } from "@/lib/auth";
import { PitchBuilderView } from "@/components/pitch-builder-view";

export const dynamic = "force-dynamic";

export default async function PitchBuilderPage() {
  await requireUserId();
  return (
    <Suspense fallback={<p className="text-sm text-zinc-500">Loading…</p>}>
      <PitchBuilderView />
    </Suspense>
  );
}
