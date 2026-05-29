"use client";

import type React from "react";

const DOTS = Array.from({ length: 18 }, (_, i) => ({
  id: i,
  left: `${(i * 37) % 100}%`,
  top: `${(i * 61) % 100}%`,
  delay: `${(i * -0.73).toFixed(2)}s`,
  duration: `${11 + (i % 7)}s`,
  size: `${3 + (i % 3)}px`,
  driftX: `${(i % 2 === 0 ? 1 : -1) * (46 + (i % 5) * 18)}px`,
  driftY: `${(i % 3 === 0 ? -1 : 1) * (34 + (i % 4) * 16)}px`,
}));

export function SignalDust() {
  return (
    <div className="pointer-events-none fixed inset-0 z-30 overflow-hidden" aria-hidden="true">
      {DOTS.map((dot) => (
        <span
          key={dot.id}
          className="gold-mote absolute rounded-full bg-[rgb(var(--bright-gold))] opacity-50 shadow-[0_0_18px_rgb(var(--gold)/.8)]"
          style={{
            left: dot.left,
            top: dot.top,
            width: dot.size,
            height: dot.size,
            "--drift-x": dot.driftX,
            "--drift-y": dot.driftY,
            animation: `signalFloat ${dot.duration} linear ${dot.delay} infinite alternate`,
          } as React.CSSProperties}
        />
      ))}
      <style jsx>{`
        .gold-mote::after {
          content: "";
          position: absolute;
          inset: -8px;
          border-radius: 999px;
          background: radial-gradient(circle, rgb(var(--bright-gold) / 0.22), transparent 65%);
        }

        @keyframes signalFloat {
          0% {
            transform: translate3d(0, 0, 0) scale(0.72);
            opacity: 0.08;
          }
          28% {
            transform: translate3d(calc(var(--drift-x) * 0.34), calc(var(--drift-y) * -0.48), 0) scale(1.2);
            opacity: 0.72;
          }
          62% {
            transform: translate3d(calc(var(--drift-x) * -0.38), calc(var(--drift-y) * 0.58), 0) scale(0.92);
            opacity: 0.36;
          }
          100% {
            transform: translate3d(var(--drift-x), var(--drift-y), 0) scale(1.35);
            opacity: 0.2;
          }
        }
      `}</style>
    </div>
  );
}
