export const dynamic = "force-dynamic";
import { notFound } from "next/navigation";
import { CalendarPlus, CheckCircle2, CircleAlert, Inbox, LayoutGrid, PenLine, Send, Trash2 } from "lucide-react";
import {
  createCustomScheduleBlockStateAction,
  deleteAssignmentAction,
  deleteAssignmentFeedbackAction,
  setGroupArchivedAction,
  setGroupDraftAction,
  setGroupFinalAction,
  setGroupReviewAction,
  updateAssignmentAction,
  updateAssignmentFeedbackAction,
  updateGroupSubjectHoursAction,
  permanentDeleteGroupAction
} from "@/app/(dashboard)/actions";
import { SectionHeader } from "@/components/section-header";
import { AssignmentCard } from "@/components/grupos/assignment-card";
import { AuditEntryCardDetailed } from "@/components/grupos/audit-entry-card";
import { SubjectHoursCard } from "@/components/grupos/subject-hours-card";
import { Badge } from "@/components/ui/badge";
import { ActionStateForm } from "@/components/ui/action-state-form";
import { Button } from "@/components/ui/button";
import { ConfirmActionButton } from "@/components/ui/confirm-action-button";
import { DataTable } from "@/components/ui/data-table";
import { MetricCard } from "@/components/ui/metric-card";
import { AssignmentForm } from "@/components/forms/assignment-form";
import { Input } from "@/components/ui/input";
import { ResponsiveTable } from "@/components/ui/responsive-table";
import { Select } from "@/components/ui/select";
import { WEEKDAYS } from "@/lib/constants";
import { createClient } from "@/lib/supabase/server";
import { getGroupAuditHistory, type FormattedAuditLogEntry } from "@/lib/supabase/audit";
import { requireActiveProfileOrRedirect } from "@/lib/supabase/auth-helpers";
import { checkGroupSubjectHours } from "@/lib/supabase/queries";
import { isAdmin } from "@/lib/permissions";
import { isValidProfileCode } from "@/lib/profiles";

type GroupRow = {
  id: string;
  name: string;
  quarter: number;
  modality: string;
  shift: string;
  status: string;
  academic_cycles?: { code?: string | null } | null;
  careers?: { code?: string | null; name?: string | null } | null;
  classrooms?: { name?: string | null } | null;
  group_subjects?: Array<{
    id: string;
    hours_per_week: number | null;
    required_profile_code?: string | null;
    subjects?: {
      id: string;
      name: string;
      quarter: number | null;
      class_requirements?: Array<{ profile_code: string }>;
    } | null;
  }> | null;
};

export default async function GroupDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: group } = await supabase
    .from("groups")
    .select(
      "id, name, quarter, modality, shift, status, academic_cycles(code), careers(code, name), classrooms(name), group_subjects(id, hours_per_week, required_profile_code, subjects(id, name, quarter, class_requirements(profile_code)))"
    )
    .eq("id", id)
    .single<GroupRow>();

  if (!group) notFound();

  const profile = await requireActiveProfileOrRedirect();
  let blocksQuery = supabase
    .from("schedule_blocks")
    .select("id, label, starts_at, ends_at, day_of_week, is_custom, created_by, module, schedule_templates!inner(modality, shift)")
    .eq("schedule_templates.modality", group.modality)
    .eq("schedule_templates.shift", group.shift)
    .eq("active", true)
    .order("day_of_week")
    .order("module")
    .order("starts_at");

  if (!isAdmin(profile?.role_code) && profile?.id) {
    blocksQuery = blocksQuery.or(`is_custom.eq.false,created_by.eq.${profile.id}`);
  }

  const [
    { data: teachersData },
    { data: classroomsData },
    { data: blocksData },
    { data: assignmentsData }
  ] =
    await Promise.all([
      supabase
        .from("teachers")
        .select("id, name, max_hours, assigned_hours, teacher_available_profiles(profile_code)")
        .eq("active", true)
        .order("name"),
      supabase.from("classrooms").select("id, name").eq("active", true).order("name"),
      blocksQuery,
      supabase
        .from("assignments")
        .select("id, status, duration_hours, classrooms(id, name), teachers(name), schedule_blocks(id, label), group_subjects(id, subjects(name))")
        .in(
          "group_subject_id",
          (group.group_subjects ?? []).map((subject) => subject.id)
        )
        .eq("status", "active")
    ]);

  const [hoursStatus, groupHistory] = await Promise.all([
    checkGroupSubjectHours(group.id),
    getGroupAuditHistory(group.id)
  ]);

  const teachers = (teachersData ?? []) as Array<{
    id: string;
    name: string;
    max_hours: number | null;
    assigned_hours: number | null;
    teacher_available_profiles: Array<{ profile_code: string }> | null;
  }>;
  const classrooms = (classroomsData ?? []) as Array<{ id: string; name: string }>;
  const blocks = (blocksData ?? []) as Array<{
    id: string;
    label: string;
    starts_at: string;
    ends_at: string;
    day_of_week: number;
    is_custom: boolean | null;
    module: number | null;
  }>;
  const assignments = (assignmentsData ?? []) as Array<{
    id: string;
    status: string;
    duration_hours: number | null;
    classrooms: { id: string; name: string } | null;
    teachers: { name: string } | null;
    schedule_blocks: { id: string; label: string } | null;
    group_subjects: { id: string; subjects: { name: string } | null } | null;
  }>;

  const groupSubjects = (group.group_subjects ?? []).map((item) => {
    const requiredProfiles = item.required_profile_code && isValidProfileCode(item.required_profile_code)
      ? [item.required_profile_code]
      : (item.subjects?.class_requirements ?? [])
          .map((requirement) => requirement.profile_code)
          .filter(isValidProfileCode);
    return {
      id: item.id,
      label: `${item.subjects?.name} (${item.hours_per_week ?? 0} h)`,
      requiredProfiles,
      loadHours: Number(item.hours_per_week ?? 1.5)
    };
  });
  const completeSubjects = hoursStatus.filter((item) => item.status === "completa").length;
  const riskySubjects = hoursStatus.filter((item) => item.status === "incompleta" || item.status === "excedida").length;

  const subjectHours: Record<string, { total: number; assigned: number }> = {};
  for (const item of hoursStatus) {
    subjectHours[item.group_subject_id] = {
      total: item.hours_per_week,
      assigned: item.assigned_hours
    };
  }

  const assignmentItems = assignments.map((assignment) => ({
    id: assignment.id,
    group_id: group.id,
    schedule_block_id: assignment.schedule_blocks?.id ?? "",
    duration_hours: assignment.duration_hours ?? 0,
    subject_name: assignment.group_subjects?.subjects?.name ?? "Sin materia",
    teacher_name: assignment.teachers?.name ?? "Sin docente",
    block_label: assignment.schedule_blocks?.label ?? "Sin bloque",
    classroom_id: assignment.classrooms?.id ?? null,
    classroom_name: assignment.classrooms?.name ?? null
  }));

  const blockOptions = blocks.map((block) => ({ id: block.id, label: block.label }));
  const classroomOptions = classrooms.map((classroom) => ({ id: classroom.id, name: classroom.name }));
  const isGroupEditable = group.status === "draft" || group.status === "review" || group.status === "active";
  const usesScheduleModules = group.modality === "sabatino" || group.modality === "virtual_modular";

  return (
    <>
      <SectionHeader eyebrow="Grupo" title={group.name}>
        <div className="flex items-center gap-2">
          <Badge tone={group.status === "final" ? "success" : group.status === "archived" ? "neutral" : group.status === "review" ? "warning" : "info"}>
            {group.status === "draft" ? "Borrador" : group.status === "review" ? "Revisión" : group.status === "final" ? "Finalizado" : "Archivado"}
          </Badge>
          <Badge tone="info">
            {group.shift === "matutino" ? "MAT" : "VES"} {group.quarter}
          </Badge>
        </div>
      </SectionHeader>

      <section className="mb-5 grid gap-3 rounded-md border border-line bg-card p-4 text-sm shadow-subtle sm:grid-cols-2 md:grid-cols-4">
        <p><span className="font-semibold">Ciclo:</span> {group.academic_cycles?.code}</p>
        <p><span className="font-semibold">Carrera:</span> {group.careers?.code}</p>
        <p><span className="font-semibold">Modalidad:</span> {group.modality}</p>
        <p><span className="font-semibold">Aula:</span> {group.classrooms?.name ?? "Sin aula"}</p>
      </section>

      {!isGroupEditable ? (
        <section className="mb-5 rounded-md border border-line bg-panel p-4 text-sm text-muted shadow-subtle">
          Este grupo está en modo solo lectura. Las asignaciones, límites y bloques permanecen disponibles para consulta.
        </section>
      ) : null}

      <section className="mb-5 grid gap-3 sm:grid-cols-2 md:grid-cols-3">
        <MetricCard
          description="Materias con horas cubiertas"
          icon={CheckCircle2}
          label="Materias completas"
          tone={completeSubjects === groupSubjects.length && groupSubjects.length > 0 ? "success" : "warning"}
          value={`${completeSubjects}/${groupSubjects.length}`}
        />
        <MetricCard
          description="Clases activas asignadas"
          icon={CalendarPlus}
          label="Asignaciones"
          tone={assignmentItems.length > 0 ? "brand" : "neutral"}
          value={assignmentItems.length}
        />
        <MetricCard
          description="Materias incompletas o excedidas"
          icon={riskySubjects > 0 ? CircleAlert : LayoutGrid}
          label="Riesgo operativo"
          tone={riskySubjects > 0 ? "danger" : "success"}
          value={riskySubjects}
        />
      </section>

      <section className="mb-5 rounded-md border border-line bg-card p-4 shadow-subtle">
        <h2 className="mb-2 text-sm font-semibold text-ink">Límites por materia</h2>
        <ResponsiveTable
          cards={
            <ul className="grid gap-3 sm:grid-cols-2">
              {hoursStatus.map((item) => (
                <li key={item.group_subject_id}>
                  <SubjectHoursCard canEdit={isGroupEditable} groupId={group.id} item={item} />
                </li>
              ))}
            </ul>
          }
          table={
            <DataTable
              emptyLabel="No hay materias en este grupo."
              headers={
                isGroupEditable
                  ? ["Materia", "Límite", "Asignadas", "Estado", "Editar límite"]
                  : ["Materia", "Límite", "Asignadas", "Estado"]
              }
              rows={hoursStatus.map((item) => {
                const remaining = Number(item.hours_per_week) - Number(item.assigned_hours);
                const row = [
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
                     item.status === "incompleta" ? `Faltan ${remaining} h` : "Sin asignar"}
                  </Badge>
                ];

                if (!isGroupEditable) return row;

                return [
                  ...row,
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
      </section>

      <section className="mb-5 flex flex-wrap gap-2 rounded-md border border-line bg-card p-3 shadow-subtle">
        <span className="mr-2 self-center text-xs font-semibold uppercase text-muted">Estado:</span>
        {group.status === "draft" ? (
          <form action={setGroupReviewAction}>
            <input name="group_id" type="hidden" value={group.id} />
            <Button className="h-8 text-xs" type="submit" variant="secondary">
              <Send className="h-3 w-3" />
              Enviar a revisión
            </Button>
          </form>
        ) : null}
        {group.status === "review" ? (
          <>
            <form action={setGroupDraftAction}>
              <input name="group_id" type="hidden" value={group.id} />
              <Button className="h-8 text-xs" type="submit" variant="secondary">
                <PenLine className="h-3 w-3" />
                Volver a borrador
              </Button>
            </form>
            {isAdmin(profile?.role_code) ? (
              <form action={setGroupFinalAction}>
                <input name="group_id" type="hidden" value={group.id} />
                <Button className="h-8 text-xs" type="submit">
                  <CheckCircle2 className="h-3 w-3" />
                  Finalizar grupo
                </Button>
              </form>
            ) : null}
          </>
        ) : null}
        {group.status === "final" && isAdmin(profile?.role_code) ? (
          <form action={setGroupArchivedAction}>
            <input name="group_id" type="hidden" value={group.id} />
            <Button className="h-8 text-xs" type="submit" variant="secondary">
              <Inbox className="h-3 w-3" />
              Archivar grupo
            </Button>
          </form>
        ) : null}
        {isAdmin(profile?.role_code) && group.status === "draft" ? (
          <form action={permanentDeleteGroupAction}>
            <input name="group_id" type="hidden" value={group.id} />
            <ConfirmActionButton
              affectedName={group.name}
              className="h-8 text-xs"
              confirmLabel="Eliminar permanentemente"
              danger
              description="El grupo y todas sus asignaciones se eliminarán permanentemente. Esta acción no se puede deshacer."
              title="Eliminar grupo permanentemente"
            >
              <Trash2 className="h-3 w-3" />
              Eliminar permanentemente
            </ConfirmActionButton>
          </form>
        ) : null}
      </section>

      <section className="space-y-4">
        {isGroupEditable ? (
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-ink">Asignar docente</h2>
            <p className="text-sm text-muted">
              Selecciona la materia, el docente apto y el bloque visual del cuadro correspondiente.
            </p>
          </div>
          <ActionStateForm
            action={createCustomScheduleBlockStateAction}
            alertClassName="md:col-span-full"
            className={usesScheduleModules
              ? "grid gap-2 rounded-md border border-line bg-card p-3 shadow-subtle md:min-w-[620px] md:grid-cols-[140px_100px_120px_120px_auto]"
              : "grid gap-2 rounded-md border border-line bg-card p-3 shadow-subtle md:min-w-[520px] md:grid-cols-[150px_120px_120px_auto]"}
          >
            <input name="group_id" type="hidden" value={group.id} />
            <label className="text-xs font-semibold uppercase text-muted">
              Día
              <Select className="mt-1 h-9" name="day_of_week" required>
                {WEEKDAYS.map((day) => (
                  <option key={day.value} value={day.value}>
                    {day.label}
                  </option>
                ))}
              </Select>
            </label>
            {usesScheduleModules ? (
              <label className="text-xs font-semibold uppercase text-muted">
                Módulo
                <Select className="mt-1 h-9" name="module" required>
                  <option value="1">Módulo 1</option>
                  <option value="2">Módulo 2</option>
                </Select>
              </label>
            ) : (
              <input name="module" type="hidden" value="0" />
            )}
            <label className="text-xs font-semibold uppercase text-muted">
              Inicio
              <Input className="mt-1 h-9" name="starts_at" required type="time" />
            </label>
            <label className="text-xs font-semibold uppercase text-muted">
              Fin
              <Input className="mt-1 h-9" name="ends_at" required type="time" />
            </label>
            <div className="flex items-end">
              <Button className="h-9 w-full px-3" type="submit" variant="secondary">
                <CalendarPlus className="h-4 w-4" />
                Bloque
              </Button>
            </div>
          </ActionStateForm>
        </div>
        ) : null}

        {isGroupEditable ? (
        <div>
          <AssignmentForm
            assignments={assignments.map((assignment) => ({
              id: assignment.id,
              scheduleBlockId: assignment.schedule_blocks?.id ?? "",
              subjectName: assignment.group_subjects?.subjects?.name ?? null,
              teacherName: assignment.teachers?.name ?? null
            }))}
            blocks={blocks.map((block) => ({
              id: block.id,
              label: block.label,
              dayOfWeek: block.day_of_week,
              startsAt: block.starts_at,
              endsAt: block.ends_at,
              isCustom: block.is_custom ?? false,
              module: block.module ?? undefined
            }))}
            classrooms={classrooms.map((classroom) => ({ id: classroom.id, label: classroom.name }))}
            groupSubjects={groupSubjects}
            subjectHours={subjectHours}
            teachers={teachers.map((teacher) => ({
              id: teacher.id,
              label: `${teacher.name} · ${teacher.assigned_hours ?? 0}/${teacher.max_hours ?? 0} h`,
              profileCodes: (teacher.teacher_available_profiles ?? [])
                .map((tp) => tp.profile_code)
                .filter(isValidProfileCode)
            }))}
          />
        </div>
        ) : null}

        <div>
          <h2 className="mb-3 text-lg font-semibold text-ink">Asignaciones activas</h2>
          <ResponsiveTable
            cards={
              <ul className="grid gap-3 sm:grid-cols-2">
                {assignmentItems.map((item) => (
                  <li key={item.id}>
                    <AssignmentCard
                      blocks={blockOptions}
                      canEdit={isGroupEditable}
                      classrooms={classroomOptions}
                      hasHistory={groupHistory.some(
                        (entry) =>
                          entry.table_name === "assignments" && entry.record_id === item.id
                      )}
                      item={item}
                    />
                  </li>
                ))}
              </ul>
            }
            table={
              <DataTable
                headers={
                  isGroupEditable
                    ? ["Materia", "Docente", "Bloque", "Horas", "Cambiar", "Eliminar", "Historial"]
                    : ["Materia", "Docente", "Bloque", "Horas", "Historial"]
                }
                rows={assignmentItems.map((item) => {
                  const historyCell = (
                    <details className="min-w-64 text-sm" key="history">
                      <summary className="cursor-pointer font-medium text-brand">Ver historial</summary>
                      <div className="mt-2 space-y-2">
                        {groupHistory.filter((entry) => entry.table_name === "assignments" && entry.record_id === item.id).length === 0 ? (
                          <p className="text-muted">Sin eventos auditados.</p>
                        ) : (
                          groupHistory
                            .filter((entry) => entry.table_name === "assignments" && entry.record_id === item.id)
                            .map((entry) => (
                              <div className="rounded-md border border-line bg-card p-2" key={entry.id}>
                                <p className="font-medium text-ink">{entry.dateLabel}</p>
                                <p className="text-xs text-muted">{entry.actionLabel} - {entry.userLabel}</p>
                                <p className="mt-1 text-xs text-muted">{entry.summary}</p>
                              </div>
                            ))
                        )}
                      </div>
                    </details>
                  );
                  const baseRow = [
                    item.subject_name,
                    item.teacher_name,
                    item.block_label,
                    `${item.duration_hours ?? 0} h`
                  ];

                  if (!isGroupEditable) return [...baseRow, historyCell];

                  return [
                    ...baseRow,
                    <form
                      action={updateAssignmentAction}
                      className="grid min-w-[520px] gap-2 md:grid-cols-[1fr_110px_150px_auto]"
                      key="update"
                    >
                      <input name="assignment_id" type="hidden" value={item.id} />
                      <input name="group_id" type="hidden" value={group.id} />
                      <Select defaultValue={item.schedule_block_id} name="schedule_block_id" required>
                        {blockOptions.map((block) => (
                          <option key={block.id} value={block.id}>
                            {block.label}
                          </option>
                        ))}
                      </Select>
                      <Input
                        defaultValue={item.duration_hours || 1.5}
                        max={99}
                        min={0.5}
                        name="duration_hours"
                        required
                        step={0.5}
                        type="number"
                      />
                      <Select defaultValue={item.classroom_id ?? ""} name="classroom_id">
                        <option value="">Aula del grupo</option>
                        {classroomOptions.map((classroom) => (
                          <option key={classroom.id} value={classroom.id}>
                            {classroom.name}
                          </option>
                        ))}
                      </Select>
                      <ConfirmActionButton
                        action={updateAssignmentFeedbackAction}
                        affectedName={`${item.subject_name} - ${item.teacher_name}`}
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
                      <input name="assignment_id" type="hidden" value={item.id} />
                      <input name="group_id" type="hidden" value={group.id} />
                      <ConfirmActionButton
                        action={deleteAssignmentFeedbackAction}
                        affectedName={`${item.subject_name} - ${item.teacher_name}`}
                        className="h-10 px-3"
                        confirmLabel="Eliminar asignación"
                        danger
                        description="La asignación se eliminará y el docente liberará esas horas."
                        title="Eliminar asignación"
                      >
                        <Trash2 className="h-4 w-4" />
                        Eliminar
                      </ConfirmActionButton>
                    </form>,
                    historyCell
                  ];
                })}
              />
            }
          />
        </div>
      </section>

      <section className="mt-8">
        <h2 className="mb-3 text-lg font-semibold text-ink">Historial del grupo</h2>
        <ResponsiveTable
          cards={
            <ul className="grid gap-3 sm:grid-cols-2">
              {groupHistory.map((entry) => (
                <li key={entry.id}>
                  <AuditEntryCardDetailed
                    entry={entry as FormattedAuditLogEntry}
                    newValue={entry.new_value}
                    oldValue={entry.old_value}
                  />
                </li>
              ))}
            </ul>
          }
          table={
            <DataTable
              emptyDescription="Los cambios sensibles aparecerán aquí cuando existan eventos de auditoría relacionados con el grupo."
              emptyLabel="Todavía no hay eventos auditados para este grupo."
              headers={["Fecha", "Usuario", "Acción", "Tabla", "Resumen", "Valores"]}
              rows={groupHistory.map((entry: FormattedAuditLogEntry) => [
                entry.dateLabel,
                entry.userLabel,
                entry.actionLabel,
                entry.table_name,
                entry.summary,
                <details className="min-w-80" key={entry.id}>
                  <summary className="cursor-pointer text-sm font-medium text-brand">Ver valores</summary>
                  <div className="mt-2 grid gap-2">
                    <div>
                      <p className="mb-1 text-xs font-semibold uppercase text-muted">Anterior</p>
                      {auditDetails(entry.old_value)}
                    </div>
                    <div>
                      <p className="mb-1 text-xs font-semibold uppercase text-muted">Nuevo</p>
                      {auditDetails(entry.new_value)}
                    </div>
                  </div>
                </details>
              ])}
            />
          }
        />
      </section>
    </>
  );
}

function auditDetails(value: Record<string, unknown> | null) {
  if (!value) return <span className="text-muted-foreground">Sin datos</span>;
  return (
    <pre className="max-h-48 overflow-auto rounded-md bg-ink p-3 text-xs text-primary-foreground">
      {JSON.stringify(value, null, 2)}
    </pre>
  );
}
