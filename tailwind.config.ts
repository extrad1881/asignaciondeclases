import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        ink: "#182333",
        muted: "#526173",
        line: "#d7dee8",
        panel: "#f7f9fc",
        brand: "#0f766e",
        brandDeep: "#134e4a",
        brandSoft: "#e6f5f2",
        gold: "#b7791f",
        warn: "#b45309",
        danger: "#b91c1c",
        info: "#2563eb",
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
        sidebar: "var(--sidebar)",
        "sidebar-foreground": "var(--sidebar-foreground)",
        "sidebar-primary": "var(--sidebar-primary)",
        "sidebar-primary-foreground": "var(--sidebar-primary-foreground)",
        "sidebar-accent": "var(--sidebar-accent)",
        "sidebar-accent-foreground": "var(--sidebar-accent-foreground)",
        "sidebar-border": "var(--sidebar-border)",
        "sidebar-ring": "var(--sidebar-ring)"
      },
      boxShadow: {
        subtle: "0 1px 2px rgb(15 23 42 / 0.06)",
        panel: "0 10px 30px rgb(24 35 51 / 0.08)",
        "2xs": "var(--shadow-2xs)",
        xs: "var(--shadow-xs)",
        sm: "var(--shadow-sm)",
        md: "var(--shadow-md)",
        lg: "var(--shadow-lg)",
        xl: "var(--shadow-xl)",
        "2xl": "var(--shadow-2xl)"
      },
      borderRadius: {
        sm: "calc(var(--radius) - 4px)",
        md: "calc(var(--radius) - 2px)",
        lg: "var(--radius)",
        xl: "calc(var(--radius) + 4px)"
      },
      fontFamily: {
        sans: ["var(--font-sans)", "ui-serif", "serif"],
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
