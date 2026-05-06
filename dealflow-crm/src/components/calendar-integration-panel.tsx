"use client";

import { useCallback, useEffect, useState } from "react";
import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type SlotStatus = {
  connected: boolean;
  syncEnabled: boolean;
  lastSynced: string | null;
  expiresAt: string | null;
  calendarId: string | null;
};

type CalendarPayload = {
  google: SlotStatus;
  outlook: SlotStatus;
};

function SlotCard({
  title,
  recommended,
  description,
  connected,
  lastSynced,
  callbackUrl,
  provider,
  onDisconnect,
  connectLabel,
  docsHint,
}: {
  title: string;
  recommended?: boolean;
  description: string;
  connected: boolean;
  lastSynced: string | null;
  callbackUrl: string;
  provider: "google" | "azure-ad";
  onDisconnect: () => void;
  connectLabel: string;
  docsHint: string;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-zinc-900/50 p-3 text-sm">
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <p className="section-label mb-0">{title}</p>
        {recommended ? (
          <span className="rounded bg-[#161616] px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-[#c9a84c] ring-1 ring-[#2a2a2a]">
            Recommended · MSU / Microsoft 365
          </span>
        ) : null}
      </div>
      {connected ? (
        <div className="space-y-2">
          <p className="text-xs text-zinc-300">
            <span className="text-emerald-400">●</span> Connected
            {lastSynced ? (
              <>
                {" "}
                · Last linked {new Date(lastSynced).toLocaleString()}
              </>
            ) : null}
          </p>
          <Button size="sm" variant="outline" type="button" onClick={() => void onDisconnect()}>
            Disconnect
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          <p className="text-xs text-zinc-500">{description}</p>
          <Button
            size="sm"
            type="button"
            onClick={() =>
              void signIn(provider, {
                callbackUrl,
              })
            }
          >
            {connectLabel}
          </Button>
          <p className="text-[10px] text-zinc-600">{docsHint}</p>
        </div>
      )}
    </div>
  );
}

export function CalendarIntegrationPanel({
  className,
  callbackUrl = "/calendar",
}: {
  className?: string;
  callbackUrl?: string;
}) {
  const [data, setData] = useState<CalendarPayload | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const res = await fetch("/api/integrations/calendar", { credentials: "same-origin" });
    if (!res.ok) return;
    const d = (await res.json()) as CalendarPayload;
    setData(d);
    setLoading(false);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const disconnect = async (provider: "google" | "outlook") => {
    if (!confirm(`Disconnect ${provider === "outlook" ? "Outlook" : "Google"} calendar from Prospect?`)) return;
    await fetch(`/api/integrations/calendar?provider=${provider}`, {
      method: "DELETE",
      credentials: "same-origin",
    });
    await refresh();
  };

  if (loading || !data) {
    return <p className={cn("text-xs text-zinc-500", className)}>Checking calendar links…</p>;
  }

  return (
    <div className={cn("space-y-3", className)}>
      <p className="section-label">Calendar sync</p>
      <p className="text-[11px] leading-snug text-zinc-500">
        Sync recruiting events, coffee follow-ups, and application deadlines to your calendar. You can connect both
        Outlook and Google if you use both.
      </p>
      <div className="grid gap-3 md:grid-cols-2">
        <SlotCard
          title="Outlook"
          recommended
          description="Best for MSU and Microsoft 365 school accounts. Uses Microsoft Graph (same calendar as Outlook on the web)."
          connected={data.outlook.connected}
          lastSynced={data.outlook.lastSynced}
          callbackUrl={callbackUrl}
          provider="azure-ad"
          connectLabel="Connect Outlook"
          onDisconnect={() => void disconnect("outlook")}
          docsHint="Azure app redirect URI: https://YOUR_HOST/api/auth/callback/azure-ad (see .env.example)."
        />
        <SlotCard
          title="Google Calendar"
          description="Sync to the Google account that uses the same email as your Prospect login."
          connected={data.google.connected}
          lastSynced={data.google.lastSynced}
          callbackUrl={callbackUrl}
          provider="google"
          connectLabel="Connect Google Calendar"
          onDisconnect={() => void disconnect("google")}
          docsHint="Google Cloud OAuth redirect: /api/auth/callback/google"
        />
      </div>
    </div>
  );
}
