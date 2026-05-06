"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

type Ctx = {
  careerTracks: string[];
  narrowTrack: string | null;
  setNarrowTrack: (t: string | null) => void;
  cycleNarrowTrack: () => void;
  refreshCareerTracks: () => Promise<void>;
};

const CareerTrackContext = createContext<Ctx | null>(null);

export function CareerTrackProvider({ children }: { children: React.ReactNode }) {
  const [careerTracks, setCareerTracks] = useState<string[]>([]);
  const [narrowTrack, setNarrowTrackState] = useState<string | null>(null);

  const refreshCareerTracks = useCallback(async () => {
    const res = await fetch("/api/user/me");
    if (!res.ok) return;
    const d = (await res.json()) as { careerTracks?: string[]; preferredTracks?: string[] };
    const raw = Array.isArray(d.careerTracks)
      ? d.careerTracks
      : Array.isArray(d.preferredTracks)
        ? d.preferredTracks
        : [];
    const next = raw.filter(Boolean);
    setCareerTracks(next);
    setNarrowTrackState((prev) => {
      if (prev && !next.includes(prev)) return null;
      return prev;
    });
  }, []);

  useEffect(() => {
    void refreshCareerTracks();
  }, [refreshCareerTracks]);

  const setNarrowTrack = useCallback((t: string | null) => {
    setNarrowTrackState(t);
  }, []);

  const cycleNarrowTrack = useCallback(() => {
    setNarrowTrackState((prev) => {
      if (careerTracks.length === 0) return null;
      if (prev === null) return careerTracks[0] ?? null;
      const i = careerTracks.indexOf(prev);
      if (i < 0) return careerTracks[0] ?? null;
      if (i >= careerTracks.length - 1) return null;
      return careerTracks[i + 1] ?? null;
    });
  }, [careerTracks]);

  const value = useMemo(
    () => ({
      careerTracks,
      narrowTrack,
      setNarrowTrack,
      cycleNarrowTrack,
      refreshCareerTracks,
    }),
    [careerTracks, narrowTrack, setNarrowTrack, cycleNarrowTrack, refreshCareerTracks],
  );

  return <CareerTrackContext.Provider value={value}>{children}</CareerTrackContext.Provider>;
}

export function useCareerTracks() {
  const ctx = useContext(CareerTrackContext);
  if (!ctx) {
    return {
      careerTracks: [] as string[],
      narrowTrack: null as string | null,
      setNarrowTrack: (_t: string | null) => {},
      cycleNarrowTrack: () => {},
      refreshCareerTracks: async () => {},
    };
  }
  return ctx;
}
