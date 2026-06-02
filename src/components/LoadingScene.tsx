"use client";

import * as React from "react";

let fadeSeenInRuntime = false;

export function LoadingScene() {
  const [visible, setVisible] = React.useState(!fadeSeenInRuntime);
  const [exiting, setExiting] = React.useState(false);

  React.useEffect(() => {
    if (!visible) return;

    const fadeTimer = window.setTimeout(() => {
      setExiting(true);
    }, 160);
    const removeTimer = window.setTimeout(() => {
      fadeSeenInRuntime = true;
      setVisible(false);
    }, 760);

    return () => {
      window.clearTimeout(fadeTimer);
      window.clearTimeout(removeTimer);
    };
  }, [visible]);

  if (!visible) return null;

  return (
    <div
      aria-hidden="true"
      className="fixed inset-0 z-[100] bg-[rgb(var(--void))]"
      style={{
        opacity: exiting ? 0 : 1,
        pointerEvents: "none",
        transition: "opacity 600ms cubic-bezier(0.22, 1, 0.36, 1)",
      }}
    />
  );
}
