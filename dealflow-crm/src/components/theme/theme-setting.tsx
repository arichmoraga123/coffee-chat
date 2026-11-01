"use client";

import { useEffect, useState } from "react";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { applyThemePref, readThemePref, type ThemePref } from "./theme";

export function ThemeSetting() {
  const [pref, setPref] = useState<ThemePref>("light");
  useEffect(() => setPref(readThemePref()), []);
  return (
    <SegmentedControl
      ariaLabel="Theme"
      value={pref}
      onChange={(v) => {
        setPref(v);
        applyThemePref(v);
      }}
      options={[
        { value: "light", label: "Light" },
        { value: "dark", label: "Dark" },
        { value: "system", label: "System" },
      ]}
    />
  );
}
