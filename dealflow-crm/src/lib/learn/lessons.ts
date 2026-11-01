import { ALL_WORKBOOK_KEYS, WORKBOOK_LESSONS } from "@/lib/learn/workbook-map";
import { RAW_LESSONS } from "./lessons.generated";
import { LessonSchema, isGraded, type Block, type Lesson } from "./schema";

let cache: Lesson[] | null = null;

/** All lessons in recommended order (module, then lesson number). Validated at build time. */
export function allLessons(): Lesson[] {
  cache ??= RAW_LESSONS.map((raw) => LessonSchema.parse(raw));
  return cache;
}

export function getLesson(id: string): Lesson | null {
  return allLessons().find((l) => l.id === id) ?? null;
}

export function nextLesson(id: string): Lesson | null {
  const list = allLessons();
  const i = list.findIndex((l) => l.id === id);
  return i >= 0 && i + 1 < list.length ? list[i + 1] : null;
}

export type ModuleGroup = { module: number; title: string; lessons: Lesson[] };

export function modules(): ModuleGroup[] {
  const out: ModuleGroup[] = [];
  for (const l of allLessons()) {
    let g = out.find((m) => m.module === l.module);
    if (!g) {
      g = { module: l.module, title: l.moduleTitle, lessons: [] };
      out.push(g);
    }
    g.lessons.push(l);
  }
  return out;
}

/** Workbook keys referenced anywhere in the curriculum (for the admin upload dropdown). */
export function workbookKeys(): string[] {
  const keys = new Set<string>(ALL_WORKBOOK_KEYS);
  for (const l of allLessons()) {
    if (l.workbook) keys.add(l.workbook);
    for (const b of l.blocks) if (b.type === "excelLink") keys.add(b.workbook);
  }
  return Array.from(keys).sort();
}

export function lessonsForWorkbook(key: string): Lesson[] {
  return allLessons().filter((l) => l.workbook === key || l.blocks.some((b) => b.type === "excelLink" && b.workbook === key) || (WORKBOOK_LESSONS[key] ?? []).includes(l.id));
}

/** Blocks that count toward the progress bar: graded blocks, step-throughs, deep dives (opened) and the checkpoint. */
export function interactiveBlocks(lesson: Lesson): Block[] {
  return lesson.blocks.filter((b) => isGraded(b) || b.type === "stepThrough" || b.type === "checkpoint");
}
