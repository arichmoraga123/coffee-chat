import "server-only";
import { prisma } from "@/lib/prisma";

const MODEL = "claude-sonnet-4-5";
const DEFAULT_MAX_TOKENS = 1000;

export type AnthropicUsageFeature =
  | "follow-up"
  | "pre-call"
  | "intro"
  | "mock-feedback"
  | "mock-summary"
  | "offer-analysis"
  | "debrief-analysis"
  | "deal-practice"
  | "email-customize"
  | "resume-review"
  | "case-resume-bullets"
  | "pitch-outline";

export function getAnthropicApiKey(): string | undefined {
  const k = process.env.ANTHROPIC_API_KEY?.trim();
  return k || undefined;
}

async function logUsage(
  userId: string,
  feature: AnthropicUsageFeature,
  inputTokens: number,
  outputTokens: number,
) {
  try {
    await prisma.apiUsageLog.create({
      data: {
        userId,
        feature,
        inputTokens,
        outputTokens,
      },
    });
  } catch {
    /* ignore logging failures */
  }
}

/**
 * Single user-message call to Anthropic Messages API.
 * Optionally logs token usage to APIUsageLog.
 */
export async function anthropicMessage(
  userPrompt: string,
  options?: {
    system?: string;
    maxTokens?: number;
    usageLog?: { userId: string; feature: AnthropicUsageFeature };
  },
): Promise<string> {
  const apiKey = getAnthropicApiKey();
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY is not configured");
  }

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: options?.maxTokens ?? DEFAULT_MAX_TOKENS,
      system:
        options?.system ??
        "You are a concise assistant helping a finance recruiting candidate. Be practical and specific.",
      messages: [{ role: "user", content: userPrompt }],
    }),
  });

  const raw = await res.text();
  if (!res.ok) {
    throw new Error(`Anthropic API error ${res.status}: ${raw.slice(0, 500)}`);
  }

  let parsed: {
    content?: Array<{ type?: string; text?: string }>;
    error?: { message?: string };
    usage?: { input_tokens?: number; output_tokens?: number };
  };
  try {
    parsed = JSON.parse(raw) as typeof parsed;
  } catch {
    throw new Error("Anthropic returned invalid JSON");
  }

  if (parsed.error?.message) {
    throw new Error(parsed.error.message);
  }

  const text = parsed.content?.find((b) => b.type === "text")?.text?.trim();
  if (!text) {
    throw new Error("Anthropic returned no text content");
  }

  const inTok = Math.max(0, parsed.usage?.input_tokens ?? 0);
  const outTok = Math.max(0, parsed.usage?.output_tokens ?? 0);
  if (options?.usageLog) {
    void logUsage(options.usageLog.userId, options.usageLog.feature, inTok, outTok);
  }

  return text;
}

/** Claude Sonnet 4.5 approximate list pricing — adjust if your contract differs. */
export const ANTHROPIC_SONNET4_INPUT_PER_MTOK_USD = 3;
export const ANTHROPIC_SONNET4_OUTPUT_PER_MTOK_USD = 15;

export function estimateAnthropicCostUsd(inputTokens: number, outputTokens: number): number {
  return (
    (inputTokens / 1_000_000) * ANTHROPIC_SONNET4_INPUT_PER_MTOK_USD +
    (outputTokens / 1_000_000) * ANTHROPIC_SONNET4_OUTPUT_PER_MTOK_USD
  );
}
