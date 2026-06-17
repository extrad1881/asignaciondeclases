export const dynamic = "force-dynamic";
import { notFound } from "next/navigation";
import { CalendarPlus, CheckCircle2, CircleAlert, Inbox, LayoutGrid, PenLine, Save, Send, Trash2 } from "lucide-react";
import {
  createCustomScheduleBlockStateAction,
  deleteAssignmentAction,
  deleteAssignmentFeedbackAction,
  setGroupArchivedAction,
  setGroupDraftAction,
  setGroupFinalAction,
  setGroupReviewAction,
  updateAssignmentAction,
  updateAssignmentFeedbackAction
} from "@/app/(dashboard)/actions";
import { SectionHeader } from "@/components/section-header";
import { Badge } from "@/components/ui/badge";
import { ActionStateForm } from "@/components/ui/action-state-form";
import { Button } from "@/components/ui/button";
import { ConfirmActionButton } from "@/components/ui/confirm-action-button";
import { DataTable } from "@/components/ui/data-table";
import { MetricCard } from "@/components/ui/metric-card";
import { AssignmentForm } from "@/components/forms/assignment-form";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { WEEKDAYS } from "@/lib/constants";
import { createClient } from "@/lib/supabase/server";
import { getGroupAuditHistory } from "@/lib/supabase/audit";
import { requireActiveProfileOrRedirect } from "@/lib/supabase/auth-helpers";
import { checkGroupSubjectHours } from "@/lib/supabase/queries";
import { isAdmin } from "@/lib/permissions";
import { isValidProfileCode } from "@/lib/profiles";


export default async function GroupDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: group } = await supabase
    .from("groups")
    .select(
      "id, name, quarter, modality, shift, status, academic_cycles(code), careers(code, name), classrooms(name), group_subjects(id, hours_per_week, required_profile_code, subjects(id, name, quarter, class_requirements(profile_code)))"
    ) 
    .eq("id", id)
    .single();

  if (!group) notFound();

  const profile = await requireActiveProfileOrRedirect();
  let blocksQuery = supabase
    .from("schedule_blocks")
    .select("id, label, starts_at, ends_at, day_of_week, is_custom, created_by, module, schedule_templates!inner(modality, shift)")
    .eq("schedule_templates.modality", (group as any).modality)
    .eq("schedule_templates.shift", (group as any).shift)
    .eq("active", true)
    .order("day_of_week")
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
          ((group as any).group_subjects ?? []).map((subject: any) => subject.id)
        )
        .eq("status", "active")
    ]);

  const teachers = (teachersData ?? []) as any[];
  const classrooms = (classroomsData ?? []) as any[];
  const blocks = (blocksData ?? []) as any[];
  const assignments = (assignmentsData ?? []) as any[];

  const groupSubjects = ((group as any).group_subjects ?? []).map((item: any) => {
    const requiredProfiles = item.required_profile_code && isValidProfileCode(item.required_profile_code)
      ? [item.required_profile_code]
      : ((item.subjects?.class_requirements ?? []) as any[])
          .map((requirement) => requirement.profile_code)
          .filter(isValidProfileCode);
    return {
      id: item.id,
      label: `${item.subjects?.name} (${item.hours_per_week ?? 0} h)`,
      requiredProfiles,
      loadHours: Number(item.hours_per_week ?? 1.5)
    };
  });
  const hoursStatus = await checkGroupSubjectHours((group as any).id);
  const completeSubjects = hoursStatus.filter((item) => item.status === "completa").length;
  const riskySubjects = hoursStatus.filter((item) => item.status === "incompleta" || item.status === "excedida").length;
  const groupHistory = await getGroupAuditHistory((group as any).id);

  function auditDetails(value: Record<string, unknown> | null) {
    if (!value) return <span className="text-muted-foreground">Sin datos</span>;
    return (
      <pre className="max-h-48 overflow-auto rounded-md bg-ink p-3 text-xs text-primary-foreground">
        {JSON.stringify(value, null, 2)}
      </pre>
    );
  }

  return (
    <>
      <SectionHeader eyebrow="Grupo" title={(group as any).name}>
        <div className="flex items-center gap-2">
          <Badge tone={(group as any).status === "final" ? "success" : (group as any).status === "archived" ? "neutral" : (group as any).status === "review" ? "warning" : "info"}>
            {(group as any).status === "draft" ? "Borrador" : (group as any).status === "review" ? "Revisión" : (group as any).status === "final" ? "Finalizado" : "Archivado"}
          </Badge>
          <Badge tone="info">
            {(group as any).shift === "matutino" ? "MAT" : "VES"} {(group as any).quarter}
          </Badge>
        </div>
      </SectionHeader>

      <section className="mb-5 grid gap-3 rounded-md border border-line bg-card p-4 text-sm shadow-subtle md:grid-cols-4">
        <p><span className="font-semibold">Ciclo:</span> {(group as any).academic_cycles?.code}</p>
        <p><span className="font-semibold">Carrera:</span> {(group as any).careers?.code}</p>
        <p><span className="font-semibold">Modalidad:</span> {(group as any).modality}</p>
        <p><span className="font-semibold">Aula:</span> {(group as any).classrooms?.name ?? "Sin aula"}</p>
      </section>

      <section className="mb-5 grid gap-3 md:grid-cols-3">
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
          tone={(assignments ?? []).length > 0 ? "brand" : "neutral"}
          value={(assignments ?? []).length}
        />
        <MetricCard
          description="Materias incompletas o excedidas"
          icon={riskySubjects > 0 ? CircleAlert : LayoutGrid}
          label="Riesgo operativo"
          tone={riskySubjects > 0 ? "danger" : "success"}
          value={riskySubjects}
        />
      </section>

      <section className="mb-5 flex flex-wrap gap-2 rounded-md border border-line bg-card p-3 shadow-subtle">
        <span className="mr-2 self-center text-xs font-semibold uppercase text-muted">Estado:</span>
        {(group as any).status === "draft" ? (
          <form action={setGroupReviewAction}>
            <input name="group_id" type="hidden" value={(group as any).id} />
            <Button className="h-8 text-xs" type="submit" variant="secondary">
              <Send className="h-3 w-3" />
              Enviar a revisión
            </Button>
          </form>
        ) : null}
        {(group as any).status === "review" ? (
          <>
            <form action={setGroupDraftAction}>
              <input name="group_id" type="hidden" value={(group as any).id} />
              <Button className="h-8 text-xs" type="submit" variant="secondary">
                <PenLine className="h-3 w-3" />
                Volver a borrador
              </Button>
            </form>
            <form action={setGroupFinalAction}>
              <input name="group_id" type="hidden" value={(group as any).id} />
              <Button className="h-8 text-xs" type="submit">
                <CheckCircle2 className="h-3 w-3" />
                Finalizar grupo
              </Button>
            </form>
          </>
        ) : null}
        {(group as any).status === "final" ? (
          <form action={setGroupArchivedAction}>
            <input name="group_id" type="hidden" value={(group as any).id} />
            <Button className="h-8 text-xs" type="submit" variant="secondary">
              <Inbox className="h-3 w-3" />
              Archivar grupo
            </Button>
          </form>
        ) : null}
      </section>

      <section className="space-y-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-ink">Asignar docente</h2>
            <p className="text-sm text-muted">
              Selecciona la materia, el docente apto y el bloque visual del cuadro correspondiente.
            </p>
          </div>
          <ActionStateForm action={createCustomScheduleBlockStateAction} className="grid gap-2 rounded-md border border-line bg-card p-3 shadow-subtle md:min-w-[520px] md:grid-cols-[150px_120px_120px_auto]" alertClassName="md:col-span-full">
            <input name="group_id" type="hidden" value={(group as any).id} />
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

        <div>
            <AssignmentForm
              blocks={(blocks as any[]).map((block) => ({
                id: block.id,
                label: block.label,
                dayOfWeek: block.day_of_week,
                startsAt: block.starts_at,
                endsAt: block.ends_at,
                isCustom: block.is_custom,
                module: block.module
              }))}
              classrooms={(classrooms as any[]).map((classroom) => ({
                id: classroom.id,
                label: classroom.name
              }))}
              assignments={(assignments as any[]).map((assignment) => ({
                id: assignment.id,
                scheduleBlockId: assignment.schedule_blocks?.id,
                subjectName: assignment.group_subjects?.subjects?.name,
                teacherName: assignment.teachers?.name
              }))}
              groupSubjects={groupSubjects}
              teachers={(teachers as any[]).map((teacher) => ({
                id: teacher.id,
                label: `${teacher.name} Â· ${teacher.assigned_hours ?? 0}/${teacher.max_hours ?? 0} h`,
                profileCodes: ((teacher.teacher_available_profiles ?? []) as any[])
                  .map((teacherProfile) => teacherProfile.profile_code)
                  .filter(isValidProfileCode)
              }))}
            />
        </div>

        <div>
          <h2 className="mb-3 text-lg font-semibold text-ink">Asignaciones activas</h2>
          <DataTable
            headers={["Materia", "Docente", "Bloque", "Horas", "Cambiar", "Eliminar", "Historial"]}
            rows={(assignments as any[]).map((assignment) => [
              assignment.group_subjects?.subjects?.name,
              assignment.teachers?.name,
              assignment.schedule_blocks?.label,
              `${assignment.duration_hours ?? 0} h`,
              <form action={updateAssignmentAction} className="grid min-w-[520px] gap-2 md:grid-cols-[1fr_110px_150px_auto]" key="update">
                <input name="assignment_id" type="hidden" value={assignment.id} />
                <input name="group_id" type="hidden" value={(group as any).id} />
                <Select defaultValue={assignment.schedule_blocks?.id ?? ""} name="schedule_block_id" required>
                  {(blocks as any[]).map((block) => (
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
                  {(classrooms as any[]).map((classroom) => (
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
                  <Save className="h-4 w-4" />
                  Guardar
                </ConfirmActionButton>
              </form>,
              <form action={deleteAssignmentAction} key="delete">
                <input name="assignment_id" type="hidden" value={assignment.id} />
                <input name="group_id" type="hidden" value={(group as any).id} />
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
              </form>,
              <details className="min-w-64 text-sm" key="history">
                <summary className="cursor-pointer font-medium text-brand">Ver historial</summary>
                <div className="mt-2 space-y-2">
                  {groupHistory.filter((entry) => entry.table_name === "assignments" && entry.record_id === assignment.id).length === 0 ? (
                    <p className="text-muted">Sin eventos auditados.</p>
                  ) : (
                    groupHistory
                      .filter((entry) => entry.table_name === "assignments" && entry.record_id === assignment.id)
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
            ])}
          />
        </div>
      </section>

      <section className="mt-8">
        <h2 className="mb-3 text-lg font-semibold text-ink">Historial del grupo</h2>
        <DataTable
          emptyLabel="Todavía no hay eventos auditados para este grupo."
          emptyDescription="Los cambios sensibles aparecerán aquí cuando existan eventos de auditoría relacionados con el grupo."
          headers={["Fecha", "Usuario", "Acción", "Tabla", "Resumen", "Valores"]}
          rows={groupHistory.map((entry) => [
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
      </section>
    </>
  );
}

