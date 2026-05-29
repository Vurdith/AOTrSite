import type { CSSProperties } from "react";

const GLINTS = Array.from({ length: 16 }, (_, index) => ({
  id: index,
  left: `${10 + ((index * 17) % 82)}%`,
  top: `${14 + ((index * 29) % 64)}%`,
  size: `${2 + (index % 3)}px`,
  delay: `${(index * -0.47).toFixed(2)}s`,
  duration: `${8 + (index % 5)}s`,
  driftX: `${(index % 2 === 0 ? 1 : -1) * (18 + (index % 4) * 12)}px`,
  driftY: `${(index % 3 === 0 ? -1 : 1) * (22 + (index % 5) * 9)}px`,
}));

export function HeroBackdrop() {
  return (
    <div className="home-hero-backdrop absolute inset-0 overflow-hidden bg-[#100804]" aria-hidden="true">
      <div className="absolute inset-0 home-hero-wall" />
      <div className="absolute inset-0 bg-[radial-gradient(62%_58%_at_72%_34%,rgb(184_42_20/.22),transparent_58%),linear-gradient(90deg,rgb(8_4_2/.96)_0%,rgb(17_8_4/.78)_42%,rgb(55_18_9/.34)_72%,rgb(8_4_2/.72)_100%)]" />
      <div className="absolute inset-x-0 bottom-0 h-[46%] bg-[linear-gradient(to_top,#050302_0%,rgb(5_3_2/.9)_46%,transparent_100%)]" />

      <div className="hero-glint-field absolute inset-0">
        {GLINTS.map((glint) => (
          <span
            key={glint.id}
            className="hero-glint"
            style={{
              left: glint.left,
              top: glint.top,
              width: glint.size,
              height: glint.size,
              "--drift-x": glint.driftX,
              "--drift-y": glint.driftY,
              animationDelay: glint.delay,
              animationDuration: glint.duration,
            } as CSSProperties}
          />
        ))}
      </div>
    </div>
  );
}
