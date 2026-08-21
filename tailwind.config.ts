import type { Config } from "tailwindcss";

// Design tokens for the "event roster / ticket stub" visual system —
// see app/globals.css for the signature ticket-edge and stamp treatments
// that use these colors.
export default {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        paper: "#F7F7F4",
        surface: "#FFFFFF",
        ink: "#17211C",
        "ink-muted": "#5B6660",
        chalkboard: "#1F3A34",
        "chalkboard-light": "#2E4D45",
        marigold: "#E8A33D",
        "marigold-dark": "#B9791F",
        line: "#E1E0D9",
        success: "#3F7D58",
        "success-bg": "#EAF3EC",
        warning: "#B9791F",
        "warning-bg": "#FBF1DE",
        danger: "#B23A32",
        "danger-bg": "#FBEAE8",
      },
      fontFamily: {
        display: ["var(--font-display)", "sans-serif"],
        sans: ["var(--font-body)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
      borderRadius: {
        card: "10px",
      },
    },
  },
  plugins: [],
} satisfies Config;
