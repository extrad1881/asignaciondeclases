import { readFileSync, readdirSync } from "node:fs";
import { join, parse } from "node:path";

const MIGRATIONS_DIR = join(import.meta.dirname, "..", "supabase", "migrations");

interface MigrationIssue {
  file: string;
  issue: string;
}

function validateMigrations(): MigrationIssue[] {
  const issues: MigrationIssue[] = [];
  const files = readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  if (files.length === 0) {
    issues.push({ file: "(global)", issue: "No se encontraron archivos de migración." });
    return issues;
  }

  for (const file of files) {
    const content = readFileSync(join(MIGRATIONS_DIR, file), "utf8");
    const trimmed = content.trim();
    const lines = content.split("\n");
    const name = parse(file).name;

    if (trimmed.length === 0) {
      issues.push({ file, issue: "Archivo vacío." });
      continue;
    }

    if (!trimmed.toLowerCase().startsWith("begin;")) {
      issues.push({ file, issue: "No comienza con `begin;`." });
    }

    if (!trimmed.toLowerCase().endsWith("commit;")) {
      const lastLine = lines[lines.length - 1]?.trim().toLowerCase();
      if (lastLine !== "commit;") {
        issues.push({ file, issue: "No termina con `commit;`." });
      }
    }

    const beginCount = (trimmed.match(/^begin;/gm) ?? []).length;
    const commitCount = (trimmed.match(/^commit;/gm) ?? []).length;

    if (beginCount > 1) {
      issues.push({ file, issue: `Tiene ${beginCount} bloques BEGIN. Usa uno solo por migración.` });
    }
    if (commitCount > 1) {
      issues.push({ file, issue: `Tiene ${commitCount} bloques COMMIT. Usa uno solo por migración.` });
    }

    if (!/^\d{12,14}/.test(name)) {
      issues.push({ file, issue: `El nombre "${name}" no sigue el formato YYYYMMDDHHMM_descripcion.` });
    }
  }

  return issues;
}

function main() {
  console.log("Validando migraciones en:", MIGRATIONS_DIR);
  console.log("");

  const issues = validateMigrations();
  const files = readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  console.log(`  Archivos: ${files.length}`);
  console.log(`  Problemas: ${issues.length}`);
  console.log("");

  if (issues.length > 0) {
    console.log("Problemas encontrados:");
    for (const { file, issue } of issues) {
      console.log(`  ✗ ${file}: ${issue}`);
    }
    process.exit(1);
  }

  for (const file of files) {
    console.log(`  ✓ ${file}`);
  }

  console.log("");
  console.log("Todas las migraciones tienen estructura válida.");
}

main();
