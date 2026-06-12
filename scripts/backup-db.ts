import { execFileSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const supabaseBin = process.platform === "win32" ? "supabase.cmd" : "supabase";
const powershellBin = process.platform === "win32" ? "powershell.exe" : "powershell";

function timestamp() {
  const now = new Date();
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
}

function run(command: string, args: string[], cwd = root) {
  console.log(`> ${command} ${args.join(" ")}`);
  if (process.platform === "win32" && command.endsWith(".cmd")) {
    const quoteIfNeeded = (value: string) =>
      /^[A-Za-z0-9_./:=\\-]+$/.test(value) ? value : `"${value.replace(/"/g, '\\"')}"`;
    execFileSync("cmd.exe", ["/d", "/c", [command, ...args.map(quoteIfNeeded)].join(" ")], { cwd, stdio: "inherit" });
    return;
  }
  execFileSync(command, args, { cwd, stdio: "inherit" });
}

function copyIfExists(from: string, to: string) {
  if (!existsSync(from)) return;
  cpSync(from, to, { recursive: true });
}

function createZip(sourceDir: string, zipPath: string) {
  if (process.platform === "win32") {
    run(powershellBin, [
      "-NoProfile",
      "-Command",
      `Compress-Archive -Path '${sourceDir}\\*' -DestinationPath '${zipPath}' -Force`
    ]);
    return;
  }

  run("zip", ["-r", zipPath, "."], sourceDir);
}

async function main() {
  console.log("Validando Supabase local...");
  run(supabaseBin, ["status"]);

  const backupRoot = path.join(root, "backups", "supabase", timestamp());
  const migrationsTarget = path.join(backupRoot, "migrations");
  mkdirSync(backupRoot, { recursive: true });

  const commands = [
    "supabase db dump --local --file schema.sql",
    "supabase db dump --local --data-only --use-copy --file data.sql",
    "supabase db dump --local --role-only --file roles.sql"
  ];

  run(supabaseBin, ["db", "dump", "--local", "--file", path.join(backupRoot, "schema.sql")]);
  run(supabaseBin, ["db", "dump", "--local", "--data-only", "--use-copy", "--file", path.join(backupRoot, "data.sql")]);
  run(supabaseBin, ["db", "dump", "--local", "--role-only", "--file", path.join(backupRoot, "roles.sql")]);

  copyIfExists(path.join(root, "supabase", "seed.sql"), path.join(backupRoot, "seed.sql"));
  copyIfExists(path.join(root, "supabase", "config.toml"), path.join(backupRoot, "config.toml"));
  copyIfExists(path.join(root, "supabase", "migrations"), migrationsTarget);

  writeFileSync(
    path.join(backupRoot, "README.txt"),
    [
      "Backup local de Supabase",
      `Fecha: ${new Date().toISOString()}`,
      "",
      "Comandos ejecutados:",
      ...commands.map((command) => `- ${command}`),
      "",
      "Contenido:",
      "- schema.sql: estructura de base de datos.",
      "- data.sql: datos exportados.",
      "- roles.sql: roles de Postgres si aplica.",
      "- seed.sql, config.toml y migrations/: archivos del proyecto.",
      "",
      "Advertencias:",
      "- No se copian .env ni claves secretas.",
      "- Revisa data.sql antes de compartirlo; puede contener datos sensibles.",
      "- Restaura primero el schema y luego los datos en un entorno controlado."
    ].join("\n"),
    "utf8"
  );

  const zipPath = `${backupRoot}.zip`;
  createZip(backupRoot, zipPath);

  console.log("");
  console.log(`Backup creado en: ${backupRoot}`);
  console.log(`ZIP creado en: ${zipPath}`);
}

main().catch((error) => {
  console.error("No se pudo crear el backup.");
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
