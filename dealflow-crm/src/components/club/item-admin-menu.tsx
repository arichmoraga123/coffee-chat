"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import type { SearchOption } from "@/components/ui/search-select";
import { PublishDialog, type EditTarget } from "@/components/club/publish-dialog";

/** Edit / archive / pin / delete for officers on any club item. */
export function ItemAdminMenu({
  target,
  isAdmin,
  lessons,
  archived,
  pinned,
  afterDelete,
}: {
  target: EditTarget;
  isAdmin: boolean;
  lessons: SearchOption[];
  archived?: boolean;
  pinned?: boolean;
  afterDelete?: string;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const act = async (action: string) => {
    const res = await fetch(`/api/club/publish/${target.kind}/${target.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action }) });
    if (!res.ok) return toast.error("That didn't work.");
    toast(action === "archive" ? "Archived" : action === "unarchive" ? "Restored" : action === "pin" ? "Pinned" : "Unpinned");
    router.refresh();
  };
  const del = async () => {
    if (!confirm(`Delete "${target.input.title}"? This can't be undone.`)) return;
    const res = await fetch(`/api/club/publish/${target.kind}/${target.id}`, { method: "DELETE" });
    if (!res.ok) return toast.error("Couldn't delete.");
    toast("Deleted");
    if (afterDelete) router.push(afterDelete);
    router.refresh();
  };
  return (
    <span className="flex flex-wrap gap-1">
      <Button size="sm" variant="ghost" onClick={() => setEditing(true)}>
        Edit
      </Button>
      {target.kind === "announcement" ? (
        <Button size="sm" variant="ghost" onClick={() => void act(pinned ? "unpin" : "pin")}>
          {pinned ? "Unpin" : "Pin"}
        </Button>
      ) : (
        <Button size="sm" variant="ghost" onClick={() => void act(archived ? "unarchive" : "archive")}>
          {archived ? "Unarchive" : "Archive"}
        </Button>
      )}
      <Button size="sm" variant="ghost" className="text-danger" onClick={() => void del()}>
        Delete
      </Button>
      <PublishDialog open={editing} onClose={() => setEditing(false)} isAdmin={isAdmin} lessons={lessons} edit={editing ? target : null} />
    </span>
  );
}
