"use client";

import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { interactionTypeLabel } from "@/lib/interaction-labels";
import { cn } from "@/lib/utils";

export type TimelineInteraction = {
  id: string;
  date: string;
  type: string;
  notes: string | null;
  adviceGiven: string | null;
  actionItems: string[];
  actionItemsChecked: number[];
  personalDetails: string | null;
  firmInsights: string | null;
  redFlags: string | null;
};

export function ContactInteractionTimeline({
  interactions,
  onDraftFollowUp,
}: {
  interactions: TimelineInteraction[];
  onDraftFollowUp: (interactionId: string) => void;
}) {
  const router = useRouter();

  const toggleActionItem = async (interactionId: string, index: number, checked: boolean) => {
    const row = interactions.find((i) => i.id === interactionId);
    if (!row) return;
    const set = new Set(row.actionItemsChecked);
    if (checked) set.add(index);
    else set.delete(index);
    const next = [...set].sort((a, b) => a - b);
    await fetch(`/api/interactions/${interactionId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ actionItemsChecked: next }),
    });
    router.refresh();
  };

  if (interactions.length === 0) {
    return (
      <Card className="border-zinc-800 bg-zinc-900/50 p-6 text-center text-sm text-zinc-500">
        No interactions logged yet. Use &quot;Log interaction&quot; to add one.
      </Card>
    );
  }

  return (
    <div className="relative pl-4">
      <div className="absolute bottom-0 left-[7px] top-2 w-px bg-zinc-700" aria-hidden />
      <ul className="space-y-6">
        {interactions.map((i) => (
          <li key={i.id} className="relative">
            <span
              className="absolute left-[-9px] top-1.5 h-3 w-3 rounded-full border-2 border-[#4a6fa5] bg-[#0a0a0a]"
              aria-hidden
            />
            <Card className="border-zinc-800 bg-zinc-900/60 p-4 text-sm">
              <div className="flex flex-wrap items-start justify-between gap-2 border-b border-zinc-800/80 pb-2">
                <div>
                  <p className="font-medium text-zinc-100">
                    {new Date(i.date).toLocaleDateString(undefined, {
                      weekday: "short",
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </p>
                  <span className="mt-1 inline-block rounded border border-[#2a2a2a] bg-[#161616] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#c9a84c]">
                    {interactionTypeLabel(i.type)}
                  </span>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="shrink-0"
                  onClick={() => onDraftFollowUp(i.id)}
                >
                  Draft follow-up email
                </Button>
              </div>

              <div className="mt-3 space-y-3 text-zinc-300">
                {i.notes ? (
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">Discussed</p>
                    <p className="whitespace-pre-wrap text-zinc-200">{i.notes}</p>
                  </div>
                ) : null}
                {i.adviceGiven ? (
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">Advice given</p>
                    <p className="whitespace-pre-wrap text-amber-100/90">{i.adviceGiven}</p>
                  </div>
                ) : null}
                {i.actionItems.length > 0 ? (
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">Action items</p>
                    <ul className="mt-1 space-y-1.5">
                      {i.actionItems.map((item, idx) => {
                        const checked = i.actionItemsChecked.includes(idx);
                        return (
                          <li key={idx} className="flex items-start gap-2">
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={(e) =>
                                void toggleActionItem(i.id, idx, e.target.checked)
                              }
                              className="mt-1 h-3.5 w-3.5 shrink-0 rounded border-zinc-600"
                            />
                            <span className={cn(checked && "text-zinc-500 line-through")}>{item}</span>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                ) : null}
                {i.personalDetails ? (
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
                      Personal details
                    </p>
                    <p className="whitespace-pre-wrap text-zinc-200">{i.personalDetails}</p>
                  </div>
                ) : null}
                {i.firmInsights ? (
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">Firm insights</p>
                    <p className="whitespace-pre-wrap text-zinc-200">{i.firmInsights}</p>
                  </div>
                ) : null}
                {i.redFlags ? (
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-red-400/80">Red flags</p>
                    <p className="whitespace-pre-wrap text-red-200/90">{i.redFlags}</p>
                  </div>
                ) : null}
              </div>
            </Card>
          </li>
        ))}
      </ul>
    </div>
  );
}
