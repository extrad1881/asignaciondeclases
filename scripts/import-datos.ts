import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { config as loadEnv } from "dotenv";
import { createClient } from "@supabase/supabase-js";
import readXlsxFile, { readSheet as readXlsxSheet } from "read-excel-file/node";
import { isValidProfileCode, normalizeProfileCode } from "../lib/profiles";
import type { Database } from "../types/supabase";

function normalizeText(value: string) {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase();
}

loadEnv({ path: ".env.local" });
loadEnv();

type Row = Record<string, unknown>;
type CellValue = unknown;
type PublicTables = Database["public"]["Tables"];
type InsertRow<Table extends keyof PublicTables> = PublicTables[Table]["Insert"];

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceKey) {
  throw new Error(
    "Faltan NEXT_PUBLIC_SUPABASE_URL/SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY. Copia .env.local.example y usa las llaves de `supabase status`."
  );
}

const supabase = createClient<Database>(supabaseUrl, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false }
});

const profileAliases: Record<string, string> = {
  "ADMINISTRACION DE EMPRESAS": "ADEM",
  "ADMINISTRACION DE EMPRESAS TURISITICAS": "ADETUR",
  "ADMINISTRACION DE EMPRESAS TURISTICAS": "ADETUR",
  ARQUITECTURA: "ARQ",
  "COMERCIO INTERNACIONAL": "CINTER",
  "CONTADURIA PUBLICA": "CONPUB",
  "CRIMINOLOGIA Y CRIMINALISTICA": "CRIMYCRI",
  DERECHO: "DE",
  "DISENO GRAFICO": "DIGRAF",
  ENFERMERIA: "ENF",
  "INGENIERIA EN SISTEMAS": "SISCOM",
  MERCADOTECNIA: "MERC",
  NUTRICION: "NUT",
  PEDAGOGIA: "PED",
  PSICOLOGIA: "PSIC",
  TRANSVERSAL: "TRA"
};

function clean(value: unknown) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function headerKey(value: string) {
  return normalizeText(value).replace(/[^A-Z0-9]+/g, "_").replace(/^_|_$/g, "");
}

function normalizeRow(row: Row) {
  return Object.fromEntries(
    Object.entries(row).map(([key, value]) => [headerKey(key), typeof value === "string" ? clean(value) : value])
  ) as Row;
}

function splitProfiles(value: unknown) {
  return clean(value)
    .split(/[;,]/)
    .map((part) => normalizeText(part))
    .filter(Boolean)
    .map((profile) => profileAliases[profile] ?? profile)
    .map((profile) => normalizeProfileCode(profile))
    .filter(isValidProfileCode);
}

function uniqueRows<T>(rows: T[], keyFn: (row: T) => string) {
  const map = new Map<string, T>();
  for (const row of rows) map.set(keyFn(row), row);
  return Array.from(map.values());
}

function requiredColumns(rows: Row[], columns: string[], source: string) {
  const available = new Set(Object.keys(rows[0] ?? {}));
  const missing = columns.filter((column) => !available.has(column));
  if (missing.length > 0) {
    throw new Error(`${source}: faltan columnas obligatorias: ${missing.join(", ")}.`);
  }
}

function parseCsv(text: string) {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];

    if (char === '"' && quoted && next === '"') {
      cell += '"';
      index += 1;
      continue;
    }

    if (char === '"') {
      quoted = !quoted;
      continue;
    }

    if (char === "," && !quoted) {
      row.push(cell);
      cell = "";
      continue;
    }

    if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && next === "\n") index += 1;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
      continue;
    }

    cell += char;
  }

  row.push(cell);
  if (row.some((value) => value.trim())) rows.push(row);
  return rows;
}

function getCellValue(value: CellValue) {
  if (value == null) return null;
  if (value instanceof Date) return value.toISOString();
  return value;
}

function matrixToRows(matrix: CellValue[][]) {
  const [headers = [], ...body] = matrix;
  const normalizedHeaders = headers.map((header) => headerKey(clean(getCellValue(header))));

  const rows: Row[] = [];
  for (const values of body) {
    const item: Row = {};
    normalizedHeaders.forEach((header, index) => {
      if (!header) return;
      item[header] = getCellValue(values[index] ?? null);
    });
    if (Object.values(item).some((value) => clean(value))) rows.push(item);
  }
  return rows;
}

async function readSourceSheet(filePath: string, sheetName: string): Promise<Row[]> {
  const matrix: CellValue[][] = /\.csv$/i.test(filePath)
    ? parseCsv(readFileSync(filePath, "utf8"))
    : ((await readXlsxSheet(filePath, sheetName)) as CellValue[][]);
  const rows = matrixToRows(matrix).map(normalizeRow);
  console.log(`Hoja ${sheetName}: ${rows.length} filas; columnas: ${Object.keys(rows[0] ?? {}).join(", ")}`);
  return rows;
}

async function requireSuccessfulWrite(
  table: string,
  request: PromiseLike<{ error: { message: string } | null }>
) {
  const { error } = await request;
  if (error) throw new Error(`${table}: ${error.message}`);
}

function rowsToMap<T, Key extends keyof T>(rows: T[], key: Key) {
  return new Map(rows.map((row) => [row[key], row]));
}

function findDataWorkbook() {
  const datosDir = path.resolve("datos");
  const candidates = readdirSync(datosDir)
    .filter((file) => /^DB_Coordinacion_Academica\.(xlsx|xls|csv)$/i.test(file))
    .map((file) => path.join(datosDir, file));

  const xlsx = candidates.find((file) => /\.(xlsx|xls)$/i.test(file));
  if (!xlsx) throw new Error("No encontré datos/DB_Coordinacion_Academica.xlsx o .xls.");
  return xlsx;
}

async function importAcademicData() {
  const workbook = findDataWorkbook();
  const classRows = await readSourceSheet(workbook, "base_clases");
  const teacherRows = await readSourceSheet(workbook, "base_docentes");

  requiredColumns(classRows, ["CARRERA", "CUATRIMESTRE", "MATERIA", "PERFIL_REQUERIDO", "COORDINADOR"], "base_clases");
  requiredColumns(teacherRows, ["NOMBRE", "PERFILES_APTOS", "LINK_EXPEDIENTE", "EMAIL_DOCENTE", "COORDINADOR", "HORAS_MAXIMAS"], "base_docentes");

  const coordinatorNames = new Set<string>();
  const careerRows = new Map<string, InsertRow<"careers">>();
  const profileRows = new Map<string, InsertRow<"teacher_profiles">>();

  for (const row of classRows) {
    const coordinator = normalizeText(clean(row.COORDINADOR));
    if (coordinator) coordinatorNames.add(coordinator);

    const code = normalizeText(clean(row.CARRERA));
    if (code) {
      careerRows.set(code, {
        code,
        name: code,
        normalized_name: normalizeText(code),
        active: true
      });
    }

    for (const profile of splitProfiles(row.PERFIL_REQUERIDO)) {
      profileRows.set(profile, { code: profile, name: profile });
    }
  }

  for (const row of teacherRows) {
    const coordinator = normalizeText(clean(row.COORDINADOR));
    if (coordinator) coordinatorNames.add(coordinator);
    for (const profile of splitProfiles(row.PERFILES_APTOS)) {
      profileRows.set(profile, { code: profile, name: profile });
    }
  }

  await requireSuccessfulWrite(
    "coordinators",
    supabase
      .from("coordinators")
      .upsert(Array.from(coordinatorNames).map((name) => ({ name, active: true })), { onConflict: "name" })
  );
  await requireSuccessfulWrite(
    "careers",
    supabase.from("careers").upsert(Array.from(careerRows.values()), { onConflict: "code" })
  );
  await requireSuccessfulWrite(
    "teacher_profiles",
    supabase.from("teacher_profiles").upsert(Array.from(profileRows.values()), { onConflict: "code" })
  );

  const { data: coordinatorRecords, error: coordinatorRecordsError } = await supabase
    .from("coordinators")
    .select("id, name");
  if (coordinatorRecordsError) throw new Error(`coordinators: ${coordinatorRecordsError.message}`);
  const coordinatorsByName = rowsToMap(coordinatorRecords ?? [], "name");

  const { data: careerRecords, error: careerRecordsError } = await supabase
    .from("careers")
    .select("id, code");
  if (careerRecordsError) throw new Error(`careers: ${careerRecordsError.message}`);
  const careersByCode = rowsToMap(careerRecords ?? [], "code");

  const coordinatorCareerRows: Array<InsertRow<"coordinator_careers">> = [];
  const subjectRows = new Map<string, InsertRow<"subjects">>();

  for (const row of classRows) {
    const career = careersByCode.get(normalizeText(clean(row.CARRERA)));
    const coordinator = coordinatorsByName.get(normalizeText(clean(row.COORDINADOR)));
    if (career && coordinator) {
      coordinatorCareerRows.push({ career_id: career.id, coordinator_id: coordinator.id });
    }

    if (career && clean(row.MATERIA)) {
      const normalizedName = normalizeText(clean(row.MATERIA));
      const quarter = Number(row.CUATRIMESTRE);
      subjectRows.set(`${career.id}|${quarter}|${normalizedName}`, {
        career_id: career.id,
        quarter,
        name: clean(row.MATERIA),
        normalized_name: normalizedName,
        default_hours: 5,
        active: true
      });
    }
  }

  await requireSuccessfulWrite(
    "coordinator_careers",
    supabase.from("coordinator_careers").upsert(
      uniqueRows(coordinatorCareerRows, (row) => `${row.coordinator_id}|${row.career_id}`),
      { onConflict: "coordinator_id,career_id" }
    )
  );
  await requireSuccessfulWrite(
    "subjects",
    supabase.from("subjects").upsert(Array.from(subjectRows.values()), {
      onConflict: "career_id,quarter,normalized_name"
    })
  );

  const { data: subjects, error: subjectsError } = await supabase
    .from("subjects")
    .select("id, career_id, quarter, normalized_name");
  if (subjectsError) throw new Error(`subjects: ${subjectsError.message}`);

  const subjectsByKey = new Map(
    (subjects ?? []).map((subject) => [
      `${subject.career_id}|${subject.quarter}|${subject.normalized_name}`,
      subject
    ])
  );

  const classRequirementRows: Array<InsertRow<"class_requirements">> = [];
  for (const row of classRows) {
    const career = careersByCode.get(normalizeText(clean(row.CARRERA)));
    if (!career) continue;
    const subject = subjectsByKey.get(`${career.id}|${Number(row.CUATRIMESTRE)}|${normalizeText(clean(row.MATERIA))}`);
    if (!subject) continue;
    for (const profile of splitProfiles(row.PERFIL_REQUERIDO)) {
      classRequirementRows.push({ subject_id: subject.id, profile_code: profile });
    }
  }
  await requireSuccessfulWrite(
    "class_requirements",
    supabase.from("class_requirements").upsert(
      uniqueRows(classRequirementRows, (row) => `${row.subject_id}|${row.profile_code}`),
      { onConflict: "subject_id,profile_code" }
    )
  );

  const teacherImportRows = teacherRows.map((row) => {
    const maxHours = Number(row.HORAS_MAXIMAS);
    const coordinator = coordinatorsByName.get(normalizeText(clean(row.COORDINADOR)));
    return {
      name: clean(row.NOMBRE),
      normalized_name: normalizeText(clean(row.NOMBRE)),
      email: clean(row.EMAIL_DOCENTE) || null,
      expediente_url: clean(row.LINK_EXPEDIENTE) || null,
      max_hours: Number.isFinite(maxHours) && maxHours > 0 ? maxHours : 20,
      responsible_coordinator_id: coordinator?.id ?? null,
      active: true
    };
  });

  await requireSuccessfulWrite(
    "teachers",
    supabase.from("teachers").upsert(teacherImportRows, { onConflict: "normalized_name" })
  );
  const { data: teacherRecords, error: teacherRecordsError } = await supabase
    .from("teachers")
    .select("id, normalized_name, responsible_coordinator_id");
  if (teacherRecordsError) throw new Error(`teachers: ${teacherRecordsError.message}`);
  const teachersByName = rowsToMap(teacherRecords ?? [], "normalized_name");

  const teacherProfileRows: Array<InsertRow<"teacher_available_profiles">> = [];
  const coordinatorTeacherRows: Array<InsertRow<"coordinator_teachers">> = [];

  for (const row of teacherRows) {
    const teacher = teachersByName.get(normalizeText(clean(row.NOMBRE)));
    if (!teacher) continue;
    for (const profile of splitProfiles(row.PERFILES_APTOS)) {
      teacherProfileRows.push({ teacher_id: teacher.id, profile_code: profile });
    }
    if (teacher.responsible_coordinator_id) {
      coordinatorTeacherRows.push({
        coordinator_id: teacher.responsible_coordinator_id,
        teacher_id: teacher.id
      });
    }
  }

  await requireSuccessfulWrite(
    "teacher_available_profiles",
    supabase.from("teacher_available_profiles").upsert(
      uniqueRows(teacherProfileRows, (row) => `${row.teacher_id}|${row.profile_code}`),
      { onConflict: "teacher_id,profile_code" }
    )
  );
  await requireSuccessfulWrite(
    "coordinator_teachers",
    supabase.from("coordinator_teachers").upsert(
      uniqueRows(coordinatorTeacherRows, (row) => `${row.coordinator_id}|${row.teacher_id}`),
      { onConflict: "coordinator_id,teacher_id" }
    )
  );

  console.log(
    `Importación académica: ${careerRows.size} carreras, ${subjectRows.size} materias, ${teacherImportRows.length} docentes, ${profileRows.size} perfiles.`
  );
}

function findClassroomWorkbook() {
  const assetsDir = path.resolve("assets");
  if (!existsSync(assetsDir)) return null;
  return (
    readdirSync(assetsDir)
      .filter((file) => /\.xlsx$/i.test(file) && /AULAS/i.test(normalizeText(file)))
      .map((file) => path.join(assetsDir, file))[0] ?? null
  );
}

async function importClassrooms() {
  const workbookPath = findClassroomWorkbook();
  if (!workbookPath) {
    console.log("No encontré workbook de aulas en assets; se conserva seed.sql.");
    return;
  }

  const names = new Set<string>();
  const sheets = await readXlsxFile(workbookPath);
  for (const sheet of sheets) {
    const matrix = sheet.data as CellValue[][];
    for (const row of matrix) {
      const values = row.slice(0, 10);
      for (const cell of values) {
        const value = getCellValue(cell);
        const text = clean(value);
        const directNumber = typeof value === "number" && value > 0 && value < 1000 ? String(value) : null;
        const aulaMatch = text.match(/^AULA\s+(\d{1,3})$/i);
        const leadingNumber = text.match(/^(\d{1,3})(?:\s|\(|$)/);
        const name = directNumber ?? aulaMatch?.[1] ?? leadingNumber?.[1];
        if (name && Number(name) > 0) names.add(name);
      }
    }
  }

  await requireSuccessfulWrite(
    "classrooms",
    supabase.from("classrooms").upsert(
      Array.from(names).map((name) => ({ name, kind: "Aula", active: true })),
      { onConflict: "name" }
    )
  );

  console.log(`Importación de aulas: ${names.size} aulas detectadas desde assets.`);
}

async function main() {
  await importAcademicData();
  await importClassrooms();
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
