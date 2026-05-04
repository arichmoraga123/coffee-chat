"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { PIPELINE_STAGES, STAGE_LABELS } from "@/lib/constants";

type Opp = {
  id: string;
  stage: (typeof PIPELINE_STAGES)[number];
  role: string;
  priority: string;
  firmName: string;
  contacts: string[];
};

export function PipelineBoard({ initial }: { initial: Opp[] }) {
  const [items, setItems] = useState(initial);
  const [activeId, setActiveId] = useState<string | null>(null);

  const moveOpportunity = async (
    id: string,
    stage: (typeof PIPELINE_STAGES)[number],
  ) => {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, stage } : i)));
    await fetch(`/api/opportunities/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stage }),
    });
  };

  return (
    <div className="grid gap-3 md:grid-cols-4 xl:grid-cols-8">
      {PIPELINE_STAGES.map((stage) => (
        <div
          key={stage}
          className="min-h-56 rounded border border-zinc-800 bg-zinc-900/40 p-2"
          onDragOver={(e) => e.preventDefault()}
          onDrop={() => {
            if (activeId) void moveOpportunity(activeId, stage);
            setActiveId(null);
          }}
        >
          <p className="mb-2 text-xs font-semibold uppercase text-zinc-400">
            {STAGE_LABELS[stage]}
          </p>
          <div className="space-y-2">
            {items.filter((i) => i.stage === stage).map((o) => (
              <Card
                key={o.id}
                className="cursor-grab p-2 text-xs"
                draggable
                onDragStart={() => setActiveId(o.id)}
              >
                <p className="font-semibold text-zinc-200">{o.firmName}</p>
                <p>{o.role}</p>
                <p className="text-zinc-400">
                  {o.priority} | {o.contacts.join(", ")}
                </p>
              </Card>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
