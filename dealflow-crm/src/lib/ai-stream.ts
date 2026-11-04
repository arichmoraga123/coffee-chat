import "server-only";

/**
 * Streams newline-delimited JSON events to the browser so AI text shows up as it's written:
 *   { type: "partial", ... }  — repeated while the model writes
 *   { type: "done", ... }     — the final result (same fields the old JSON response had)
 *   { type: "error", error }  — something failed after streaming started
 * Errors before streaming starts (auth, not found) are still normal JSON responses.
 */
export type StreamSend = (event: Record<string, unknown>) => void;

export function ndjsonResponse(run: (send: StreamSend) => Promise<Record<string, unknown>>): Response {
  const encoder = new TextEncoder();
  const body = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send: StreamSend = (event) => controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
      try {
        const result = await run(send);
        send({ type: "done", ...result });
      } catch (e) {
        send({ type: "error", error: e instanceof Error ? e.message : "AI request failed" });
      } finally {
        controller.close();
      }
    },
  });
  return new Response(body, {
    headers: { "content-type": "application/x-ndjson; charset=utf-8", "cache-control": "no-store", "x-accel-buffering": "no" },
  });
}

/** Calls `fn` at most every `ms` milliseconds (plus once at the end via flush), so we don't send an event per token. */
export function throttle<T>(fn: (v: T) => void, ms = 120) {
  let last = 0;
  let pending: T | undefined;
  return {
    push(v: T) {
      pending = v;
      const now = Date.now();
      if (now - last >= ms) {
        last = now;
        fn(v);
        pending = undefined;
      }
    },
    flush() {
      if (pending !== undefined) fn(pending);
      pending = undefined;
    },
  };
}
