"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DataTable, Td, Th } from "@/components/ui/data-table";

type Row = {
  id: string;
  name: string;
  email: string;
  createdAt: string;
  lastActiveAt: string | null;
  signupIp: string | null;
  reasons: string[];
  deletedAt: string | null;
};

export function BotReview({ suspects, softDeleted, purgeable }: { suspects: Row[]; softDeleted: Row[]; purgeable: number }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);

  const act = async (action: "keep" | "delete" | "restore", ids: string[]) => {
    setBusy(ids.join());
    const res = await fetch("/api/admin/users/review", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, ids }),
    });
    setBusy(null);
    if (!res.ok) return toast.error("Update failed");
    toast(action === "delete" ? "Hidden and disabled" : action === "restore" ? "Restored" : "Kept");
    router.refresh();
  };

  const purge = async () => {
    const typed = prompt("This permanently removes accounts soft-deleted more than 30 days ago. Type PURGE to confirm.");
    if (typed !== "PURGE") return;
    const res = await fetch("/api/admin/users/review", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "purge", confirm: "PURGE" }),
    });
    const d = (await res.json().catch(() => ({}))) as { purged?: number };
    if (!res.ok) return toast.error("Purge failed");
    toast(`${d.purged ?? 0} accounts permanently removed`);
    router.refresh();
  };

  const old = purgeable;

  return (
    <div className="space-y-8">
      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="section-title">Likely bots ({suspects.length})</h2>
          {suspects.length > 1 ? (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => confirm(`Hide and disable all ${suspects.length}?`) && void act("delete", suspects.map((s) => s.id))}
            >
              Delete all listed
            </Button>
          ) : null}
        </div>
        <DataTable minWidth={760}>
          <thead>
            <tr>
              <Th>Account</Th>
              <Th>Why it&apos;s flagged</Th>
              <Th>Signed up</Th>
              <Th>IP</Th>
              <Th className="w-44" />
            </tr>
          </thead>
          <tbody>
            {suspects.length === 0 ? (
              <tr>
                <Td colSpan={5} className="py-8 text-center text-ink-3">
                  Nothing looks suspicious right now.
                </Td>
              </tr>
            ) : (
              suspects.map((r) => (
                <tr key={r.id}>
                  <Td>
                    <p className="font-medium">{r.name}</p>
                    <p className="text-[13px] text-ink-3">{r.email}</p>
                  </Td>
                  <Td>
                    <span className="flex flex-wrap gap-1">
                      {r.reasons.map((x) => (
                        <Badge key={x} tone="warn">
                          {x}
                        </Badge>
                      ))}
                    </span>
                  </Td>
                  <Td className="text-ink-2">{formatDistanceToNow(new Date(r.createdAt), { addSuffix: true })}</Td>
                  <Td className="text-[13px] text-ink-3">{r.signupIp ?? "—"}</Td>
                  <Td className="text-right">
                    <span className="inline-flex gap-2">
                      <Button size="sm" variant="secondary" disabled={busy === r.id} onClick={() => void act("keep", [r.id])}>
                        Keep
                      </Button>
                      <Button size="sm" variant="danger" disabled={busy === r.id} onClick={() => void act("delete", [r.id])}>
                        Delete
                      </Button>
                    </span>
                  </Td>
                </tr>
              ))
            )}
          </tbody>
        </DataTable>
      </section>

      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="section-title">Soft-deleted ({softDeleted.length})</h2>
          <Button variant="secondary" size="sm" disabled={old === 0} onClick={() => void purge()}>
            Purge soft-deleted older than 30 days ({old})
          </Button>
        </div>
        {softDeleted.length ? (
          <DataTable minWidth={560}>
            <thead>
              <tr>
                <Th>Account</Th>
                <Th>Deleted</Th>
                <Th className="w-28" />
              </tr>
            </thead>
            <tbody>
              {softDeleted.map((r) => (
                <tr key={r.id}>
                  <Td>
                    <p className="font-medium">{r.name}</p>
                    <p className="text-[13px] text-ink-3">{r.email}</p>
                  </Td>
                  <Td className="text-ink-2">{r.deletedAt ? formatDistanceToNow(new Date(r.deletedAt), { addSuffix: true }) : ""}</Td>
                  <Td className="text-right">
                    <Button size="sm" variant="ghost" onClick={() => void act("restore", [r.id])}>
                      Restore
                    </Button>
                  </Td>
                </tr>
              ))}
            </tbody>
          </DataTable>
        ) : (
          <p className="text-sm text-ink-3">None.</p>
        )}
      </section>
    </div>
  );
}
