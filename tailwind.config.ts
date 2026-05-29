import type { Config } from "tailwindcss";

export default {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-sans)", "ui-sans-serif", "system-ui", "sans-serif"],
        serif: ["var(--font-serif)", "ui-serif", "Georgia", "serif"],
      },
      colors: {
        void: "rgb(var(--void) / <alpha-value>)",
        ink: "rgb(var(--ink) / <alpha-value>)",
        fog: "rgb(var(--fog) / <alpha-value>)",
        line: "rgb(var(--line) / <alpha-value>)",
      },
      keyframes: {
        scanlines: {
          "0%": { backgroundPosition: "0 0" },
          "100%": { backgroundPosition: "0 10px" },
        },
        marquee: {
          "0%": { transform: "translateX(0)" },
          "100%": { transform: "translateX(-50%)" },
        },
        ringRotate: {
          "0%": { transform: "rotate(0deg)" },
          "100%": { transform: "rotate(360deg)" },
        },
      },
      animation: {
        scanlines: "scanlines 1.6s linear infinite",
        marquee: "marquee var(--marquee-duration, 22s) linear infinite",
        ring: "ringRotate 2.6s linear infinite",
      },
    },
  },
  plugins: [],
} satisfies Config;

