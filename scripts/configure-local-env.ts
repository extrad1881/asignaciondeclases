import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const targetPath = path.resolve(".env.local");
const managedKeys = new Set([
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY"
]);

function parseStatusEnv(output: string) {
  return Object.fromEntries(
    output
      .split(/\r?\n/)
      .map((line) => line.match(/^([A-Z0-9_]+)="?([^"\r\n]*)"?$/))
      .filter((match): match is RegExpMatchArray => Boolean(match))
      .map((match) => [match[1], match[2]])
  );
}

function main() {
  const executable = process.platform === "win32" ? (process.env.ComSpec || "cmd.exe") : "supabase";
  const args = process.platform === "win32"
    ? ["/d", "/s", "/c", "supabase status -o env"]
    : ["status", "-o", "env"];
  const status = parseStatusEnv(
    execFileSync(executable, args, {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"]
    })
  );

  const values = {
    NEXT_PUBLIC_SUPABASE_URL: status.API_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: status.PUBLISHABLE_KEY || status.ANON_KEY,
    SUPABASE_SERVICE_ROLE_KEY: status.SECRET_KEY || status.SERVICE_ROLE_KEY
  };

  if (Object.values(values).some((value) => !value)) {
    throw new Error("Supabase local no devolvió todas las llaves requeridas. Ejecuta `supabase start` e inténtalo de nuevo.");
  }

  const existingLines = existsSync(targetPath)
    ? readFileSync(targetPath, "utf8").split(/\r?\n/)
    : [];
  const preservedLines = existingLines.filter((line) => {
    const key = line.match(/^\s*([A-Z0-9_]+)\s*=/)?.[1];
    return !key || !managedKeys.has(key);
  });

  while (preservedLines.at(-1) === "") preservedLines.pop();
  const managedLines = Object.entries(values).map(([key, value]) => `${key}=${value}`);
  const output = [...preservedLines, ...(preservedLines.length > 0 ? [""] : []), ...managedLines, ""].join("\n");
  writeFileSync(targetPath, output, { encoding: "utf8", mode: 0o600 });
  console.log(".env.local quedó configurado con las credenciales de Supabase local.");
}

main();
