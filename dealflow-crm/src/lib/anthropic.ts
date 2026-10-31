import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import type {
  BetaContentBlockParam,
  BetaMessage,
  BetaMessageStreamParams,
} from "@anthropic-ai/sdk/resources/beta/messages/messages";
import { prisma } from "@/lib/prisma";

/**
 * Model + speed settings (override with env vars, no code change needed):
 * - ANTHROPIC_MODEL       default "claude-opus-5-5"
 * - ANTHROPIC_FAST_MODE   "1" → fast output mode (~2x faster generation, ~2x price). Falls back
 *                         to standard speed automatically if fast mode is rate-limited/unavailable.
 */
export const AI_MODEL = process.env.ANTHROPIC_MODEL?.trim() || "claude-opus-5-5";
const FAST_MODE = ["1", "true", "yes"].includes((process.env.ANTHROPIC_FAST_MODE ?? "").toLowerCase());

const DEFAULT_MAX_TOKENS = 4000;
/** Thinking tokens count toward max_tokens; a floor keeps short caps from truncating answers. */
const MIN_MAX_TOKENS = 4000;
const DEFAULT_SYSTEM =
  "You are a concise assistant helping a college student recruit for finance roles (investment banking, private equity, etc.). Be practical, specific, and direct.";

/** Lower effort = faster responses. Quick drafts use "low"; deep reviews use "medium". */
export type AiEffort = "low" | "medium" | "high";

export type AnthropicUsageFeature =
  | "follow-up"
  | "pre-call"
  | "intro"
  | "mock-feedback"
  | "mock-summary"
  | "offer-analysis"
  | "debrief-analysis"
  | "deal-practice"
  | "deal-pitch"
  | "deal-ingest"
  | "email-customize"
  | "contact-email"
  | "resume-review"
  | "case-resume-bullets"
  | "pitch-outline"
  | "mcq-generate";

export type AiCallOptions = {
  system?: string;
  maxTokens?: number;
  effort?: AiEffort;
  usageLog?: { userId: string; feature: AnthropicUsageFeature };
};

export function getAnthropicApiKey(): string | undefined {
  const k = process.env.ANTHROPIC_API_KEY?.trim();
  return k || undefined;
}

let cachedClient: Anthropic | null = null;
function client(): Anthropic {
  const apiKey = getAnthropicApiKey();
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY is not configured");
  cachedClient ??= new Anthropic({ apiKey, maxRetries: 2, timeout: 120_000 });
  return cachedClient;
}

async function logUsage(userId: string, feature: AnthropicUsageFeature, msg: BetaMessage) {
  try {
    await prisma.apiUsageLog.create({
      data: {
        userId,
        feature,
        inputTokens: Math.max(0, msg.usage.input_tokens ?? 0),
        outputTokens: Math.max(0, msg.usage.output_tokens ?? 0),
      },
    });
  } catch {
    /* ignore logging failures */
  }
}

type UserContent = string | BetaContentBlockParam[];

function buildParams(
  content: UserContent,
  opts: AiCallOptions & { jsonSchema?: Record<string, unknown> },
  mode: { fast: boolean; fallbacks: boolean },
): BetaMessageStreamParams {
  const betas: string[] = [];
  if (mode.fallbacks) betas.push("server-side-fallback-2026-07-01");
  if (mode.fast) betas.push("fast-mode-2026-02-01");
  return {
    model: AI_MODEL,
    max_tokens: Math.max(MIN_MAX_TOKENS, opts.maxTokens ?? DEFAULT_MAX_TOKENS),
    system: opts.system ?? DEFAULT_SYSTEM,
    messages: [{ role: "user", content }],
    output_config: {
      effort: opts.effort ?? "low",
      ...(opts.jsonSchema ? { format: { type: "json_schema" as const, schema: opts.jsonSchema } } : {}),
    },
    // If the model declines for policy reasons, the API retries on a default fallback model.
    ...(mode.fallbacks ? { fallbacks: "default" as const } : {}),
    ...(betas.length ? { betas } : {}),
    ...(mode.fast ? { speed: "fast" as const } : {}),
  };
}

/**
 * Opens a streaming request. If the preferred configuration is rejected (fast mode rate-limited,
 * or an optional feature unsupported), retries once with a plain standard-speed request.
 */
async function openStream(content: UserContent, opts: AiCallOptions & { jsonSchema?: Record<string, unknown> }) {
  const start = async (mode: { fast: boolean; fallbacks: boolean }) => {
    const stream = client().beta.messages.stream(buildParams(content, opts, mode));
    // Surface connection/HTTP errors before handing the stream back.
    await stream.withResponse();
    return stream;
  };
  try {
    return await start({ fast: FAST_MODE, fallbacks: true });
  } catch (e) {
    const retryable =
      e instanceof Anthropic.BadRequestError ||
      (FAST_MODE && (e instanceof Anthropic.RateLimitError || e instanceof Anthropic.PermissionDeniedError));
    if (!retryable) throw e;
    console.warn("[anthropic] retrying with a plain request:", e instanceof Error ? e.message.slice(0, 200) : e);
    return start({ fast: false, fallbacks: false });
  }
}

function textOf(msg: BetaMessage): string {
  if (msg.stop_reason === "refusal") {
    throw new Error("The AI declined this request. Try rephrasing it.");
  }
  const text = msg.content
    .filter((b): b is Extract<typeof b, { type: "text" }> => b.type === "text")
    .map((b) => b.text)
    .join("")
    .trim();
  if (!text) throw new Error("The AI returned an empty response — please try again.");
  return text;
}

/** One-shot text completion. Streams under the hood (avoids HTTP timeouts on long outputs). */
export async function anthropicMessage(content: UserContent, opts: AiCallOptions = {}): Promise<string> {
  const stream = await openStream(content, opts);
  const msg = await stream.finalMessage();
  if (opts.usageLog) void logUsage(opts.usageLog.userId, opts.usageLog.feature, msg);
  return textOf(msg);
}

/**
 * Structured JSON output: the API guarantees the response matches `schema`,
 * so there are no "invalid JSON, retry" round trips.
 */
export async function anthropicJson<T>(
  content: UserContent,
  schema: Record<string, unknown>,
  opts: AiCallOptions = {},
): Promise<T> {
  const stream = await openStream(content, { ...opts, jsonSchema: schema });
  const msg = await stream.finalMessage();
  if (opts.usageLog) void logUsage(opts.usageLog.userId, opts.usageLog.feature, msg);
  if (msg.stop_reason === "max_tokens") {
    throw new Error("The AI response was cut off — please try again.");
  }
  return JSON.parse(textOf(msg)) as T;
}

/**
 * Like anthropicJson, but calls `onText` with the accumulated raw JSON as it streams,
 * so routes can report progress (or early fields like a score) before the response finishes.
 */
export async function anthropicJsonWithProgress<T>(
  content: UserContent,
  schema: Record<string, unknown>,
  opts: AiCallOptions,
  onText: (soFar: string) => void,
): Promise<T> {
  const stream = await openStream(content, { ...opts, jsonSchema: schema });
  let soFar = "";
  stream.on("text", (delta) => {
    soFar += delta;
    onText(soFar);
  });
  const msg = await stream.finalMessage();
  if (opts.usageLog) void logUsage(opts.usageLog.userId, opts.usageLog.feature, msg);
  if (msg.stop_reason === "max_tokens") {
    throw new Error("The AI response was cut off — please try again.");
  }
  return JSON.parse(textOf(msg)) as T;
}

/**
 * Streams plain text to the browser as it's generated, so users see output in ~1–2s
 * instead of waiting for the full response. Returns a Response with a text/plain body.
 */
export async function anthropicTextResponse(content: UserContent, opts: AiCallOptions = {}): Promise<Response> {
  const stream = await openStream(content, opts);
  const encoder = new TextEncoder();
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      stream.on("text", (delta) => controller.enqueue(encoder.encode(delta)));
      stream
        .finalMessage()
        .then((msg) => {
          if (msg.stop_reason === "refusal") {
            controller.enqueue(encoder.encode("\n\n[The AI declined this request. Try rephrasing it.]"));
          }
          if (opts.usageLog) void logUsage(opts.usageLog.userId, opts.usageLog.feature, msg);
          controller.close();
        })
        .catch((e: unknown) => {
          controller.enqueue(encoder.encode(`\n\n[Error: ${e instanceof Error ? e.message : "AI error"}]`));
          controller.close();
        });
    },
    cancel() {
      stream.abort();
    },
  });
  return new Response(body, {
    headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store", "x-accel-buffering": "no" },
  });
}

/** Approximate list pricing for the admin usage dashboard (USD per million tokens). */
const PRICING: Record<string, { input: number; output: number }> = {
  "claude-opus-5-5": { input: 4, output: 20 },
  "claude-sonnet-5-5": { input: 2, output: 10 },
  "claude-haiku-5-5": { input: 0.1, output: 0.5 },
};

export function estimateAnthropicCostUsd(inputTokens: number, outputTokens: number): number {
  const p = PRICING[AI_MODEL] ?? PRICING["claude-opus-5-5"];
  const mult = FAST_MODE ? 2 : 1;
  return ((inputTokens / 1_000_000) * p.input + (outputTokens / 1_000_000) * p.output) * mult;
}
