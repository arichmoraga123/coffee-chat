"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useCareerTracks } from "@/components/career-track-provider";
import { matchesCareerTracks } from "@/lib/career-tracks";

type Row = {
  id: string;
  title: string;
  type: string;
  difficulty: string;
  prompt: string;
  framework: string | null;
  sampleAnswer: string | null;
  firmSource: string | null;
  careerTracks: string[];
};

export function ConsultingCaseLibrary() {
  const { careerTracks, narrowTrack } = useCareerTracks();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [openId, setOpenId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/consulting-cases");
    if (res.ok) {
      const d = (await res.json()) as { cases: Row[] };
      setRows(d.cases ?? []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(
    () => rows.filter((r) => matchesCareerTracks(r.careerTracks ?? [], careerTracks, narrowTrack)),
    [rows, careerTracks, narrowTrack],
  );

  if (loading) return <p className="text-sm text-ink-3">Loading consulting case library…</p>;

  return (
    <div className="space-y-4">
      <p className="text-sm text-ink-2">
        Shared consulting-style cases for practice. Pair with{" "}
        <a href="/mock-interview" className="text-ink underline-offset-2 hover:underline">
          Mock Interview → Case practice
        </a>
        .
      </p>
      <div className="grid gap-4 md:grid-cols-2">
        {filtered.map((c) => {
          const open = openId === c.id;
          return (
            <Card key={c.id} className="border-border bg-surface p-4">
              <div className="flex flex-wrap items-center gap-2 text-xs text-ink-3">
                <span className="rounded border border-border-strong px-2 py-0.5 text-ink-2">{c.type}</span>
                <span>{c.difficulty}</span>
                {c.firmSource ? <span className="truncate">{c.firmSource}</span> : null}
              </div>
              <h3 className="mt-2 text-base font-semibold text-ink">{c.title}</h3>
              <p className="mt-2 line-clamp-4 text-sm text-ink-2">{c.prompt}</p>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="mt-3"
                onClick={() => setOpenId(open ? null : c.id)}
              >
                {open ? "Hide detail" : "Framework & sample walkthrough"}
              </Button>
              {open ? (
                <div className="mt-3 space-y-3 border-t border-border pt-3 text-sm text-ink-2">
                  {c.framework ? (
                    <div>
                      <p className="text-xs font-semibold uppercase text-warn">Framework</p>
                      <p className="mt-1 whitespace-pre-wrap">{c.framework}</p>
                    </div>
                  ) : null}
                  {c.sampleAnswer ? (
                    <div>
                      <p className="text-xs font-semibold uppercase text-ink-3">Sample walkthrough</p>
                      <p className="mt-1 whitespace-pre-wrap">{c.sampleAnswer}</p>
                    </div>
                  ) : null}
                </div>
              ) : null}
            </Card>
          );
        })}
      </div>
      {filtered.length === 0 ? (
        <p className="text-sm text-ink-3">No cases match your career track filters.</p>
      ) : null}
    </div>
  );
}
