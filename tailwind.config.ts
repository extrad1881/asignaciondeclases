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
        info: "#2563eb"
      },
      boxShadow: {
        subtle: "0 1px 2px rgb(15 23 42 / 0.06)",
        panel: "0 10px 30px rgb(24 35 51 / 0.08)"
      }
    }
  },
  plugins: []
};

export default config;
