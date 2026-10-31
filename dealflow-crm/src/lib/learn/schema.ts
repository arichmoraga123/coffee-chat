import { z } from "zod";

/** Lesson JSON format. Every file in content/lessons/ must pass `LessonSchema` (npm run validate-lessons). */

const id = z.string().regex(/^[a-z0-9-]+$/i, "ids are letters, digits and dashes");

export const TextBlock = z.object({ type: z.literal("text"), id, body: z.string().min(1) });

export const FormulaBlock = z.object({
  type: z.literal("formula"),
  id,
  latex: z.string().min(1),
  caption: z.string().optional(),
  legend: z.array(z.object({ symbol: z.string().min(1), meaning: z.string().min(1) })).default([]),
});

export const StepThroughBlock = z.object({
  type: z.literal("stepThrough"),
  id,
  title: z.string().optional(),
  steps: z.array(z.object({ heading: z.string().optional(), body: z.string().min(1) })).min(1),
});

export const BlankSpec = z
  .object({
    accept: z.array(z.string().min(1)).optional(),
    numeric: z.number().optional(),
    tolerance: z.number().min(0).optional(),
    hint: z.string().optional(),
  })
  .refine((b) => (b.accept && b.accept.length > 0) || typeof b.numeric === "number", {
    message: "a blank needs `accept` values or a `numeric` answer",
  });

export const FillBlankBlock = z.object({
  type: z.literal("fillBlank"),
  id,
  prompt: z.string().optional(),
  template: z.string().min(1),
  blanks: z.record(z.string(), BlankSpec),
});

export const CalcBlock = z.object({
  type: z.literal("calc"),
  id,
  prompt: z.string().min(1),
  answer: z.number(),
  tolerance: z.number().min(0).default(0),
  unit: z.string().optional(),
  solution: z.string().min(1),
});

export const McqBlock = z.object({
  type: z.literal("mcq"),
  id,
  prompt: z.string().min(1),
  options: z.array(z.object({ id: z.string().min(1), text: z.string().min(1) })).min(2),
  correct: z.string().min(1),
  explanation: z.string().min(1),
});

export const DeepDiveBlock = z.object({
  type: z.literal("deepDive"),
  id,
  title: z.string().min(1),
  difficulty: z.enum(["core", "follow-up", "gotcha", "advanced"]),
  /** One-line preview shown while collapsed. */
  teaser: z.string().optional(),
  body: z.string().min(1),
});

export const OrderStepsBlock = z.object({
  type: z.literal("orderSteps"),
  id,
  prompt: z.string().min(1),
  items: z.array(z.string().min(1)).min(2),
});

export const CheckpointBlock = z.object({
  type: z.literal("checkpoint"),
  id,
  title: z.string().optional(),
  prompts: z.array(z.string().min(1)).min(1),
  selfGrade: z.boolean().default(true),
});

export const ExcelLinkBlock = z.object({
  type: z.literal("excelLink"),
  id,
  workbook: z.string().regex(/^PEB_\d{2}_[A-Za-z0-9_]+$/),
  body: z.string().optional(),
});

export const BlockSchema = z.discriminatedUnion("type", [
  TextBlock,
  FormulaBlock,
  StepThroughBlock,
  FillBlankBlock,
  CalcBlock,
  McqBlock,
  DeepDiveBlock,
  OrderStepsBlock,
  CheckpointBlock,
  ExcelLinkBlock,
]);

export const LessonSchema = z
  .object({
    id: z.string().regex(/^\d{1,2}-\d{1,2}$/, 'lesson id looks like "5-2"'),
    slug: z.string().regex(/^[a-z0-9-]+$/),
    module: z.number().int().min(0),
    moduleTitle: z.string().min(1),
    title: z.string().min(1),
    difficulty: z.enum(["core", "follow-up", "advanced"]),
    estMinutes: z.number().int().positive(),
    prerequisites: z.array(z.string()).default([]),
    relatedQuestionTags: z.array(z.string()).default([]),
    workbook: z.string().optional(),
    sourceRefs: z.array(z.object({ guide: z.string(), section: z.string() })).default([]),
    objectives: z.array(z.string()).default([]),
    blocks: z.array(BlockSchema).min(1),
  })
  .superRefine((lesson, ctx) => {
    const seen = new Set<string>();
    lesson.blocks.forEach((b, i) => {
      if (seen.has(b.id)) ctx.addIssue({ code: "custom", path: ["blocks", i, "id"], message: `duplicate block id ${b.id}` });
      seen.add(b.id);
      if (b.type === "fillBlank") {
        const inTemplate = Array.from(b.template.matchAll(/\{\{(\w+)\}\}/g)).map((m) => m[1]);
        const keys = Object.keys(b.blanks);
        if (!inTemplate.length) ctx.addIssue({ code: "custom", path: ["blocks", i], message: "template has no {{n}} blanks" });
        for (const k of inTemplate)
          if (!keys.includes(k)) ctx.addIssue({ code: "custom", path: ["blocks", i], message: `blank {{${k}}} has no answer` });
        for (const k of keys)
          if (!inTemplate.includes(k)) ctx.addIssue({ code: "custom", path: ["blocks", i], message: `answer ${k} not used in template` });
      }
      if (b.type === "mcq" && !b.options.some((o) => o.id === b.correct)) {
        ctx.addIssue({ code: "custom", path: ["blocks", i], message: `mcq correct "${b.correct}" is not an option` });
      }
      if (b.type === "excelLink" && lesson.workbook && b.workbook !== lesson.workbook) {
        ctx.addIssue({ code: "custom", path: ["blocks", i], message: "excelLink workbook differs from lesson.workbook" });
      }
    });
  });

export type Lesson = z.infer<typeof LessonSchema>;
export type Block = z.infer<typeof BlockSchema>;
export type BlockOf<T extends Block["type"]> = Extract<Block, { type: T }>;

/** Blocks a student must answer for the lesson to count as complete. */
export const GRADED_TYPES = ["fillBlank", "calc", "mcq", "orderSteps"] as const;
export type GradedBlock = BlockOf<(typeof GRADED_TYPES)[number]>;

export function isGraded(b: Block): b is GradedBlock {
  return (GRADED_TYPES as readonly string[]).includes(b.type);
}
