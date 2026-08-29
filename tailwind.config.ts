import type { Config } from "tailwindcss";

/**
 * Every colour resolves through a CSS variable rather than a literal, so the
 * whole site repaints from the palette block at the top of globals.css. Names
 * are about role, not hue.
 */
const themed = (name: string) => `rgb(var(--${name}-rgb) / <alpha-value>)`;

export default {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        paper: themed("paper"), // the page
        wash: themed("wash"), // table headers, inset fills
        edge: themed("edge"), // hairlines
        ink: themed("ink"), // primary text and solid buttons
        dim: themed("dim"), // secondary text
        accent: themed("accent"), // the one warm note
        accentwash: themed("accentwash"),
        // The white solid in the middle of the page, lit from above.
        face1: themed("face1"), // treads
        face2: themed("face2"), // risers
        face3: themed("face3"), // side wall
      },
      fontFamily: {
        display: ["var(--font-display)", "system-ui", "sans-serif"],
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
    },
  },
  plugins: [],
} satisfies Config;
