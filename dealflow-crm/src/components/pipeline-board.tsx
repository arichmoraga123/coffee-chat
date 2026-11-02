"use client";

import { useRouter } from "next/navigation";

import { useCallback, useEffect, useRef, useState } from "react";
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
import Link from "next/link";
import { GripVertical, MoreHorizontal } from "lucide-react";
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
import { SegmentedControl } from "@/components/ui/segmented-control";
import { DataTable, Td, Th } from "@/components/ui/data-table";
import { PageHeader } from "@/components/ui/page-header";
import { BulkActionBar, InlineEdit, SelectCheckbox, bulkRequest, downloadCsv, useBulkSelection } from "@/components/ui/bulk";

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

type Stage = (typeof PIPELINE_STAGES)[number];

function DroppableColumn({
  stage,
  count,
  collapsed,
  children,
}: {
  stage: Stage;
  count: number;
  collapsed: boolean;
  children: React.ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: stage });
  // Empty stages shrink to a 48px strip and open up while a card is dragged over them.
  if (collapsed && !isOver) {
    return (
      <div
        ref={setNodeRef}
        className="flex w-12 shrink-0 justify-center rounded-[var(--radius-lg)] border border-dashed border-border bg-surface py-3"
        title={`${STAGE_LABELS[stage]} · empty`}
      >
        <span className="text-xs font-semibold uppercase tracking-wide text-ink-3 [writing-mode:vertical-rl]">{STAGE_LABELS[stage]}</span>
      </div>
    );
  }
  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex w-[280px] shrink-0 flex-col rounded-[var(--radius-lg)] border border-border bg-surface transition-colors",
        isOver && "border-accent bg-accent-tint",
      )}
    >
      <div className="sticky top-0 z-10 rounded-t-[var(--radius-lg)] border-b border-divider bg-inherit px-3.5 py-2.5">
        <p className="text-xs font-semibold uppercase tracking-wide text-ink-2">
          {STAGE_LABELS[stage]} <span className="font-normal text-ink-3">· {count}</span>
        </p>
      </div>
      <div className="flex min-h-40 flex-col gap-2.5 p-2.5">{children}</div>
    </div>
  );
}

function deadlineText(iso: string | null): string {
  if (!iso) return "No deadline";
  const d = startOfDay(parseISO(iso));
  const diff = differenceInCalendarDays(d, startOfDay(new Date()));
  const rel = diff === 0 ? "today" : diff === 1 ? "tomorrow" : diff > 0 ? `in ${diff} days` : diff === -1 ? "yesterday" : `${-diff} days ago`;
  return `Deadline ${format(d, "MMM d")} · ${rel}`;
}

function CardMenu({
  opp,
  onMoveStage,
  onEdit,
  onDelete,
}: {
  opp: PipelineOppClient;
  onMoveStage: (id: string, stage: Stage) => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", esc);
    };
  }, [open]);
  const item = "block w-full px-3 py-1.5 text-left text-sm text-ink-2 hover:bg-surface-2 hover:text-ink";
  return (
    <div ref={ref} className="relative" onPointerDown={(e) => e.stopPropagation()}>
      <button
        type="button"
        aria-label={`Actions for ${opp.firmName}`}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={(e) => {
          e.stopPropagation();
          setOpen((o) => !o);
        }}
        className="flex h-7 w-7 items-center justify-center rounded-[var(--radius)] text-ink-3 hover:bg-surface-2 hover:text-ink"
      >
        <MoreHorizontal className="h-4 w-4" />
      </button>
      {open ? (
        <div role="menu" className="absolute right-0 top-full z-30 mt-1 w-48 rounded-[var(--radius)] border border-border bg-surface py-1 shadow-lg" onClick={(e) => e.stopPropagation()}>
          <p className="px-3 pb-1 pt-1.5 text-[11px] font-semibold uppercase tracking-wide text-ink-3">Move to</p>
          {PIPELINE_STAGES.filter((st) => st !== opp.stage).map((st) => (
            <button key={st} type="button" role="menuitem" className={item} onClick={() => (setOpen(false), onMoveStage(opp.id, st))}>
              {STAGE_LABELS[st]}
            </button>
          ))}
          <div className="my-1 border-t border-divider" />
          <button type="button" role="menuitem" className={item} onClick={() => (setOpen(false), onEdit())}>
            Edit
          </button>
          <button type="button" role="menuitem" className={cn(item, "text-danger hover:text-danger")} onClick={() => (setOpen(false), onDelete())}>
            Delete
          </button>
        </div>
      ) : null}
    </div>
  );
}

function DraggableCard({
  opp,
  onOpen,
  onMoveStage,
  onDelete,
  selected,
  onSelect,
}: {
  opp: PipelineOppClient;
  onOpen: (o: PipelineOppClient) => void;
  onMoveStage: (id: string, stage: Stage) => void;
  onDelete: (o: PipelineOppClient) => void;
  selected: boolean;
  onSelect: (e: { shiftKey?: boolean }) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: opp.id });
  const style = { transform: CSS.Translate.toString(transform) };
  const names = [...new Set([opp.contactName.trim(), ...opp.linkedContactNames].filter(Boolean))];
  const tone = deadlineTone(opp.applicationDeadline);
  const showTrack = opp.firmType && opp.firmType !== "OTHER";

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      aria-label={`${opp.firmName}, ${STAGE_LABELS[opp.stage]}. Drag to move.`}
      onClick={(e) => {
        // Cmd/Ctrl-click (or Shift) selects cards for bulk changes; a plain click opens the card.
        if (e.metaKey || e.ctrlKey || e.shiftKey) onSelect(e);
        else onOpen(opp);
      }}
      className={cn(
        "group relative cursor-grab touch-manipulation rounded-[var(--radius)] border border-border-strong bg-surface p-3.5 text-left active:cursor-grabbing",
        isDragging && "z-20 opacity-70 shadow-lg ring-1 ring-accent",
        selected && "border-accent bg-accent-tint ring-1 ring-accent",
      )}
    >
      <GripVertical className="pointer-events-none absolute left-0.5 top-4 h-3.5 w-3.5 text-ink-3 opacity-0 transition-opacity group-hover:opacity-100" aria-hidden />
      <div className="flex items-start gap-2">
        <p className="min-w-0 flex-1 break-words text-sm font-semibold leading-snug text-ink">{opp.firmName}</p>
        <div className="-mr-1.5 -mt-1 shrink-0">
          <CardMenu opp={opp} onMoveStage={onMoveStage} onEdit={() => onOpen(opp)} onDelete={() => onDelete(opp)} />
        </div>
      </div>
      <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
        <span className="rounded border border-border bg-surface px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-accent">
          {opportunityRoleBadge(opp.role)}
        </span>
        {showTrack ? <FirmTypeBadge type={opp.firmType} className="text-[10px]" /> : null}
      </div>
      <p
        className={cn(
          "mt-1.5 text-xs",
          tone === "past" && "font-medium text-danger",
          tone === "soon" && "font-medium text-warn",
          tone === "future" && "text-ink-2",
          tone === "muted" && "text-ink-3",
        )}
      >
        {deadlineText(opp.applicationDeadline)}
      </p>
      {names.length ? (
        <ul className="mt-1.5 space-y-0.5 text-xs text-ink-2">
          {names.slice(0, 2).map((n) => (
            <li key={n} className="break-words">
              {n}
            </li>
          ))}
          {names.length > 2 ? <li className="text-ink-3">+{names.length - 2} more</li> : null}
        </ul>
      ) : null}
    </div>
  );
}

function BoardScroller({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [edges, setEdges] = useState({ left: false, right: false });
  const measure = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    setEdges({ left: el.scrollLeft > 1, right: el.scrollLeft + el.clientWidth < el.scrollWidth - 1 });
  }, []);
  useEffect(() => {
    measure();
    const el = ref.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    if (el.firstElementChild) ro.observe(el.firstElementChild);
    return () => ro.disconnect();
  }, [measure]);
  return (
    <div className="relative">
      <div ref={ref} onScroll={measure} className="overflow-x-auto pb-2">
        {children}
      </div>
      {edges.left ? <div className="pointer-events-none absolute inset-y-0 left-0 w-8 bg-linear-to-r from-bg to-transparent" /> : null}
      {edges.right ? <div className="pointer-events-none absolute inset-y-0 right-0 w-8 bg-linear-to-l from-bg to-transparent" /> : null}
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
  const [view, setView] = useState<"board" | "table">("board");
  const [hideEmpty, setHideEmpty] = useState(true);

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

  const deleteOpp = (o: PipelineOppClient) => {
    if (!window.confirm(`Delete ${o.firmName} from your pipeline?`)) return;
    void bulkRequest(
      { entity: "opportunities", ids: [o.id], op: "action", action: "delete" },
      {
        success: () => `Deleted ${o.firmName}`,
        onChange: () => {
          setItems((prev) => prev.filter((i) => i.id !== o.id));
          router.refresh();
        },
      },
    );
  };

  const patchLocal = (id: string, patch: Partial<PipelineOppClient>) =>
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, ...patch } : i)));

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

      <div className="flex flex-wrap items-center justify-between gap-3">
        <SegmentedControl
          ariaLabel="View"
          value={view}
          onChange={setView}
          options={[
            { value: "board", label: "Board" },
            { value: "table", label: "Table" },
          ]}
        />
        {view === "board" ? (
          <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-ink-2">
            <input type="checkbox" className="h-4 w-4 accent-[var(--color-accent)]" checked={hideEmpty} onChange={(e) => setHideEmpty(e.target.checked)} />
            Hide empty stages
          </label>
        ) : null}
      </div>

      {view === "board" ? (
        <DndContext id="pipeline-board" sensors={sensors} onDragEnd={onDragEnd}>
          <BoardScroller>
            <div className="flex items-start gap-3">
              {PIPELINE_STAGES.map((stage) => {
                const cards = items.filter((i) => i.stage === stage);
                return (
                  <DroppableColumn key={stage} stage={stage} count={cards.length} collapsed={hideEmpty && cards.length === 0}>
                    {cards.map((o) => (
                      <DraggableCard
                        key={o.id}
                        opp={o}
                        onOpen={openEdit}
                        onMoveStage={(id, st) => void moveOpportunity(id, st)}
                        onDelete={deleteOpp}
                        selected={sel.has(o.id)}
                        onSelect={(e) => sel.toggle(o.id, e)}
                      />
                    ))}
                  </DroppableColumn>
                );
              })}
            </div>
          </BoardScroller>
        </DndContext>
      ) : (
        <DataTable minWidth={880}>
          <thead>
            <tr>
              <Th className="w-10">
                <SelectCheckbox checked={sel.pageAllSelected} onToggle={() => sel.togglePage()} label="Select all" />
              </Th>
              <Th>Firm</Th>
              <Th>Role</Th>
              <Th>Stage</Th>
              <Th>Deadline</Th>
              <Th>Contacts</Th>
              <Th className="w-12" />
            </tr>
          </thead>
          <tbody>
            {items.map((o) => {
              const names = [...new Set([o.contactName.trim(), ...o.linkedContactNames].filter(Boolean))];
              return (
                <tr key={o.id} className={cn(sel.has(o.id) && "bg-accent-tint")}>
                  <Td>
                    <SelectCheckbox checked={sel.has(o.id)} onToggle={(e) => sel.toggle(o.id, e)} label={`Select ${o.firmName}`} />
                  </Td>
                  <Td className="font-medium">
                    <Link href={`/firms/${o.firmId}`} className="hover:underline">
                      {o.firmName}
                    </Link>
                  </Td>
                  <Td>
                    <InlineEdit entity="opportunities" id={o.id} field="role" value={o.role} ariaLabel={`role for ${o.firmName}`} onSaved={(v) => patchLocal(o.id, { role: v })} />
                  </Td>
                  <Td>
                    <InlineEdit
                      entity="opportunities"
                      id={o.id}
                      field="stage"
                      type="select"
                      options={PIPELINE_STAGES.map((st) => ({ value: st, label: STAGE_LABELS[st] }))}
                      value={o.stage}
                      display={STAGE_LABELS[o.stage]}
                      ariaLabel={`stage for ${o.firmName}`}
                      onSaved={(v) => patchLocal(o.id, { stage: v as Stage })}
                    />
                  </Td>
                  <Td>
                    <InlineEdit
                      entity="opportunities"
                      id={o.id}
                      field="applicationDeadline"
                      type="date"
                      value={o.applicationDeadline?.slice(0, 10) ?? ""}
                      display={o.applicationDeadline ? format(parseISO(o.applicationDeadline), "MMM d, yyyy") : "—"}
                      ariaLabel={`deadline for ${o.firmName}`}
                      onSaved={(v) => patchLocal(o.id, { applicationDeadline: v || null })}
                    />
                  </Td>
                  <Td className="text-ink-2">{names.length ? names.slice(0, 2).join(", ") + (names.length > 2 ? ` +${names.length - 2}` : "") : "—"}</Td>
                  <Td>
                    <CardMenu opp={o} onMoveStage={(id, st) => void moveOpportunity(id, st)} onEdit={() => openEdit(o)} onDelete={() => deleteOpp(o)} />
                  </Td>
                </tr>
              );
            })}
            {!items.length ? (
              <tr>
                <Td colSpan={7} className="py-8 text-center text-ink-3">
                  No opportunities yet.
                </Td>
              </tr>
            ) : null}
          </tbody>
        </DataTable>
      )}

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
