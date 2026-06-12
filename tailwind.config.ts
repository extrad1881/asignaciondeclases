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
        ink: "#1f2933",
        line: "#d9e2ec",
        panel: "#f8fafc",
        brand: "#0f766e",
        warn: "#b45309",
        info: "#2563eb"
      },
      boxShadow: {
        subtle: "0 1px 2px rgb(15 23 42 / 0.06)"
      }
    }
  },
  plugins: []
};

export default config;
