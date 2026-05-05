import "server-only";

const MODEL = "claude-sonnet-4-20250514";
const MAX_TOKENS = 1000;

export function getAnthropicApiKey(): string | undefined {
  const k = process.env.ANTHROPIC_API_KEY?.trim();
  return k || undefined;
}

/**
 * Single user-message call to Anthropic Messages API.
 * @throws if ANTHROPIC_API_KEY is missing or the API returns an error
 */
export async function anthropicMessage(
  userPrompt: string,
  options?: { system?: string },
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
      max_tokens: MAX_TOKENS,
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
  return text;
}
