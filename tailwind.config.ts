import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        // Tokens de marca institucional
        ink: "var(--ink)",
        muted: "var(--muted)",
        line: "var(--line)",
        panel: "var(--panel)",
        brand: "var(--brand)",
        brandDeep: "var(--brand-deep)",
        brandSoft: "var(--brand-soft)",
        brandLight: "var(--brand-light)",
        // Tokens semánticos de shadcn
        background: "var(--background)",
        foreground: "var(--foreground)",
        card: "var(--card)",
        "card-foreground": "var(--card-foreground)",
        popover: "var(--popover)",
        "popover-foreground": "var(--popover-foreground)",
        primary: "var(--primary)",
        "primary-foreground": "var(--primary-foreground)",
        secondary: "var(--secondary)",
        "secondary-foreground": "var(--secondary-foreground)",
        accent: "var(--accent)",
        "accent-foreground": "var(--accent-foreground)",
        destructive: "var(--destructive)",
        "destructive-foreground": "var(--destructive-foreground)",
        border: "var(--border)",
        input: "var(--input)",
        ring: "var(--ring)",
        sidebar: "var(--panel)",
        "sidebar-foreground": "var(--foreground)",
        "sidebar-primary": "var(--brand)",
        "sidebar-primary-foreground": "var(--primary-foreground)",
        "sidebar-accent": "var(--accent)",
        "sidebar-accent-foreground": "var(--accent-foreground)",
        "sidebar-border": "var(--line)",
        "sidebar-ring": "var(--ring)"
      },
      boxShadow: {
        subtle: "0 1px 2px rgb(15 23 42 / 0.06)",
        panel: "0 10px 30px rgb(15 23 42 / 0.08)",
        md: "0 4px 6px -1px rgb(15 23 42 / 0.10), 0 2px 4px -2px rgb(15 23 42 / 0.10)",
        lg: "0 10px 15px -3px rgb(15 23 42 / 0.10), 0 4px 6px -4px rgb(15 23 42 / 0.10)"
      },
      borderRadius: {
        sm: "calc(var(--radius) - 4px)",
        md: "calc(var(--radius) - 2px)",
        lg: "var(--radius)",
        xl: "calc(var(--radius) + 4px)"
      },
      fontFamily: {
        sans: ["var(--font-sans)", "ui-sans-serif", "system-ui", "sans-serif"],
        serif: ["var(--font-serif)", "Georgia", "serif"],
        mono: ["var(--font-mono)", "monospace"]
      },
      letterSpacing: {
        tighter: "calc(var(--tracking-normal) - 0.05em)",
        tight: "calc(var(--tracking-normal) - 0.025em)",
        normal: "var(--tracking-normal)",
        wide: "calc(var(--tracking-normal) + 0.025em)",
        wider: "calc(var(--tracking-normal) + 0.05em)",
        widest: "calc(var(--tracking-normal) + 0.1em)"
      }
    }
  },
  plugins: []
};

export default config;
