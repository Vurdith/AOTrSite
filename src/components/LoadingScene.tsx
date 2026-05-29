"use client";

import * as React from "react";
import { AnimatePresence, motion } from "framer-motion";

const EASE = [0.22, 1, 0.36, 1] as const;

let fadeSeenInRuntime = false;

export function LoadingScene() {
  const [visible, setVisible] = React.useState(!fadeSeenInRuntime);

  React.useEffect(() => {
    if (!visible) return;

    const timer = window.setTimeout(() => {
      fadeSeenInRuntime = true;
      setVisible(false);
    }, 360);

    return () => window.clearTimeout(timer);
  }, [visible]);

  return (
    <AnimatePresence>
      {visible ? (
        <motion.div
          aria-hidden="true"
          className="fixed inset-0 z-[100] bg-[rgb(var(--void))]"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.72, ease: EASE } }}
        />
      ) : null}
    </AnimatePresence>
  );
}
