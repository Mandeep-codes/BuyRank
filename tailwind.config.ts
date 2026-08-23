import type { Config } from "tailwindcss";

export default {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        cream: "#FFF6E5",
        paper: "#FFFFFF",
        ink: "#1C1512",
        mute: "#7C6F63",
        rule: "#E6DCCB",
        pop: "#FF5A36",
        zap: "#FFC53D",
        sky: "#59B4E8",
        mint: "#37B87C",
      },
      fontFamily: {
        display: ["var(--font-display)", "system-ui", "sans-serif"],
        sans: ["var(--font-body)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
    },
  },
  plugins: [],
} satisfies Config;
