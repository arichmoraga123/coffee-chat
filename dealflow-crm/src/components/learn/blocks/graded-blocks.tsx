"use client";

import { useMemo, useState } from "react";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { BlockOf } from "@/lib/learn/schema";
import { gradeCalc, gradeFillBlank, gradeMcq, gradeOrder, seededShuffle } from "@/lib/learn/grading";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Markdown } from "../markdown";
import { useLesson } from "../lesson-context";

/** 16px+ font so iOS doesn't zoom the page when an input is focused. */
const INPUT = "rounded-md border bg-zinc-950 px-2 py-1 text-base text-zinc-50 outline-none focus:ring-2 focus:ring-[#4a6fa5]/60";

function Status({ correct, revealed }: { correct?: boolean; revealed?: boolean }) {
  if (correct) return <p className="text-sm font-semibold text-emerald-400">Correct ✓</p>;
  if (revealed) return <p className="text-sm font-semibold text-amber-300">Answer shown — no XP, but it still counts toward finishing.</p>;
  return null;
}

function firstAnswer(blank: BlockOf<"fillBlank">["blanks"][string]): string {
  if (typeof blank.numeric === "number") return String(blank.numeric);
  return blank.accept?.[0] ?? "";
}

/* ───────────────────────── fillBlank ───────────────────────── */

export function FillBlankView({ block }: { block: BlockOf<"fillBlank"> }) {
  const { state, send } = useLesson();
  const saved = state(block.id);
  const keys = Object.keys(block.blanks);
  const [values, setValues] = useState<Record<string, string>>(() =>
    saved.done ? Object.fromEntries(keys.map((k) => [k, firstAnswer(block.blanks[k])])) : {},
  );
  const [results, setResults] = useState<Record<string, boolean> | null>(
    saved.done ? Object.fromEntries(keys.map((k) => [k, true])) : null,
  );
  const [busy, setBusy] = useState(false);
  const attempts = saved.attempts ?? 0;
  const done = Boolean(saved.done);

  const segments = useMemo(() => block.template.split(/(\{\{\w+\}\})/g), [block.template]);

  const check = async () => {
    const local = gradeFillBlank(block, values);
    setResults(local.results);
    setBusy(true);
    await send(block.id, { kind: "answer", value: values });
    setBusy(false);
  };

  const reveal = async () => {
    setValues(Object.fromEntries(keys.map((k) => [k, firstAnswer(block.blanks[k])])));
    setResults(Object.fromEntries(keys.map((k) => [k, true])));
    await send(block.id, { kind: "reveal" });
  };

  return (
    <div className="rounded-xl border border-white/10 bg-zinc-900/60 p-4">
      {block.prompt ? <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">{block.prompt}</p> : null}
      <p className="text-[15px] leading-[2.4] text-zinc-100 sm:text-base">
        {segments.map((seg, i) => {
          const m = /^\{\{(\w+)\}\}$/.exec(seg);
          if (!m) return <span key={i}>{seg}</span>;
          const k = m[1];
          const r = results?.[k];
          return (
            <input
              key={i}
              aria-label={`Blank ${k}`}
              value={values[k] ?? ""}
              disabled={done}
              onChange={(e) => {
                setValues((v) => ({ ...v, [k]: e.target.value }));
                if (results) setResults((rs) => (rs ? { ...rs, [k]: undefined as unknown as boolean } : rs));
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !done) void check();
              }}
              className={cn(
                INPUT,
                "mx-1 inline-block w-36 align-baseline sm:w-40",
                r === true && "border-emerald-500 bg-emerald-950/40",
                r === false && "border-red-500 bg-red-950/40",
                r === undefined && "border-zinc-600",
              )}
            />
          );
        })}
      </p>
      {results && !done
        ? keys
            .filter((k) => results[k] === false && block.blanks[k].hint)
            .map((k) => (
              <p key={k} className="mt-1 text-sm text-red-300">
                Hint{keys.length > 1 ? ` (blank ${k})` : ""}: {block.blanks[k].hint}
              </p>
            ))
        : null}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {!done ? (
          <Button type="button" size="sm" disabled={busy || keys.some((k) => !(values[k] ?? "").trim())} onClick={() => void check()}>
            Check
          </Button>
        ) : null}
        {!done && attempts >= 2 ? (
          <Button type="button" size="sm" variant="outline" onClick={() => void reveal()}>
            Show answer
          </Button>
        ) : null}
        <Status correct={saved.correct} revealed={saved.revealed} />
      </div>
    </div>
  );
}

/* ───────────────────────── calc ───────────────────────── */

export function CalcView({ block }: { block: BlockOf<"calc"> }) {
  const { state, send } = useLesson();
  const saved = state(block.id);
  const done = Boolean(saved.done);
  const [value, setValue] = useState(done ? String(block.answer) : "");
  const [wrong, setWrong] = useState(false);
  const [busy, setBusy] = useState(false);

  const check = async () => {
    setWrong(!gradeCalc(block, value));
    setBusy(true);
    await send(block.id, { kind: "answer", value });
    setBusy(false);
  };

  return (
    <div className="rounded-xl border border-white/10 bg-zinc-900/60 p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Calculate</p>
      <div className="mt-1">
        <Markdown>{block.prompt}</Markdown>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <div className="flex items-center">
          {block.unit === "$" ? <span className="mr-1 text-zinc-400">$</span> : null}
          <input
            inputMode="decimal"
            aria-label="Your answer"
            value={value}
            disabled={done}
            onChange={(e) => {
              setValue(e.target.value);
              setWrong(false);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !done && value.trim()) void check();
            }}
            className={cn(
              INPUT,
              "w-36",
              done && saved.correct && "border-emerald-500 bg-emerald-950/40",
              wrong && !done && "border-red-500 bg-red-950/40",
              !wrong && !done && "border-zinc-600",
            )}
          />
          {block.unit && block.unit !== "$" ? <span className="ml-1 text-zinc-400">{block.unit}</span> : null}
        </div>
        {!done ? (
          <Button type="button" size="sm" disabled={busy || !value.trim()} onClick={() => void check()}>
            Check
          </Button>
        ) : null}
        {!done && (saved.attempts ?? 0) >= 2 ? (
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => {
              setValue(String(block.answer));
              void send(block.id, { kind: "reveal" });
            }}
          >
            Show answer
          </Button>
        ) : null}
      </div>
      {wrong && !done ? <p className="mt-2 text-sm text-red-300">Not quite — check your math and try again.</p> : null}
      <div className="mt-2">
        <Status correct={saved.correct} revealed={saved.revealed} />
      </div>
      {done ? (
        <div className="mt-2 rounded-lg border border-white/10 bg-zinc-950/60 p-3 text-sm text-zinc-200">
          <span className="font-semibold text-zinc-400">Solution: </span>
          {block.solution}
        </div>
      ) : null}
    </div>
  );
}

/* ───────────────────────── mcq ───────────────────────── */

export function McqView({ block }: { block: BlockOf<"mcq"> }) {
  const { state, send, seed } = useLesson();
  const saved = state(block.id);
  const options = useMemo(() => seededShuffle(block.options, `${seed}:${block.id}`), [block.options, block.id, seed]);
  const [picked, setPicked] = useState<string | null>(saved.done ? (saved.correct ? block.correct : null) : null);
  const done = Boolean(saved.done);
  const [localResult, setLocalResult] = useState<boolean | null>(null);

  const submit = async () => {
    if (!picked) return;
    setLocalResult(gradeMcq(block, picked));
    await send(block.id, { kind: "answer", value: picked });
  };

  const showResult = done || localResult !== null;
  const correct = saved.done ? Boolean(saved.correct) : Boolean(localResult);

  return (
    <fieldset className="rounded-xl border border-white/10 bg-zinc-900/60 p-4">
      <legend className="sr-only">Multiple choice</legend>
      <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Multiple choice</p>
      <div className="mt-1">
        <Markdown>{block.prompt}</Markdown>
      </div>
      <div className="mt-3 space-y-2" role="radiogroup">
        {options.map((o) => {
          const isPicked = picked === o.id;
          const isRight = showResult && o.id === block.correct;
          const isWrong = showResult && isPicked && o.id !== block.correct;
          return (
            <label
              key={o.id}
              className={cn(
                "flex cursor-pointer items-start gap-3 rounded-lg border p-3 text-[15px] text-zinc-100",
                !showResult && (isPicked ? "border-[#4a6fa5] bg-[#4a6fa5]/15" : "border-white/10 hover:border-zinc-500"),
                isRight && "border-emerald-500 bg-emerald-950/40",
                isWrong && "border-red-500 bg-red-950/40",
                showResult && !isRight && !isWrong && "border-white/5 opacity-60",
                showResult && "cursor-default",
              )}
            >
              <input
                type="radio"
                name={block.id}
                value={o.id}
                checked={isPicked}
                disabled={showResult}
                onChange={() => setPicked(o.id)}
                className="mt-1 h-4 w-4 accent-[#4a6fa5]"
              />
              <span>{o.text}</span>
            </label>
          );
        })}
      </div>
      {!showResult ? (
        <Button type="button" size="sm" className="mt-3" disabled={!picked} onClick={() => void submit()}>
          Submit
        </Button>
      ) : (
        <div className="mt-3 rounded-lg border border-white/10 bg-zinc-950/60 p-3 text-sm">
          <p className={cn("mb-1 font-semibold", correct ? "text-emerald-400" : "text-red-300")}>
            {correct ? "Correct ✓" : "Not quite"}
          </p>
          <p className="text-zinc-200">{block.explanation}</p>
        </div>
      )}
    </fieldset>
  );
}

/* ───────────────────────── orderSteps ───────────────────────── */

function SortableItem({ id, index, status, disabled }: { id: string; index: number; status?: boolean; disabled: boolean }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id, disabled });
  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        "flex touch-none select-none items-center gap-3 rounded-lg border bg-zinc-950 p-3 text-[15px] text-zinc-100",
        isDragging && "z-10 border-[#4a6fa5] shadow-lg shadow-black/50",
        status === true && "border-emerald-500 bg-emerald-950/40",
        status === false && "border-red-500 bg-red-950/40",
        status === undefined && !isDragging && "border-white/10",
        !disabled && "cursor-grab active:cursor-grabbing",
      )}
      {...attributes}
      {...listeners}
    >
      <span className="font-mono text-xs text-zinc-500">{index + 1}</span>
      <span className="min-w-0 flex-1">{id}</span>
      {!disabled ? (
        <span className="text-zinc-500" aria-hidden>
          ⋮⋮
        </span>
      ) : null}
    </li>
  );
}

export function OrderStepsView({ block }: { block: BlockOf<"orderSteps"> }) {
  const { state, send, seed } = useLesson();
  const saved = state(block.id);
  const done = Boolean(saved.done);
  const [order, setOrder] = useState<string[]>(() => {
    if (done) return block.items;
    let s = seededShuffle(block.items, `${seed}:${block.id}`);
    // Never start already solved.
    if (s.every((x, i) => x === block.items[i])) s = [...s.slice(1), s[0]];
    return s;
  });
  const [positions, setPositions] = useState<boolean[] | null>(done ? block.items.map(() => true) : null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 120, tolerance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const onDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    setOrder((o) => arrayMove(o, o.indexOf(String(active.id)), o.indexOf(String(over.id))));
    setPositions(null);
  };

  const check = async () => {
    setPositions(gradeOrder(block, order).positions);
    await send(block.id, { kind: "answer", value: order });
  };

  return (
    <div className="rounded-xl border border-white/10 bg-zinc-900/60 p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Put in order</p>
      <p className="mb-3 mt-1 text-[15px] text-zinc-100">{block.prompt}</p>
      <p className="mb-2 text-xs text-zinc-500">Drag to reorder (or focus an item, press Space, then use the arrow keys).</p>
      <DndContext id={`dnd-${block.id}`} sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext items={order} strategy={verticalListSortingStrategy}>
          <ol className="space-y-2">
            {order.map((item, i) => (
              <SortableItem key={item} id={item} index={i} status={positions?.[i]} disabled={done} />
            ))}
          </ol>
        </SortableContext>
      </DndContext>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {!done ? (
          <Button type="button" size="sm" onClick={() => void check()}>
            Check
          </Button>
        ) : null}
        {!done && (saved.attempts ?? 0) >= 2 ? (
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => {
              setOrder(block.items);
              setPositions(block.items.map(() => true));
              void send(block.id, { kind: "reveal" });
            }}
          >
            Show answer
          </Button>
        ) : null}
        {positions && !done ? (
          <span className="text-sm text-red-300">
            {positions.filter(Boolean).length}/{positions.length} in the right spot — keep going.
          </span>
        ) : null}
        <Status correct={saved.correct} revealed={saved.revealed} />
      </div>
    </div>
  );
}
