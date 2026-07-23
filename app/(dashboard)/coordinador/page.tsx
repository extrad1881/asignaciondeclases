import Link from "next/link";
import { redirect } from "next/navigation";
import { CalendarPlus, Clock, LayoutGrid, Save, Trash2, UserCog, Users } from "lucide-react";
import {
  createCustomScheduleBlockStateAction,
  deleteAssignmentAction,
  deleteAssignmentFeedbackAction,
  updateAssignmentAction,
  updateAssignmentFeedbackAction,
  updateGroupSubjectHoursAction,
  updateTeacherMaxHoursAction,
  updateTeacherMaxHoursFeedbackAction,
  updateTeacherProfilesAction,
  updateTeacherProfilesFeedbackAction
} from "@/app/(dashboard)/actions";
import { AssignmentForm } from "@/components/forms/assignment-form";
import { ProfileCheckboxGroup } from "@/components/forms/profile-checkbox-group";
import { GroupForm } from "@/components/groups/group-form";
import { AssignmentCard } from "@/components/grupos/assignment-card";
import { SubjectHoursCard, type SubjectHoursItem } from "@/components/grupos/subject-hours-card";
import { SectionHeader } from "@/components/section-header";
import { GroupScheduleBoard } from "@/components/schedule/group-schedule-board";
import { Badge } from "@/components/ui/badge";
import { ActionStateForm } from "@/components/ui/action-state-form";
import { Button } from "@/components/ui/button";
import { ConfirmActionButton } from "@/components/ui/confirm-action-button";
import { DataTable } from "@/components/ui/data-table";
import { Input } from "@/components/ui/input";
import { MetricCard } from "@/components/ui/metric-card";
import { ResponsiveTable } from "@/components/ui/responsive-table";
import { Select } from "@/components/ui/select";
import { MODALITIES, SHIFTS, WEEKDAYS } from "@/lib/constants";
import { isValidProfileCode } from "@/lib/profiles";
import { createClient } from "@/lib/supabase/server";
import { requireActiveProfileOrRedirect } from "@/lib/supabase/auth-helpers";
import { fetchAllRows } from "@/lib/supabase/pagination";
import { formatHours } from "@/lib/utils";

export const dynamic = "force-dynamic";

type GroupSubjectProfileSource = {
  required_profile_code: string | null;
  subjects: {
    class_requirements: Array<{ profile_code: string }> | null;
  } | null;
};

function requiredProfilesFor(groupSubject: GroupSubjectProfileSource) {
  if (groupSubject.required_profile_code && isValidProfileCode(groupSubject.required_profile_code)) {
    return [groupSubject.required_profile_code];
  }

  return (groupSubject.subjects?.class_requirements ?? [])
    .map((requirement) => requirement.profile_code)
    .filter(isValidProfileCode);
}

function templateLabel(modality: string, shift: string) {
  const modalityLabel = MODALITIES.find((item) => item.value === modality)?.label ?? modality;
  const shiftLabel = SHIFTS.find((item) => item.value === shift)?.label ?? shift;
  return `${modalityLabel} ${shiftLabel}`;
}

export default async function CoordinatorPage() {
  const profile = await requireActiveProfileOrRedirect();
  if (profile.role_code !== "coordinator") redirect("/dashboard");

  const supabase = await createClient();
  const [
    { data: coordinator },
    { data: cycles = [] },
    { data: careers = [] },
    { data: classrooms = [] },
    { data: profiles = [] },
    { data: teachers = [] },
    { data: groups = [] },
    { data: scheduleBlocks = [] }
  ] = await Promise.all([
    supabase.from("coordinators").select("id, name").eq("profile_id", profile.id).maybeSingle(),
    supabase.from("academic_cycles").select("id, code, name").eq("status", "active").order("code"),
    supabase.from("careers").select("id, code, name").eq("active", true).order("code"),
    supabase.from("classrooms").select("id, name").eq("active", true).order("name"),
    supabase.from("teacher_profiles").select("code, name").order("code"),
    supabase
      .from("teachers")
      .select("id, name, email, max_hours, assigned_hours, active, teacher_available_profiles(profile_code)")
      .eq("active", true)
      .order("name")
      .limit(300),
    supabase
      .from("groups")
      .select(
        "id, name, quarter, modality, shift, status, academic_cycles(code), careers(code, name), classrooms(name), group_subjects(id, hours_per_week, required_profile_code, subjects(id, name, quarter, class_requirements(profile_code)))"
      )
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(80),
    supabase
      .from("schedule_blocks")
      .select("id, label, starts_at, ends_at, day_of_week, is_custom, created_by, module, schedule_templates!inner(code, label, modality, shift, asset_path)")
      .eq("active", true)
      .or(`is_custom.eq.false,created_by.eq.${profile.id}`)
      .order("day_of_week")
      .order("module")
      .order("starts_at")
  ]);

  const groupRows = groups ?? [];
  const teacherRows = teachers ?? [];
  const cycleRows = cycles ?? [];
  const careerRows = careers ?? [];
  const classroomRows = classrooms ?? [];
  const careerIds = careerRows.map((career) => career.id);
  const subjectRows = careerIds.length === 0
    ? []
    : await fetchAllRows(
        (from, to) =>
          supabase
            .from("subjects")
            .select("id, name, career_id, quarter, default_hours")
            .eq("active", true)
            .in("career_id", careerIds)
            .order("quarter")
            .order("name")
            .order("id")
            .range(from, to),
        { label: "Materias activas" }
      );
  const scheduleBlockRows = scheduleBlocks ?? [];
  const profileOptions = (profiles ?? []).filter((teacherProfile) => isValidProfileCode(teacherProfile.code));
  const groupSubjectIds = groupRows.flatMap((group) =>
    (group.group_subjects ?? []).map((subject) => subject.id)
  );

  const { data: assignments = [] } = groupSubjectIds.length > 0
    ? await supabase
        .from("assignments")
        .select("id, group_subject_id, schedule_block_id, duration_hours, teachers(name), classrooms(id, name), group_subjects(subjects(name))")
        .in("group_subject_id", groupSubjectIds)
        .eq("status", "active")
    : { data: [] };

  const assignmentRows = assignments ?? [];

  const teacherOptions = teacherRows.map((teacher) => ({
    id: teacher.id,
    label: `${teacher.name} - ${formatHours(teacher.assigned_hours)} / ${formatHours(teacher.max_hours)} h`,
    profileCodes: (teacher.teacher_available_profiles ?? [])
      .map((teacherProfile) => teacherProfile.profile_code)
      .filter(isValidProfileCode)
  }));

  const stats = [
    { label: "Carreras", value: careerRows.length, icon: LayoutGrid, tone: "info" as const, description: "Carreras asignadas" },
    { label: "Docentes a cargo", value: teacherRows.length, icon: Users, tone: "success" as const, description: "Docentes bajo tu responsabilidad" },
    { label: "Grupos visibles", value: groupRows.length, icon: UserCog, tone: "neutral" as const, description: "Grupos activos asignados" },
    { label: "Asignaciones", value: assignmentRows.length, icon: Clock, tone: "warning" as const, description: "Asignaciones activas" }
  ];

  return (
    <>
      <SectionHeader eyebrow="Coordinador" title={coordinator?.name ?? "Panel de coordinador"}>
        <Badge tone="info">Permisos por carrera y docentes a cargo</Badge>
      </SectionHeader>

      <section className="mb-6 grid gap-3 md:grid-cols-4">
        {stats.map((item) => (
          <MetricCard
            description={item.description}
            icon={item.icon}
            key={item.label}
            label={item.label}
            tone={item.tone}
            value={item.value}
          />
        ))}
      </section>

      <section className="mb-8">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-ink">Crear grupo</h2>
            <p className="text-sm text-muted">Las carreras y materias disponibles dependen de tu coordinación asignada.</p>
          </div>
          <Link className="text-sm font-medium text-brand hover:text-brandDeep" href="/grupos">
            Ver grupos
          </Link>
        </div>
        <GroupForm
          careers={careerRows}
          classrooms={classroomRows}
          canCreateExternalSubjects
          cohorts={[]}
          cycles={cycleRows}
          profiles={profileOptions}
          subjects={subjectRows}
        />
      </section>

      <section className="mb-8">
        <div className="mb-3">
          <h2 className="text-lg font-semibold text-ink">Docentes a cargo</h2>
          <p className="text-sm text-muted">Puedes ajustar perfiles aptos y horas máximas sin cambiar datos generales del docente.</p>
        </div>
        <DataTable
          emptyLabel="No tienes docentes asignados todavia."
          headers={["Docente", "Correo", "Perfiles aptos", "Horas", "Editar perfiles", "Horas máximas"]}
          rows={teacherRows.map((teacher) => [
            <span className="font-medium text-ink" key="name">{teacher.name}</span>,
            teacher.email ?? <span className="text-muted-foreground">Sin correo</span>,
            <div className="flex flex-wrap gap-1" key="profiles">
              {(teacher.teacher_available_profiles ?? []).filter((item) => isValidProfileCode(item.profile_code)).length === 0 ? (
                <span className="text-muted-foreground">Sin perfiles</span>
              ) : (
                (teacher.teacher_available_profiles ?? [])
                  .filter((item) => isValidProfileCode(item.profile_code))
                  .map((item) => <Badge key={item.profile_code}>{item.profile_code}</Badge>)
              )}
            </div>,
            `${formatHours(teacher.assigned_hours)} / ${formatHours(teacher.max_hours)}`,
            <form action={updateTeacherProfilesAction} className="grid min-w-56 gap-2" key="profiles-form">
              <input name="teacher_id" type="hidden" value={teacher.id} />
              <ProfileCheckboxGroup
                maxHeight="max-h-36"
                profiles={profileOptions}
                selected={(teacher.teacher_available_profiles ?? [])
                  .map((item) => item.profile_code)
                  .filter(isValidProfileCode)}
              />
              <ConfirmActionButton
                action={updateTeacherProfilesFeedbackAction}
                affectedName={teacher.name}
                className="h-8 px-3"
                confirmLabel="Guardar perfiles"
                description="Se reemplazaran los perfiles aptos del docente a tu cargo."
                title="Modificar perfiles del docente"
                variant="secondary"
              >
                <Save className="h-4 w-4" />
                Guardar
              </ConfirmActionButton>
            </form>,
            <form action={updateTeacherMaxHoursAction} className="grid min-w-36 gap-2" key="hours-form">
              <input name="teacher_id" type="hidden" value={teacher.id} />
              <Input defaultValue={teacher.max_hours ?? 20} min={teacher.assigned_hours ?? 0} name="max_hours" step={0.5} type="number" />
              <ConfirmActionButton
                action={updateTeacherMaxHoursFeedbackAction}
                affectedName={teacher.name}
                className="h-8 px-3"
                confirmLabel="Guardar horas"
                description="Se modificara el limite de horas del docente. No puede quedar debajo de las horas ya asignadas."
                title="Modificar horas máximas"
                variant="secondary"
              >
                <Save className="h-4 w-4" />
                Guardar
              </ConfirmActionButton>
            </form>
          ])}
        />
      </section>

      <section className="space-y-7">
        <div>
          <h2 className="text-lg font-semibold text-ink">Dashboard visual de grupos</h2>
          <p className="text-sm text-muted">Cada grupo usa el cuadro de horario correspondiente a su modalidad y turno.</p>
        </div>

        {groupRows.length === 0 ? (
          <div className="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
            Todavía no hay grupos activos en tus carreras asignadas.
          </div>
        ) : (
          groupRows.map((group) => {
            const groupSubjects = (group.group_subjects ?? []).map((item) => ({
              id: item.id,
              label: `${item.subjects?.name} (${item.hours_per_week ?? 0} h)`,
              requiredProfiles: requiredProfilesFor(item),
              loadHours: Number(item.hours_per_week ?? 1.5)
            }));
            const groupSubjectIdSet = new Set(groupSubjects.map((subject) => subject.id));
            const groupAssignments = assignmentRows.filter((assignment) =>
              groupSubjectIdSet.has(assignment.group_subject_id)
            );

            const assignedMap = new Map<string, number>();
            for (const a of groupAssignments) {
              const prev = assignedMap.get(a.group_subject_id) ?? 0;
              assignedMap.set(a.group_subject_id, prev + Number(a.duration_hours ?? 0));
            }

            const subjectHours = Object.fromEntries(
              groupSubjects.map((s) => [s.id, {
                total: s.loadHours,
                assigned: assignedMap.get(s.id) ?? 0
              }])
            );

            const groupHoursStatus: Array<SubjectHoursItem & { remaining: number }> = (
              group.group_subjects ?? []
            ).map((gs) => {
              const assigned = assignedMap.get(gs.id) ?? 0;
              const total = Number(gs.hours_per_week ?? 0);
              const remaining = total - assigned;
              return {
                group_subject_id: gs.id,
                subject_name: gs.subjects?.name ?? "Materia externa",
                hours_per_week: total,
                assigned_hours: assigned,
                remaining,
                status: assigned === 0 ? "sin_asignar" :
                         remaining > 0 ? "incompleta" :
                         remaining === 0 ? "completa" : "excedida"
              };
            });
            const groupBlocks = scheduleBlockRows
              .filter((block) => block.schedule_templates?.modality === group.modality && block.schedule_templates?.shift === group.shift)
              .map((block) => ({
                id: block.id,
                label: block.label,
                dayOfWeek: block.day_of_week,
                startsAt: block.starts_at,
                endsAt: block.ends_at,
                isCustom: block.is_custom,
                module: block.module ?? undefined
              }));
            const groupBlockOptions = groupBlocks.map((block) => ({ id: block.id, label: block.label }));
            const classroomOptions = classroomRows.map((classroom) => ({ id: classroom.id, name: classroom.name }));
            const groupAssignmentItems = groupAssignments.map((assignment) => ({
              id: assignment.id,
              group_id: group.id,
              schedule_block_id: assignment.schedule_block_id ?? "",
              duration_hours: assignment.duration_hours ?? 0,
              subject_name: assignment.group_subjects?.subjects?.name ?? "Sin materia",
              teacher_name: assignment.teachers?.name ?? "Sin docente",
              block_label: groupBlocks.find((block) => block.id === assignment.schedule_block_id)?.label ?? "Sin bloque",
              classroom_id: assignment.classrooms?.id ?? null,
              classroom_name: assignment.classrooms?.name ?? null
            }));
            const assetPath = scheduleBlockRows.find(
              (block) => block.schedule_templates?.modality === group.modality && block.schedule_templates?.shift === group.shift
            )?.schedule_templates?.asset_path;

            return (
              <section className="space-y-4 border-t border-line pt-6" key={group.id}>
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div>
                    <Link className="text-xl font-semibold text-ink hover:text-brand" href={`/grupos/${group.id}`}>
                      {group.name}
                    </Link>
                    <p className="text-sm text-muted">
                      {group.careers?.code} - Cuatrimestre {group.quarter} - {templateLabel(group.modality, group.shift)}
                    </p>
                  </div>
                  <Badge tone="success">{group.academic_cycles?.code ?? "Ciclo activo"}</Badge>
                </div>

                <GroupScheduleBoard
                  assetPath={assetPath}
                  assignments={groupAssignments.map((assignment) => ({
                    id: assignment.id,
                    scheduleBlockId: assignment.schedule_block_id,
                    subjectName: assignment.group_subjects?.subjects?.name,
                    teacherName: assignment.teachers?.name,
                    classroomName: assignment.classrooms?.name ?? group.classrooms?.name
                  }))}
                  blocks={groupBlocks}
                />

                <div className="grid gap-4 xl:grid-cols-[1fr_360px]">
                  <div>
                    <h3 className="mb-2 text-base font-semibold text-ink">Asignar docente</h3>
                    <AssignmentForm
                      assignments={groupAssignments.map((assignment) => ({
                        id: assignment.id,
                        scheduleBlockId: assignment.schedule_block_id,
                        subjectName: assignment.group_subjects?.subjects?.name,
                        teacherName: assignment.teachers?.name
                      }))}
                      blocks={groupBlocks}
                      classrooms={classroomRows.map((classroom) => ({
                        id: classroom.id,
                        label: classroom.name
                      }))}
                      groupSubjects={groupSubjects}
                      subjectHours={subjectHours}
                      teachers={teacherOptions}
                    />

                    <div className="mt-4 rounded-md border border-line bg-card p-4 shadow-subtle">
                      <h4 className="mb-2 text-sm font-semibold text-ink">Límites por materia</h4>
                      <ResponsiveTable
                        cards={
                          <ul className="grid gap-3 sm:grid-cols-2">
                            {groupHoursStatus.map((item) => (
                              <li key={item.group_subject_id}>
                                <SubjectHoursCard groupId={group.id} item={item} />
                              </li>
                            ))}
                          </ul>
                        }
                        table={
                          <DataTable
                            emptyLabel="No hay materias en este grupo."
                            headers={["Materia", "Límite", "Asignadas", "Estado", "Editar límite"]}
                            rows={groupHoursStatus.map((item) => {
                              return [
                                item.subject_name,
                                `${item.hours_per_week} h/semana`,
                                `${item.assigned_hours} h`,
                                <Badge
                                  key="status"
                                  tone={
                                    item.status === "completa" ? "success" :
                                    item.status === "excedida" ? "danger" :
                                    item.status === "incompleta" ? "warning" : "neutral"
                                  }
                                >
                                  {item.status === "completa" ? "Completa" :
                                   item.status === "excedida" ? "Excedida" :
                                   item.status === "incompleta" ? `Faltan ${item.remaining} h` : "Sin asignar"}
                                </Badge>,
                                <ActionStateForm
                                  action={updateGroupSubjectHoursAction}
                                  className="grid gap-2 md:grid-cols-[100px_auto]"
                                  key={`edit-${item.group_subject_id}`}
                                >
                                  <input name="group_subject_id" type="hidden" value={item.group_subject_id} />
                                  <input name="group_id" type="hidden" value={group.id} />
                                  <Input
                                    className="h-8"
                                    defaultValue={item.hours_per_week}
                                    max={99}
                                    min={0.5}
                                    name="hours_per_week"
                                    required
                                    step={0.5}
                                    type="number"
                                  />
                                  <ConfirmActionButton
                                    affectedName={item.subject_name}
                                    className="h-8 px-3 text-xs"
                                    confirmLabel="Actualizar límite"
                                    description={`Se cambiará el límite semanal de ${item.subject_name} de ${item.hours_per_week} h a otro valor.`}
                                    title="Modificar límite de horas"
                                    variant="secondary"
                                  >
                                    Guardar
                                  </ConfirmActionButton>
                                </ActionStateForm>
                              ];
                            })}
                          />
                        }
                      />
                    </div>

                    <div className="mt-4">
                      <h3 className="mb-2 text-base font-semibold text-ink">Asignaciones activas</h3>
                      <ResponsiveTable
                        cards={
                          <ul className="grid gap-3 sm:grid-cols-2">
                            {groupAssignmentItems.map((item) => (
                              <li key={item.id}>
                                <AssignmentCard
                                  blocks={groupBlockOptions}
                                  classrooms={classroomOptions}
                                  hasHistory={false}
                                  item={item}
                                />
                              </li>
                            ))}
                          </ul>
                        }
                        table={
                          <DataTable
                            emptyLabel="Todavía no hay asignaciones en este grupo."
                            headers={["Materia", "Docente", "Bloque", "Horas", "Cambiar", "Eliminar"]}
                            rows={groupAssignments.map((assignment) => [
                              assignment.group_subjects?.subjects?.name,
                              assignment.teachers?.name,
                              groupBlocks.find((block) => block.id === assignment.schedule_block_id)?.label ?? "Sin bloque",
                              `${assignment.duration_hours ?? 0} h`,
                              <form action={updateAssignmentAction} className="grid min-w-[520px] gap-2 md:grid-cols-[1fr_110px_150px_auto]" key="update">
                                <input name="assignment_id" type="hidden" value={assignment.id} />
                                <input name="group_id" type="hidden" value={group.id} />
                                <Select defaultValue={assignment.schedule_block_id ?? ""} name="schedule_block_id" required>
                                  {groupBlocks.map((block) => (
                                    <option key={block.id} value={block.id}>
                                      {block.label}
                                    </option>
                                  ))}
                                </Select>
                                <Input
                                  defaultValue={assignment.duration_hours ?? 1.5}
                                  max={99}
                                  min={0.5}
                                  name="duration_hours"
                                  required
                                  step={0.5}
                                  type="number"
                                />
                                <Select defaultValue={assignment.classrooms?.id ?? ""} name="classroom_id">
                                  <option value="">Aula del grupo</option>
                                  {classroomRows.map((classroom) => (
                                    <option key={classroom.id} value={classroom.id}>
                                      {classroom.name}
                                    </option>
                                  ))}
                                </Select>
                                <ConfirmActionButton
                                  action={updateAssignmentFeedbackAction}
                                  affectedName={`${assignment.group_subjects?.subjects?.name ?? "Asignación"} - ${assignment.teachers?.name ?? "Docente"}`}
                                  className="h-10 px-3"
                                  confirmLabel="Guardar cambio"
                                  description="Se modificará el horario, aula y horas de esta asignación activa."
                                  title="Modificar asignación"
                                  variant="secondary"
                                >
                                  Guardar
                                </ConfirmActionButton>
                              </form>,
                              <form action={deleteAssignmentAction} key="delete">
                                <input name="assignment_id" type="hidden" value={assignment.id} />
                                <input name="group_id" type="hidden" value={group.id} />
                                <ConfirmActionButton
                                  action={deleteAssignmentFeedbackAction}
                                  affectedName={`${assignment.group_subjects?.subjects?.name ?? "Asignación"} - ${assignment.teachers?.name ?? "Docente"}`}
                                  className="h-10 px-3"
                                  confirmLabel="Eliminar asignación"
                                  danger
                                  description="La asignación se eliminará y el docente liberará esas horas."
                                  title="Eliminar asignación"
                                >
                                  <Trash2 className="h-4 w-4" />
                                  Eliminar
                                </ConfirmActionButton>
                              </form>
                            ])}
                          />
                        }
                      />
                    </div>
                  </div>

                  <div>
                    <h3 className="mb-2 text-base font-semibold text-ink">Bloque personalizado</h3>
                    <ActionStateForm action={createCustomScheduleBlockStateAction} className="grid gap-3 rounded-md border border-line bg-card p-4 shadow-subtle">
                      <input name="group_id" type="hidden" value={group.id} />
                      <label className="text-sm font-medium text-ink">
                        Día
                        <Select className="mt-1" name="day_of_week" required>
                          {WEEKDAYS.map((day) => (
                            <option key={day.value} value={day.value}>
                              {day.label}
                            </option>
                          ))}
                        </Select>
                      </label>
                      {group.modality === "sabatino" || group.modality === "virtual_modular" ? (
                        <label className="text-sm font-medium text-ink">
                          Módulo
                          <Select className="mt-1" name="module" required>
                            <option value="1">Módulo 1</option>
                            <option value="2">Módulo 2</option>
                          </Select>
                        </label>
                      ) : (
                        <input name="module" type="hidden" value="0" />
                      )}
                      <label className="text-sm font-medium text-ink">
                        Inicio
                        <Input className="mt-1" name="starts_at" required type="time" />
                      </label>
                      <label className="text-sm font-medium text-ink">
                        Fin
                        <Input className="mt-1" name="ends_at" required type="time" />
                      </label>
                      <Button type="submit" variant="secondary">
                        <CalendarPlus className="h-4 w-4" />
                        Agregar bloque
                      </Button>
                    </ActionStateForm>
                  </div>
                </div>
              </section>
            );
          })
        )}
      </section>
    </>
  );
}
