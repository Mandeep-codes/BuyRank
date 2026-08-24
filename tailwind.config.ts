import type { Config } from "tailwindcss";

export default {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        paper: "#FFFFFF",
        cream: "#FFFFFF",
        wash: "#FBF7F5",
        card: "#FDF0EA",
        cardline: "#F6DCD0",
        ink: "#1A1614",
        mute: "#7C7371",
        rule: "#EFE7E3",
        pop: "#E8613C",
        popsoft: "#FBE4DA",
        zap: "#F5C86B",
        sky: "#6BA8D8",
        mint: "#3BAE6E",
      },
      fontFamily: {
        display: ["var(--font-body)", "system-ui", "sans-serif"],
        sans: ["var(--font-body)", "system-ui", "sans-serif"],
        mono: ["var(--font-body)", "ui-monospace", "monospace"],
      },
    },
  },
  plugins: [],
} satisfies Config;
