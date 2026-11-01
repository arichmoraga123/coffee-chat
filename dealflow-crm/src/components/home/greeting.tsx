"use client";

import { useEffect, useState } from "react";

/** Uses the viewer's local clock (the server runs in UTC). */
export function Greeting() {
  const [text, setText] = useState("Hello,");
  useEffect(() => {
    const h = new Date().getHours();
    setText(h < 12 ? "Good morning," : h < 18 ? "Good afternoon," : "Good evening,");
  }, []);
  return <>{text}</>;
}
