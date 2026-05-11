"use client";

import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export function ProfileReferralCard({
  code,
  joinedCount,
  xpEarned,
}: {
  code: string;
  joinedCount: number;
  xpEarned: number;
}) {
  const [copied, setCopied] = useState(false);
  const link = useMemo(() => `${typeof window !== "undefined" ? window.location.origin : "https://prospectapp.co"}/join?ref=${code}`, [code]);

  return (
    <Card className="border-zinc-800 bg-zinc-900/50 p-4">
      <p className="text-sm font-semibold text-zinc-200">Invite a Friend</p>
      <p className="mt-2 text-xs text-zinc-400 break-all">{link}</p>
      <div className="mt-3 flex items-center gap-2">
        <Button
          size="sm"
          onClick={async () => {
            await navigator.clipboard.writeText(link);
            setCopied(true);
            setTimeout(() => setCopied(false), 1200);
          }}
        >
          {copied ? "Copied" : "Copy link"}
        </Button>
        <p className="text-xs text-zinc-500">{joinedCount} friends joined · {xpEarned} referral XP earned</p>
      </div>
    </Card>
  );
}
