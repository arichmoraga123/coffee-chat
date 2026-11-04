"use client";

/**
 * POSTs to an AI route and reads its streamed events (see src/lib/ai-stream.ts). `onPartial` gets each
 * in-progress event; resolves with the final "done" event. Also accepts plain JSON responses (errors, old routes).
 */
export async function readAiStream<T extends Record<string, unknown>>(
  url: string,
  body: unknown,
  onPartial: (event: Record<string, unknown>) => void,
): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body ?? {}),
  });
  const type = res.headers.get("content-type") ?? "";
  if (!type.includes("ndjson") || !res.body) {
    const d = (await res.json().catch(() => ({}))) as T & { error?: string };
    if (!res.ok) throw new Error(d.error ?? `Request failed (${res.status})`);
    return d;
  }
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let nl: number;
    while ((nl = buffer.indexOf("\n")) >= 0) {
      const line = buffer.slice(0, nl).trim();
      buffer = buffer.slice(nl + 1);
      if (!line) continue;
      const ev = JSON.parse(line) as Record<string, unknown> & { type: string; error?: string };
      if (ev.type === "partial") onPartial(ev);
      else if (ev.type === "error") throw new Error(ev.error ?? "AI request failed");
      else if (ev.type === "done") return ev as unknown as T;
    }
  }
  throw new Error("The response ended early — please try again.");
}
