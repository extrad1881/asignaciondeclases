import { expect, test } from "@playwright/test";
import { createServiceTestClient } from "../helpers/supabase-test-client";
import { login } from "./helpers";

test.describe.configure({ mode: "serial" });

const runId = Date.now().toString(36).toUpperCase();
const cycleCode = `E2E-${runId}`;
const cycleName = `Ciclo E2E ${runId}`;
const careerCode = `E2E${runId}`;
const careerName = `Carrera E2E ${runId}`;
const cohortName = `Cohorte E2E ${runId}`;
const service = createServiceTestClient();
const runCycleAutomation = process.env.PLAYWRIGHT_CYCLE_AUTOMATION === "true";
let careerId = "";
let cohortId = "";
let originalCycleId = "";
let initialGroupId = "";
let cycleWasActivated = false;

test.beforeAll(async () => {
  const { data: career, error } = await service
    .from("careers")
    .insert({
      code: careerCode,
      name: careerName,
      normalized_name: careerName.toLocaleLowerCase("es-MX"),
      active: true
    })
    .select("id")
    .single();

  if (error || !career) throw new Error(`No se pudo preparar la carrera E2E: ${error?.message}`);
  careerId = career.id;

  const { error: subjectsError } = await service.from("subjects").insert([
    {
      career_id: careerId,
      name: `${careerName} Materia Q1`,
      normalized_name: `${careerName} MATERIA Q1`,
      quarter: 1,
      default_hours: 5,
      active: true
    },
    {
      career_id: careerId,
      name: `${careerName} Materia Q2`,
      normalized_name: `${careerName} MATERIA Q2`,
      quarter: 2,
      default_hours: 5,
      active: true
    }
  ]);
  if (subjectsError) throw new Error(`No se pudieron preparar las materias E2E: ${subjectsError.message}`);

  const { data: activeCycle, error: activeCycleError } = await service
    .from("academic_cycles")
    .select("id")
    .eq("status", "active")
    .single();
  if (activeCycleError || !activeCycle) {
    throw new Error(activeCycleError?.message ?? "No hay un ciclo activo para preparar E2E.");
  }
  originalCycleId = activeCycle.id;
});

test.afterAll(async () => {
  if (cycleWasActivated) {
    const { error: finalizeTargetError } = await service
      .from("academic_cycles")
      .update({ status: "finalized" })
      .eq("code", cycleCode);
    if (finalizeTargetError) throw new Error(`No se pudo finalizar el ciclo E2E: ${finalizeTargetError.message}`);

    const { error: restoreCycleError } = await service
      .from("academic_cycles")
      .update({ status: "active" })
      .eq("id", originalCycleId);
    if (restoreCycleError) throw new Error(`No se pudo restaurar el ciclo original: ${restoreCycleError.message}`);
  }

  if (cohortId) {
    await service.from("cohort_subject_history").delete().eq("cohort_group_id", cohortId);
    const { error: groupsError } = await service.from("groups").delete().eq("cohort_group_id", cohortId);
    if (groupsError) throw new Error(`No se pudieron limpiar los grupos E2E: ${groupsError.message}`);
  }

  const { error: cohortError } = await service.from("cohort_groups").delete().eq("name", cohortName);
  if (cohortError) throw new Error(`No se pudo limpiar la cohorte E2E: ${cohortError.message}`);

  const { error: cycleError } = await service.from("academic_cycles").delete().eq("code", cycleCode);
  if (cycleError) throw new Error(`No se pudo limpiar el ciclo E2E: ${cycleError.message}`);

  const { error: subjectsError } = await service.from("subjects").delete().eq("career_id", careerId);
  if (subjectsError) throw new Error(`No se pudieron limpiar las materias E2E: ${subjectsError.message}`);

  const { error: careerError } = await service.from("careers").delete().eq("code", careerCode);
  if (careerError) throw new Error(`No se pudo limpiar la carrera E2E: ${careerError.message}`);
});

test("el administrador crea un ciclo desde el navegador sin error inesperado", async ({ page }) => {
  await login(page);
  await page.goto("/ciclos");

  await page.getByLabel("Código", { exact: true }).fill(cycleCode);
  await page.getByLabel("Nombre", { exact: true }).fill(cycleName);
  await page.getByLabel("Fecha inicio").fill("2027-01-04");
  await page.getByLabel("Fecha fin").fill("2027-04-23");
  await page.getByRole("button", { name: "Crear ciclo" }).click();

  await expect(page.getByRole("status").filter({ hasText: "Ciclo escolar creado correctamente." }).first()).toBeVisible();
  await expect(page.getByRole("row").filter({ hasText: cycleName })).toBeVisible();

  const { data, error } = await service
    .from("academic_cycles")
    .select("code, status")
    .eq("code", cycleCode)
    .single();
  expect(error).toBeNull();
  expect(data).toEqual({ code: cycleCode, status: "draft" });
});

test("el administrador crea una cohorte inicial sin duplicar trabajo por ciclo", async ({ page }) => {
  await login(page);
  await page.goto("/cohortes");

  await page.getByLabel("Nombre", { exact: true }).fill(cohortName);
  await page.getByLabel("Carrera").selectOption({ label: `${careerCode} - ${careerName}` });
  await page.getByLabel("Modalidad").selectOption("escolarizado");
  await page.getByLabel("Turno").selectOption("matutino");
  await page.getByRole("button", { name: "Crear cohorte" }).click();

  await expect(page).toHaveURL(/\/grupos\/nuevo$/);

  const { data, error } = await service
    .from("cohort_groups")
    .select("id, name, current_quarter, status")
    .eq("name", cohortName)
    .single();
  expect(error).toBeNull();
  expect(data).toMatchObject({ name: cohortName, current_quarter: 1, status: "active" });
  cohortId = data?.id ?? "";
});

test("la activación del ciclo genera el siguiente grupo de la cohorte", async ({ page }) => {
  test.skip(!runCycleAutomation, "La activación se ejecuta únicamente sobre una base local reiniciada o en CI.");

  const { data: subjectQ1, error: subjectError } = await service
    .from("subjects")
    .select("id")
    .eq("career_id", careerId)
    .eq("quarter", 1)
    .single();
  expect(subjectError).toBeNull();

  const { data: classroom, error: classroomError } = await service
    .from("classrooms")
    .select("id")
    .eq("active", true)
    .limit(1)
    .single();
  expect(classroomError).toBeNull();

  const { data: initialGroup, error: groupError } = await service
    .from("groups")
    .insert({
      academic_cycle_id: originalCycleId,
      career_id: careerId,
      cohort_group_id: cohortId,
      quarter: 1,
      modality: "escolarizado",
      shift: "matutino",
      name: `${cohortName} Q1`,
      classroom_id: classroom?.id ?? null,
      status: "draft"
    })
    .select("id")
    .single();
  expect(groupError).toBeNull();
  initialGroupId = initialGroup?.id ?? "";

  const { error: relationError } = await service.from("group_subjects").insert({
    group_id: initialGroupId,
    subject_id: subjectQ1?.id,
    hours_per_week: 5,
    status: "active"
  });
  expect(relationError).toBeNull();

  await login(page);
  await page.goto("/ciclos");
  const cycleRow = page.getByRole("row").filter({ hasText: cycleName });
  await cycleRow.getByRole("button", { name: "Activar y generar" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Activar ciclo" }).click();
  cycleWasActivated = true;

  await expect.poll(async () => {
    const { data } = await service
      .from("cohort_groups")
      .select("current_quarter")
      .eq("id", cohortId)
      .single();
    return data?.current_quarter;
  }).toBe(2);
  const { data: generatedGroup, error: generatedError } = await service
    .from("groups")
    .select("id, quarter, group_subjects(subject_id)")
    .eq("cohort_group_id", cohortId)
    .eq("academic_cycle_id", (await service.from("academic_cycles").select("id").eq("code", cycleCode).single()).data?.id ?? "")
    .single();
  expect(generatedError).toBeNull();
  expect(generatedGroup?.quarter).toBe(2);
  expect(generatedGroup?.group_subjects).toHaveLength(1);

  const { data: generatedSubject, error: generatedSubjectError } = await service
    .from("subjects")
    .select("quarter")
    .eq("id", generatedGroup?.group_subjects[0]?.subject_id ?? "")
    .single();
  expect(generatedSubjectError).toBeNull();
  expect(generatedSubject?.quarter).toBe(2);
});
