"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";

export function MemberSearch({ initial, count, total }: { initial: string; count: number; total: number }) {
  const router = useRouter();
  const sp = useSearchParams();
  const [q, setQ] = useState(initial);
  useEffect(() => {
    const t = window.setTimeout(() => {
      const next = new URLSearchParams(sp.toString());
      if (q.trim()) next.set("q", q.trim());
      else next.delete("q");
      router.replace(`?${next.toString()}`, { scroll: false });
    }, 250);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);
  return (
    <div className="flex flex-wrap items-center gap-3">
      <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search members or firms" className="w-full sm:w-72" aria-label="Search members or firms" />
      <span className="text-[13px] text-ink-3">
        {count} of {total}
      </span>
    </div>
  );
}
