"use client";

import { useRouter } from "next/navigation";

import { useEffect, useState } from "react";
import {
  DndContext,
  DragEndEvent,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
  useDraggable,
} from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { differenceInCalendarDays, format, parseISO, startOfDay } from "date-fns";
import { GripVertical } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  PIPELINE_STAGES,
  STAGE_LABELS,
  opportunityRoleBadge,
} from "@/lib/constants";
import {
  PipelineOpportunityDialog,
  type PipelineOppFormRow,
} from "@/components/pipeline-opportunity-dialog";
import { FirmTypeBadge } from "@/lib/firm-type";
import { cn } from "@/lib/utils";
import type { FirmType } from "@prisma/client";
import { Select } from "@/components/ui/select";
import { PageHeader } from "@/components/ui/page-header";
import { BulkActionBar, downloadCsv, useBulkSelection } from "@/components/ui/bulk";

export type PipelineOppClient = {
  id: string;
  stage: (typeof PIPELINE_STAGES)[number];
  role: string;
  firmId: string;
  firmName: string;
  firmType: FirmType | null;
  applicationDeadline: string | null;
  contactName: string;
  notes: string;
  linkedContactNames: string[];
  group?: string | null;
  location?: string | null;
  contacts?: { id: string; name: string }[];
};

function deadlineTone(iso: string | null): "muted" | "past" | "soon" | "future" {
  if (!iso) return "muted";
  const ds = startOfDay(parseISO(iso));
  const today = startOfDay(new Date());
  const diff = differenceInCalendarDays(ds, today);
  if (diff < 0) return "past";
  if (diff <= 14) return "soon";
  return "future";
}

function DroppableColumn({
  stage,
  children,
}: {
  stage: (typeof PIPELINE_STAGES)[number];
  children: React.ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: stage });
  return (
    <div
      ref={setNodeRef}
      className={cn(
        "min-h-56 rounded border border-border bg-surface p-2 transition-colors",
        isOver && "border-accent bg-accent-tint",
      )}
    >
      {children}
    </div>
  );
}

function DraggableCard({
  opp,
  onOpen,
  onMoveStage,
  selected,
  onSelect,
}: {
  opp: PipelineOppClient;
  onOpen: (o: PipelineOppClient) => void;
  onMoveStage: (id: string, stage: (typeof PIPELINE_STAGES)[number]) => void;
  selected: boolean;
  onSelect: (e: { shiftKey?: boolean }) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: opp.id,
  });
  const style = { transform: CSS.Translate.toString(transform) };

  const displayContact =
    opp.contactName.trim() || opp.linkedContactNames[0] || null;

  const tone = deadlineTone(opp.applicationDeadline);
  const deadlineLabel = opp.applicationDeadline
    ? format(parseISO(opp.applicationDeadline), "MMM d, yyyy")
    : "No deadline";

  return (
    <div ref={setNodeRef} style={style} className="touch-manipulation">
      <Card
        className={cn(
          "space-y-1.5 border-border-strong p-2 text-xs",
          isDragging && "opacity-60 ring-1 ring-accent",
          selected && "border-accent bg-accent-tint ring-1 ring-accent",
        )}
      >
        <div className="flex gap-1">
        <button
          type="button"
          className="mt-0.5 shrink-0 cursor-grab touch-none rounded p-0.5 text-ink-3 hover:bg-surface-2 hover:text-ink-2 active:cursor-grabbing"
          {...listeners}
          {...attributes}
          aria-label="Drag to move stage"
        >
          <GripVertical className="h-4 w-4" />
        </button>
        <button
          type="button"
          className="min-w-0 flex-1 text-left"
          aria-pressed={selected}
          onClick={(e) => {
            // Cmd/Ctrl-click (or Shift) selects cards for bulk changes; a plain click opens the card.
            if (e.metaKey || e.ctrlKey || e.shiftKey) {
              e.preventDefault();
              onSelect(e);
            } else onOpen(opp);
          }}
        >
          <div className="flex flex-wrap items-center gap-1.5">
            <p className="font-semibold leading-tight text-ink">{opp.firmName}</p>
            <FirmTypeBadge type={opp.firmType} className="text-[9px]" />
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            <span className="rounded border border-border bg-surface px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-accent">
              {opportunityRoleBadge(opp.role)}
            </span>
            <span
              className={cn(
                "text-[11px]",
                tone === "past" && "font-medium text-danger",
                tone === "soon" && "font-medium text-warn",
                tone === "future" && "text-ink-2",
                tone === "muted" && "text-ink-3",
              )}
            >
              {deadlineLabel}
            </span>
          </div>
          {displayContact && (
            <p className="mt-1 truncate text-[11px] text-ink-3">{displayContact}</p>
          )}
        </button>
        </div>
        <div className="pl-6" onPointerDown={(e) => e.stopPropagation()}>
        <label className="sr-only">Move to stage</label>
        <Select
          className="w-full"
          value=""
          aria-label="Move to stage"
          onChange={(e) => {
            const v = e.target.value as (typeof PIPELINE_STAGES)[number];
            if (v) onMoveStage(opp.id, v);
            e.target.value = "";
          }}
        >
          <option value="">Move to…</option>
          {PIPELINE_STAGES.filter((s) => s !== opp.stage).map((s) => (
            <option key={s} value={s}>
              {STAGE_LABELS[s]}
            </option>
          ))}
        </Select>
        </div>
      </Card>
    </div>
  );
}

export function PipelineBoard({
  initial,
  firms,
  customRoles = [],
  groups = [],
  locations = [],
}: {
  initial: PipelineOppClient[];
  firms: { id: string; name: string }[];
  customRoles?: string[];
  groups?: string[];
  locations?: string[];
}) {
  const [items, setItems] = useState(initial);
  const router = useRouter();
  const sel = useBulkSelection(items.map((i) => i.id));
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<PipelineOppFormRow | null>(null);

  const serverSnapshot = JSON.stringify(
    initial.map((o) => ({
      id: o.id,
      stage: o.stage,
      firmId: o.firmId,
      firmName: o.firmName,
      firmType: o.firmType,
      role: o.role,
      applicationDeadline: o.applicationDeadline,
      contactName: o.contactName,
      notes: o.notes,
      linkedContactNames: o.linkedContactNames,
    })),
  );

  useEffect(() => {
    setItems(initial);
  }, [serverSnapshot]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  );

  const moveOpportunity = async (
    id: string,
    stage: (typeof PIPELINE_STAGES)[number],
  ) => {
    const before = items.find((i) => i.id === id)?.stage;
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, stage } : i)));
    const res = await fetch(`/api/opportunities/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stage }),
    });
    if (!res.ok && before !== undefined) {
      setItems((prev) => prev.map((i) => (i.id === id ? { ...i, stage: before } : i)));
    }
  };

  const resolveTargetStage = (
    activeId: string,
    overId: string | undefined,
  ): (typeof PIPELINE_STAGES)[number] | null => {
    if (!overId) return null;
    if (PIPELINE_STAGES.includes(overId as (typeof PIPELINE_STAGES)[number])) {
      return overId as (typeof PIPELINE_STAGES)[number];
    }
    return items.find((i) => i.id === overId)?.stage ?? null;
  };

  const onDragEnd = (event: DragEndEvent) => {
    const activeId = String(event.active.id);
    const overId = event.over?.id != null ? String(event.over.id) : undefined;
    const target = resolveTargetStage(activeId, overId);
    if (!target) return;
    const current = items.find((i) => i.id === activeId);
    if (!current || current.stage === target) return;
    void moveOpportunity(activeId, target);
  };

  const openAdd = () => {
    setEditing(null);
    setDialogOpen(true);
  };

  const openEdit = (o: PipelineOppClient) => {
    setEditing({
      id: o.id,
      stage: o.stage,
      role: o.role,
      firmId: o.firmId,
      firmName: o.firmName,
      firmType: o.firmType,
      applicationDeadline: o.applicationDeadline,
      contactName: o.contactName,
      notes: o.notes,
      group: o.group,
      location: o.location,
      contacts: o.contacts,
    });
    setDialogOpen(true);
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title="Pipeline"
        subtitle="Drag cards between stages. Cmd/Ctrl-click cards to select several and change them together."
        actions={
          <Button variant="primary" onClick={openAdd}>
            Add opportunity
          </Button>
        }
      />

      <DndContext sensors={sensors} onDragEnd={onDragEnd}>
        <div className="grid gap-3 md:grid-cols-4 xl:grid-cols-8">
          {PIPELINE_STAGES.map((stage) => (
            <DroppableColumn key={stage} stage={stage}>
              <p className="mb-2 text-xs font-semibold uppercase text-ink-2">
                {STAGE_LABELS[stage]}
              </p>
              <div className="space-y-2">
                {items
                  .filter((i) => i.stage === stage)
                  .map((o) => (
                    <DraggableCard
                      key={o.id}
                      opp={o}
                      onOpen={openEdit}
                      onMoveStage={(id, s) => void moveOpportunity(id, s)}
                      selected={sel.has(o.id)}
                      onSelect={(e) => sel.toggle(o.id, e)}
                    />
                  ))}
              </div>
            </DroppableColumn>
          ))}
        </div>
      </DndContext>

      <BulkActionBar
        entity="opportunities"
        noun={["opportunity", "opportunities"]}
        sel={sel}
        fields={[
          { key: "stage", label: "Stage", type: "select", options: PIPELINE_STAGES.map((st) => ({ value: st, label: STAGE_LABELS[st] })) },
          { key: "priority", label: "Priority", type: "select", options: [{ value: "HIGH", label: "High" }, { value: "MEDIUM", label: "Medium" }, { value: "LOW", label: "Low" }] },
          { key: "role", label: "Role", type: "text" },
          { key: "applicationDeadline", label: "Deadline", type: "date" },
          { key: "group", label: "Group", type: "text" },
          { key: "location", label: "Location", type: "text" },
          { key: "firmId", label: "Firm", type: "select", endpoint: "/api/search/firms" },
        ]}
        actions={[
          { key: "export", label: "Export CSV", client: (ids) => downloadCsv("pipeline.csv", ["Firm", "Role", "Stage", "Deadline", "Group", "Location", "Contact"], items.filter((i) => ids.includes(i.id)).map((i) => [i.firmName, i.role, STAGE_LABELS[i.stage], i.applicationDeadline, i.group, i.location, i.contactName])) },
          { key: "delete", label: "Delete", danger: true },
        ]}
        onChange={() => router.refresh()}
      />
      <PipelineOpportunityDialog
        open={dialogOpen}
        onClose={() => {
          setDialogOpen(false);
          setEditing(null);
        }}
        firms={firms}
        editing={editing}
        customRoles={customRoles}
        groups={groups}
        locations={locations}
      />
    </div>
  );
}
