"use client";

/**
 * Message delivery. Today this polls (every 4s for an open thread, 30s for unread counts), which is plenty
 * for a 45-person club on Vercel + Neon. To switch to Pusher/Ably later, replace these two functions only.
 */
export function subscribeToThread(conversationId: string, onTick: () => void, everyMs = 4000): () => void {
  let stopped = false;
  const tick = () => {
    if (!stopped && document.visibilityState === "visible") onTick();
  };
  const t = window.setInterval(tick, everyMs);
  document.addEventListener("visibilitychange", tick);
  return () => {
    stopped = true;
    window.clearInterval(t);
    document.removeEventListener("visibilitychange", tick);
  };
}

export function subscribeToUnread(onTick: () => void, everyMs = 30_000): () => void {
  const t = window.setInterval(() => document.visibilityState === "visible" && onTick(), everyMs);
  return () => window.clearInterval(t);
}
