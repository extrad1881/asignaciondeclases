import { expect, test } from "@playwright/test";
import { createServiceTestClient } from "../helpers/supabase-test-client";
import { login } from "./helpers";

test.describe.configure({ mode: "serial" });

const service = createServiceTestClient();
const runId = Date.now().toString(36).toUpperCase();
const classroomName = `E2E Aula ${runId}`;
const updatedClassroomName = `${classroomName} Editada`;
const careerCode = `EC${runId}`;
const careerName = `E2E Carrera Catálogo ${runId}`;
const subjectName = `E2E Materia ${runId}`;
const updatedSubjectName = `${subjectName} Editada`;
let classroomId = "";
let careerId = "";
let subjectId = "";

test.beforeAll(async () => {
  const { data: career, error: careerError } = await service
    .from("careers")
    .insert({
      code: careerCode,
      name: careerName,
      normalized_name: careerName.toLocaleUpperCase("es-MX"),
      active: true
    })
    .select("id")
    .single();
  if (careerError || !career) throw new Error(careerError?.message ?? "No se pudo crear la carrera E2E.");
  careerId = career.id;

  const { data: subject, error: subjectError } = await service
    .from("subjects")
    .insert({
      career_id: careerId,
      name: subjectName,
      normalized_name: subjectName.toLocaleUpperCase("es-MX"),
      quarter: 1,
      default_hours: 5,
      active: true
    })
    .select("id")
    .single();
  if (subjectError || !subject) throw new Error(subjectError?.message ?? "No se pudo crear la materia E2E.");
  subjectId = subject.id;
});

test.afterAll(async () => {
  if (classroomId) await service.from("classrooms").delete().eq("id", classroomId);
  if (subjectId) await service.from("subjects").delete().eq("id", subjectId);
  if (careerId) await service.from("careers").delete().eq("id", careerId);
  const auditedIds = [classroomId, subjectId].filter(Boolean);
  if (auditedIds.length > 0) await service.from("audit_logs").delete().in("record_id", auditedIds);
});

test("el administrador crea, edita y desactiva un aula desde escritorio", async ({ page }) => {
  await login(page);
  await page.goto("/aulas");

  const createSection = page.locator("section").filter({ hasText: "Agregar aula" }).first();
  await createSection.getByLabel("Nombre").fill(classroomName);
  await createSection.getByLabel("Tipo").fill("Laboratorio");
  await createSection.getByLabel("Capacidad").fill("28");
  await createSection.getByRole("button", { name: "Agregar aula" }).click();

  await expect(page.getByRole("status").filter({ hasText: "Aula agregada correctamente." })).toBeVisible();
  const { data: classroom, error: classroomError } = await service
    .from("classrooms")
    .select("id")
    .eq("name", classroomName)
    .single();
  expect(classroomError).toBeNull();
  classroomId = classroom?.id ?? "";

  await page.getByLabel("Buscar").fill(classroomName);
  const row = page.getByRole("row").filter({ hasText: classroomName });
  await row.getByText("Editar datos").click();
  await row.getByLabel("Nombre").fill(updatedClassroomName);
  await row.getByLabel("Capacidad").fill("32");
  await row.getByRole("button", { name: "Guardar cambios" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Guardar cambios" }).click();
  await expect(page.getByText("Aula actualizada correctamente.").last()).toBeVisible();

  await page.getByLabel("Buscar").fill(updatedClassroomName);
  const updatedRow = page.getByRole("row").filter({ hasText: updatedClassroomName });
  await updatedRow.getByRole("button", { name: "Desactivar" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Desactivar aula" }).click();
  await expect(page.getByText("Aula desactivada correctamente.").last()).toBeVisible();

  const { data: saved, error: savedError } = await service
    .from("classrooms")
    .select("name, kind, capacity, active")
    .eq("id", classroomId)
    .single();
  expect(savedError).toBeNull();
  expect(saved).toEqual({
    name: updatedClassroomName,
    kind: "Laboratorio",
    capacity: 32,
    active: false
  });
});

test("las materias de una carrera se pueden abrir y modificar desde escritorio", async ({ page }) => {
  await login(page);
  await page.goto("/carreras");

  await page.getByLabel("Buscar").fill(careerCode);
  const careerRow = page.getByRole("row").filter({ hasText: careerCode });
  await careerRow.getByRole("button", { name: "Ver y modificar" }).click();
  await expect(page).toHaveURL(new RegExp(`/carreras/${careerId}/materias$`));

  const subjectRow = page.getByRole("row").filter({ hasText: subjectName });
  await subjectRow.getByRole("textbox").fill(updatedSubjectName);
  await subjectRow.getByRole("button", { name: "Guardar" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Guardar materia" }).click();
  await expect(page.getByText("Materia actualizada correctamente.").last()).toBeVisible();

  const { data: saved, error } = await service
    .from("subjects")
    .select("name")
    .eq("id", subjectId)
    .single();
  expect(error).toBeNull();
  expect(saved?.name).toBe(updatedSubjectName);
});
