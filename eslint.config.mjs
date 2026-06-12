import nextCoreWebVitals from "eslint-config-next/core-web-vitals";

const config = [
  {
    ignores: [
      ".next/**",
      "backups/**",
      "coverage/**",
      "dist/**",
      "node_modules/**",
      "repomix-output.xml",
      "types/**"
    ]
  },
  ...nextCoreWebVitals
];

export default config;
